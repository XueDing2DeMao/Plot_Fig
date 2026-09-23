// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { defaultTemplate } from '../state/default-template.js';
import type { PropertyObjectRef } from '../state/property-objects.js';
import type { PropertyObjectSettings } from '../state/property-object-settings.js';
import { useFigurePropertyDraft } from './use-figure-property-draft.js';

afterEach(cleanup);
type Hook = { current: ReturnType<typeof useFigurePropertyDraft> };
const x = { kind: 'axis', panelId: 'panel-main', axisId: 'axis-x' } as const;
const y = { kind: 'axis', panelId: 'panel-main', axisId: 'axis-y' } as const;
const curve = {
  kind: 'plot',
  panelId: 'panel-main',
  plotSlotId: 'series-1',
} as const;
function select(result: Hook, ref: PropertyObjectRef) {
  act(() => result.current.select(ref));
}
function change(
  result: Hook,
  edit: (value: PropertyObjectSettings) => void,
  number?: { label: string; text: string; path: string[] },
) {
  const value = structuredClone(result.current.value);
  edit(value);
  act(() => {
    if (number)
      result.current.setNumberText(number.label, number.text, number.path);
    result.current.change(value);
  });
}

it('clears same-value numeric text after orientation resets its explicit field path', () => {
  const template = chartTemplate('bar');
  template.panels[0]!.axes[1]!.minorTicks.count = 12;
  const { result } = renderHook(() => useFigurePropertyDraft(template));
  select(result, y);
  change(result, () => {}, {
    label: 'Y 轴次刻度数量',
    text: '12.',
    path: ['details', 'minorTicks', 'count'],
  });
  change(result, () => {}, {
    label: 'Y 轴标题字号',
    text: '12.',
    path: ['details', 'titleFont', 'sizePt'],
  });
  expect(result.current.numberTexts['Y 轴次刻度数量']).toBe('12.');
  select(result, curve);
  for (const orientation of ['horizontal', 'vertical'] as const)
    change(result, (value) => {
      if (value.kind !== 'plot' || value.settings.plot.kind !== 'bar')
        throw new Error('expected bar');
      value.settings.plot.orientation = orientation;
    });
  select(result, y);
  expect(result.current.value).toMatchObject({
    details: { minorTicks: { count: 0 } },
  });
  expect(result.current.numberTexts).toEqual({ 'Y 轴标题字号': '12.' });
  expect(result.current.errors).toEqual([]);
});

it.each([false, true])(
  'clears replaced histogram bin text and preserves unrelated drafts (invalid sibling: %s)',
  (invalidSibling) => {
    const template = chartTemplate('histogram');
    const plot = template.panels[0]!.plotSlots[0]!;
    if (plot.kind !== 'histogram') throw new Error('expected histogram');
    plot.bins = { mode: 'count', count: 10 };
    const { result } = renderHook(() => useFigurePropertyDraft(template));
    select(result, curve);
    change(
      result,
      (value) => {
        if (value.kind !== 'plot' || value.settings.plot.kind !== 'histogram')
          throw new Error('expected histogram');
        value.settings.plot.bins = { mode: 'count', count: NaN };
      },
      {
        label: '箱数',
        text: '1e-',
        path: ['settings', 'plot', 'bins', 'count'],
      },
    );
    if (invalidSibling)
      change(
        result,
        (value) => {
          if (value.kind !== 'plot' || value.settings.plot.kind !== 'histogram')
            throw new Error('expected histogram');
          value.settings.plot.fillStyle.opacity = NaN;
        },
        {
          label: '填充透明度',
          text: '-',
          path: ['settings', 'plot', 'fillStyle', 'opacity'],
        },
      );
    change(result, (value) => {
      if (value.kind !== 'plot' || value.settings.plot.kind !== 'histogram')
        throw new Error('expected histogram');
      value.settings.plot.bins = { mode: 'auto' };
    });
    expect(result.current.numberTexts).not.toHaveProperty('箱数');
    expect(result.current.errors).toHaveLength(invalidSibling ? 1 : 0);
    change(result, (value) => {
      if (value.kind !== 'plot' || value.settings.plot.kind !== 'histogram')
        throw new Error('expected histogram');
      value.settings.plot.bins = { mode: 'count', count: 10 };
    });
    expect(result.current.value).toMatchObject({
      settings: { plot: { bins: { mode: 'count', count: 10 } } },
    });
    expect(result.current.numberTexts).toEqual(
      invalidSibling ? { 填充透明度: '-' } : {},
    );
  },
);

it('explicitly resets an already-automatic shared range while retaining unrelated style and axis errors', () => {
  const template = defaultTemplate();
  const peer = structuredClone(template.panels[0]!);
  peer.panelId = 'peer';
  peer.plotSlots = [];
  peer.axes.forEach((axis) => (axis.axisId += '-peer'));
  template.panels.push(peer);
  template.sharedAxisGroups = [
    {
      groupId: 'x-group',
      members: [
        { panelId: 'panel-main', axisId: 'axis-x' },
        { panelId: 'peer', axisId: 'axis-x-peer' },
      ],
    },
  ];
  const peerX = {
    kind: 'axis',
    panelId: 'peer',
    axisId: 'axis-x-peer',
  } as const;
  const { result } = renderHook(() => useFigurePropertyDraft(template));
  select(result, peerX);
  change(
    result,
    (value) => {
      if (value.kind !== 'axis') throw new Error('expected axis');
      value.range.min = '-';
      value.details.scale = 'log10';
      value.details.line.widthPt = NaN;
    },
    { label: '轴线宽度', text: '-', path: ['details', 'line', 'widthPt'] },
  );
  select(result, y);
  change(result, (value) => {
    if (value.kind !== 'axis') throw new Error('expected axis');
    value.range.min = '1e-';
  });
  select(result, x);
  act(() => result.current.resetAxisRange());
  expect(result.current.template.panels[0]!.axes[0]!.range).toEqual({
    mode: 'auto',
  });
  select(result, peerX);
  expect(result.current.value).toMatchObject({
    range: { min: '', max: '' },
    details: { scale: 'linear', line: { widthPt: NaN } },
  });
  expect(result.current.numberTexts).toEqual({ 轴线宽度: '-' });
  expect(result.current.errors.map((error) => error.ref)).toEqual(
    expect.arrayContaining([peerX, y]),
  );
  change(
    result,
    (value) => {
      if (value.kind !== 'axis') throw new Error('expected axis');
      value.details.line.widthPt = 2;
    },
    { label: '轴线宽度', text: '2', path: ['details', 'line', 'widthPt'] },
  );
  expect(result.current.errors.map((error) => error.ref)).toEqual([y]);
});
