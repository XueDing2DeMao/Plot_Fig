// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { defaultTemplate } from '../state/default-template.js';
import type { PropertyObjectRef } from '../state/property-objects.js';
import type { PropertyObjectSettings } from '../state/property-object-settings.js';
import { useFigurePropertyDraft } from './use-figure-property-draft.js';

afterEach(cleanup);

const x = { kind: 'axis', panelId: 'panel-main', axisId: 'axis-x' } as const;
const y = { kind: 'axis', panelId: 'panel-main', axisId: 'axis-y' } as const;
const page = { kind: 'page' } as const;
const curve = {
  kind: 'plot',
  panelId: 'panel-main',
  plotSlotId: 'series-1',
} as const;
type Hook = { current: ReturnType<typeof useFigurePropertyDraft> };

function select(result: Hook, ref: PropertyObjectRef) {
  act(() => result.current.select(ref));
}
function change(result: Hook, edit: (value: PropertyObjectSettings) => void) {
  const value = structuredClone(result.current.value);
  edit(value);
  act(() => result.current.change(value));
}
function range(result: Hook, values: { min?: string; max?: string }) {
  change(result, (value) => {
    if (value.kind !== 'axis') throw new Error('expected axis');
    Object.assign(value.range, values);
  });
}
function width(result: Hook, text: string, number: number) {
  const value = structuredClone(result.current.value);
  if (value.kind !== 'page') throw new Error('expected page');
  value.page.size.width.value = number;
  act(() => {
    result.current.setNumberText('图页宽度', text);
    result.current.change(value);
  });
}
function sharedTemplate() {
  const template = defaultTemplate();
  const peer = structuredClone(template.panels[0]!);
  peer.panelId = 'peer';
  peer.plotSlots = [];
  peer.axes.forEach((axis) => (axis.axisId += '-peer'));
  template.panels.push(peer);
  template.sharedAxisGroups = [
    {
      groupId: 'shared-x',
      members: [
        { panelId: 'panel-main', axisId: 'axis-x' },
        { panelId: 'peer', axisId: 'axis-x-peer' },
      ],
    },
  ];
  return template;
}
const peerX = { kind: 'axis', panelId: 'peer', axisId: 'axis-x-peer' } as const;

it.each(['-', '0.', '1e-'])(
  'preserves range text %s across object switches and keeps the last valid template',
  (text) => {
    const template = defaultTemplate();
    template.panels[0]!.axes[0]!.range = { mode: 'fixed', min: -1, max: 1 };
    const { result } = renderHook(() => useFigurePropertyDraft(template));
    select(result, x);
    range(result, { min: text });
    select(result, y);
    select(result, x);
    expect(result.current.value).toMatchObject({
      range: { min: text, max: '1' },
    });
    expect(result.current.template.panels[0]!.axes[0]!.range).toEqual({
      mode: 'fixed',
      min: text === '0.' ? 0 : -1,
      max: 1,
    });
    expect(result.current.errors).toHaveLength(text === '0.' ? 0 : 1);
  },
);

it('validates both range fields together when entering automatic and replacing fixed bounds', () => {
  const { result } = renderHook(() =>
    useFigurePropertyDraft(defaultTemplate()),
  );
  select(result, x);
  range(result, { min: '0.' });
  expect(result.current.errors).toHaveLength(1);
  expect(result.current.template.panels[0]!.axes[0]!.range).toEqual({
    mode: 'auto',
  });
  range(result, { max: '1' });
  expect(result.current.errors).toEqual([]);
  range(result, { min: '2' });
  expect(result.current.errors).toHaveLength(1);
  expect(result.current.template.panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: 0,
    max: 1,
  });
  range(result, { max: '3' });
  expect(result.current.errors).toEqual([]);
  expect(result.current.template.panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: 2,
    max: 3,
  });
  range(result, { min: '', max: '' });
  expect(result.current.template.panels[0]!.axes[0]!.range).toEqual({
    mode: 'auto',
  });
});

it('retains batched numeric intermediate text and errors belonging to unselected objects', () => {
  const template = defaultTemplate();
  const { result } = renderHook(() => useFigurePropertyDraft(template));
  select(result, page);
  width(result, '1e-', NaN);
  expect(result.current.numberTexts).toEqual({ 图页宽度: '1e-' });
  expect(result.current.template.page).toEqual(template.page);
  select(result, x);
  range(result, { min: '-' });
  expect(result.current.errors.map((error) => error.ref)).toEqual(
    expect.arrayContaining([page, x]),
  );
  select(result, page);
  expect(result.current.numberTexts).toEqual({ 图页宽度: '1e-' });
  expect(result.current.value).toMatchObject({
    page: { size: { width: { value: NaN } } },
  });
  width(result, '100.', 100);
  expect(result.current.template.page.size.width.value).toBe(100);
  expect(result.current.numberTexts).toEqual({ 图页宽度: '100.' });
  expect(result.current.errors.map((error) => error.ref)).toEqual([x]);
});

it('uses current valid values for untouched fields after pending and applied curve edits', () => {
  const { result } = renderHook(() =>
    useFigurePropertyDraft(defaultTemplate()),
  );
  select(result, curve);
  change(result, (value) => {
    if (value.kind !== 'plot') throw new Error('expected plot');
    value.settings.line.widthPt = NaN;
    value.settings.line.color = '#ff0000';
  });
  select(result, page);
  width(result, '200', 200);
  select(result, x);
  range(result, { min: '-2', max: '2' });
  select(result, curve);
  change(result, (value) => {
    if (value.kind !== 'plot') throw new Error('expected plot');
    value.settings.line.widthPt = 2;
  });
  expect(result.current.errors).toEqual([]);
  expect(result.current.template.page.size.width.value).toBe(200);
  expect(result.current.template.panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: -2,
    max: 2,
  });
  expect(result.current.template.panels[0]!.plotSlots[0]).toMatchObject({
    lineStyle: { widthPt: 2, color: '#ff0000' },
  });
});

it('clears linked range drafts and applies now-valid unrelated patches against the latest axis', () => {
  const { result } = renderHook(() => useFigurePropertyDraft(sharedTemplate()));
  select(result, peerX);
  range(result, { min: '-' });
  change(result, (value) => {
    if (value.kind !== 'axis') throw new Error('expected axis');
    value.details.line.color = '#ff0000';
  });
  select(result, x);
  range(result, { min: '2', max: '3' });
  select(result, peerX);
  expect(result.current.errors).toEqual([]);
  expect(result.current.value).toMatchObject({
    range: { min: '2', max: '3' },
    details: { line: { color: '#ff0000' } },
  });
  expect(result.current.template.panels[1]!.axes[0]).toMatchObject({
    range: { mode: 'fixed', min: 2, max: 3 },
    line: { color: '#ff0000' },
  });
  change(result, (value) => {
    if (value.kind !== 'axis') throw new Error('expected axis');
    value.details.line.widthPt = 2;
  });
  expect(result.current.template.panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: 2,
    max: 3,
  });
});

it('keeps an unrelated invalid range draft when only shared reverse changes', () => {
  const { result } = renderHook(() => useFigurePropertyDraft(sharedTemplate()));
  select(result, peerX);
  range(result, { min: '-' });
  select(result, x);
  change(result, (value) => {
    if (value.kind !== 'axis') throw new Error('expected axis');
    value.details.reverse = true;
  });
  select(result, peerX);
  expect(result.current.value).toMatchObject({
    range: { min: '-' },
    details: { reverse: true },
  });
  expect(result.current.errors.map((error) => error.ref)).toEqual([peerX]);
});

it('does not replay a pending peer scale after a shared range change resolves its invalid range', () => {
  const { result } = renderHook(() => useFigurePropertyDraft(sharedTemplate()));
  select(result, peerX);
  range(result, { min: '-' });
  change(result, (value) => {
    if (value.kind !== 'axis') throw new Error('expected axis');
    value.details.scale = 'log10';
  });
  select(result, x);
  range(result, { min: '1', max: '100' });
  select(result, peerX);
  expect(result.current.errors).toEqual([]);
  expect(result.current.value).toMatchObject({
    details: { scale: 'linear' },
    range: { min: '1', max: '100' },
  });
  expect(result.current.template.panels[0]!.axes[0]!.scale).toBe('linear');
});

it('does not retain an applied curve palette after another curve changes the shared palette', () => {
  const template = defaultTemplate();
  const second = structuredClone(template.panels[0]!.plotSlots[0]!);
  second.plotSlotId = 'second';
  template.panels[0]!.plotSlots.push(second);
  const { result } = renderHook(() => useFigurePropertyDraft(template));
  select(result, curve);
  change(result, (value) => {
    if (value.kind !== 'plot') throw new Error('expected plot');
    value.settings.palette = ['#ff0000'];
  });
  select(result, { ...curve, plotSlotId: 'second' });
  change(result, (value) => {
    if (value.kind !== 'plot') throw new Error('expected plot');
    value.settings.palette = ['#00ff00'];
  });
  select(result, curve);
  expect(result.current.value).toMatchObject({
    settings: { palette: ['#00ff00'] },
  });
  change(result, (value) => {
    if (value.kind !== 'plot') throw new Error('expected plot');
    value.settings.line.widthPt = 2;
  });
  expect(result.current.template.theme.palette).toEqual(['#00ff00']);
});

it('clears affected range, scale and minor-count drafts when bar orientation resets axes', () => {
  const template = chartTemplate('bar');
  const { result } = renderHook(() => useFigurePropertyDraft(template));
  select(result, y);
  range(result, { min: '-' });
  const value = structuredClone(result.current.value);
  if (value.kind !== 'axis') throw new Error('expected axis');
  value.details.minorTicks.count = NaN;
  act(() => {
    result.current.setNumberText('次刻度数量', '1e-');
    result.current.change(value);
  });
  select(result, curve);
  change(result, (settings) => {
    if (settings.kind !== 'plot' || settings.settings.plot.kind !== 'bar')
      throw new Error('expected bar');
    settings.settings.plot.orientation = 'horizontal';
  });
  select(result, y);
  expect(result.current.errors).toEqual([]);
  expect(result.current.numberTexts).toEqual({});
  expect(result.current.value).toMatchObject({
    range: { min: '', max: '' },
    details: { scale: 'category', minorTicks: { count: 0, visible: false } },
  });
});

it('preserves draft lifetime and raw numeric text when Apply rerenders with the valid template', () => {
  const { result, rerender } = renderHook(
    ({ template }) => useFigurePropertyDraft(template),
    {
      initialProps: { template: defaultTemplate() },
    },
  );
  select(result, page);
  width(result, '150.', 150);
  select(result, x);
  range(result, { min: '-' });
  rerender({ template: structuredClone(result.current.template) });
  expect(result.current.selection).toEqual(x);
  expect(result.current.value).toMatchObject({ range: { min: '-' } });
  expect(result.current.errors).toHaveLength(1);
  select(result, page);
  expect(result.current.numberTexts).toEqual({ 图页宽度: '150.' });
  expect(result.current.template.page.size.width.value).toBe(150);
});
