// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { defaultTemplate } from '../state/default-template.js';
import type { PropertyObjectSettings } from '../state/property-object-settings.js';
import type { PropertyObjectRef } from '../state/property-objects.js';
import { useFigurePropertyDraft } from './use-figure-property-draft.js';

afterEach(cleanup);
const x = { kind: 'axis', panelId: 'panel-main', axisId: 'axis-x' } as const;
const y = { kind: 'axis', panelId: 'panel-main', axisId: 'axis-y' } as const;
const curve = {
  kind: 'plot',
  panelId: 'panel-main',
  plotSlotId: 'series-1',
} as const;
type Hook = { current: ReturnType<typeof useFigurePropertyDraft> };
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

it('switches automatic minor length out of an invalid hidden draft while preserving the last valid manual length', () => {
  const template = defaultTemplate();
  const manualLength = template.panels[0]!.axes[0]!.minorTicks.lengthPt;
  const { result } = renderHook(() => useFigurePropertyDraft(template));
  select(result, x);
  change(
    result,
    (v) => {
      if (v.kind === 'axis') v.details.minorTicks.lengthPt = NaN;
    },
    {
      label: '次刻度长度',
      text: '1e-',
      path: ['details', 'minorTicks', 'lengthPt'],
    },
  );
  expect(result.current.errors).toHaveLength(1);
  change(result, (v) => {
    if (v.kind === 'axis') v.details.minorTicks.lengthMode = 'auto';
  });
  expect(result.current.errors).toEqual([]);
  expect(result.current.numberTexts).not.toHaveProperty('次刻度长度');
  expect(result.current.template.panels[0]!.axes[0]!.minorTicks).toMatchObject({
    lengthMode: 'auto',
    lengthPt: manualLength,
  });
  change(result, (v) => {
    if (v.kind === 'axis') v.details.minorTicks.lengthMode = 'manual';
  });
  expect(result.current.value).toMatchObject({
    details: { minorTicks: { lengthMode: 'manual', lengthPt: manualLength } },
  });
});

it('clears raw crossing value when changing target axis even if its numeric value stays equal', () => {
  const template = defaultTemplate();
  Object.assign(template.panels[0]!.axes[0]!, {
    placement: { mode: 'cross', axisId: 'axis-y', value: 1 },
  });
  const { result } = renderHook(() => useFigurePropertyDraft(template));
  select(result, x);
  change(result, () => {}, {
    label: '交点',
    text: '1.',
    path: ['details', 'placement', 'value'],
  });
  expect(result.current.numberTexts['交点']).toBe('1.');
  change(result, (v) => {
    if (v.kind === 'axis' && v.details.placement?.mode === 'cross')
      v.details.placement.axisId = 'frame-y';
  });
  expect(result.current.numberTexts).not.toHaveProperty('交点');
  expect(result.current.errors).toEqual([]);
  expect(result.current.value).toMatchObject({
    details: { placement: { mode: 'cross', axisId: 'frame-y', value: 1 } },
  });
});

it('retains a valid pending manual length through automatic mode while another field is invalid', () => {
  const { result } = renderHook(() =>
    useFigurePropertyDraft(defaultTemplate()),
  );
  select(result, x);
  change(
    result,
    (value) => {
      if (value.kind === 'axis') value.details.tickLabels.rotation = NaN;
    },
    {
      label: '标签旋转',
      text: '-',
      path: ['details', 'tickLabels', 'rotation'],
    },
  );
  change(
    result,
    (value) => {
      if (value.kind === 'axis') value.details.minorTicks.lengthPt = 7.5;
    },
    {
      label: '次刻度长度',
      text: '7.50',
      path: ['details', 'minorTicks', 'lengthPt'],
    },
  );
  for (const lengthMode of ['auto', 'manual'] as const) {
    change(result, (value) => {
      if (value.kind === 'axis')
        value.details.minorTicks.lengthMode = lengthMode;
    });
    expect(result.current.value).toMatchObject({
      details: { minorTicks: { lengthMode, lengthPt: 7.5 } },
    });
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.numberTexts['次刻度长度']).toBe('7.50');
  }
  change(result, (value) => {
    if (value.kind === 'axis') value.details.tickLabels.rotation = -15;
  });
  expect(result.current.errors).toEqual([]);
  expect(result.current.template.panels[0]!.axes[0]!.minorTicks).toMatchObject({
    lengthMode: 'manual',
    lengthPt: 7.5,
  });
});

it('switches a cross placement with an invalid value to frame while retaining unrelated invalid label text', () => {
  const template = defaultTemplate();
  Object.assign(template.panels[0]!.axes[0]!, {
    placement: { mode: 'cross', axisId: 'axis-y', value: 1 },
  });
  const { result } = renderHook(() => useFigurePropertyDraft(template));
  select(result, x);
  change(
    result,
    (v) => {
      if (v.kind === 'axis' && v.details.placement?.mode === 'cross')
        v.details.placement.value = NaN;
    },
    { label: '交点', text: '-', path: ['details', 'placement', 'value'] },
  );
  change(
    result,
    (v) => {
      if (v.kind === 'axis') v.details.tickLabels.rotation = NaN;
    },
    {
      label: '标签旋转',
      text: '-',
      path: ['details', 'tickLabels', 'rotation'],
    },
  );
  change(result, (v) => {
    if (v.kind === 'axis') v.details.placement = { mode: 'frame' };
  });
  expect(result.current.numberTexts).toEqual({ 标签旋转: '-' });
  expect(result.current.errors).toHaveLength(1);
  expect(result.current.value).toMatchObject({
    details: { placement: { mode: 'frame' }, tickLabels: { rotation: NaN } },
  });
});

it('clears incompatible hidden category drafts including a crossing that was never committed', () => {
  const template = chartTemplate('bar');
  const axisY = template.panels[0]!.axes[1]!;
  Object.assign(axisY, {
    grid: {
      minor: { visible: true, color: '#123456', widthPt: 0.5, dash: 'dotted' },
    },
  });
  const { result } = renderHook(() => useFigurePropertyDraft(template));
  select(result, y);
  change(
    result,
    (v) => {
      if (v.kind === 'axis') {
        v.details.tickLabels.notation = 'engineering';
        v.details.tickLabels.divisor = NaN;
      }
    },
    { label: '除数', text: '1e-', path: ['details', 'tickLabels', 'divisor'] },
  );
  change(
    result,
    (v) => {
      if (v.kind === 'axis') v.details.grid!.minor!.widthPt = NaN;
    },
    {
      label: '次网格宽度',
      text: '-',
      path: ['details', 'grid', 'minor', 'widthPt'],
    },
  );
  change(
    result,
    (v) => {
      if (v.kind === 'axis') v.details.tickLabels.rotation = 12;
    },
    {
      label: '标签旋转',
      text: '12.',
      path: ['details', 'tickLabels', 'rotation'],
    },
  );
  select(result, x);
  change(
    result,
    (v) => {
      if (v.kind === 'axis')
        v.details.placement = { mode: 'cross', axisId: 'axis-y', value: NaN };
    },
    { label: '交点', text: '-', path: ['details', 'placement', 'value'] },
  );
  expect(result.current.errors).toHaveLength(2);
  select(result, curve);
  change(result, (v) => {
    if (v.kind === 'plot' && v.settings.plot.kind === 'bar')
      v.settings.plot.orientation = 'horizontal';
  });
  expect(result.current.errors).toEqual([]);
  select(result, y);
  expect(result.current.numberTexts).toEqual({ 标签旋转: '12.' });
  expect(result.current.value).toMatchObject({
    details: {
      scale: 'category',
      tickLabels: { notation: 'auto', rotation: 12 },
      grid: { minor: { visible: false, widthPt: 0.5, color: '#123456' } },
    },
  });
  expect(
    result.current.template.panels[0]!.axes[1]!.tickLabels,
  ).not.toHaveProperty('divisor');
  select(result, x);
  expect(result.current.numberTexts).toEqual({});
  expect(result.current.template.panels[0]!.axes[0]).not.toHaveProperty(
    'placement',
  );
});

it('retains cross-object unfinished appearance values until that exact input is repaired', () => {
  const { result } = renderHook(() =>
    useFigurePropertyDraft(defaultTemplate()),
  );
  select(result, x);
  change(
    result,
    (v) => {
      if (v.kind === 'axis') v.details.tickLabels.rotation = NaN;
    },
    {
      label: '标签旋转',
      text: '-1e-',
      path: ['details', 'tickLabels', 'rotation'],
    },
  );
  select(result, y);
  change(result, (v) => {
    if (v.kind === 'axis')
      v.details.titleAppearance = {
        format: 'plain',
        position: 0.25,
        offsetPt: { x: -2, y: 3 },
      };
  });
  expect(result.current.errors).toHaveLength(1);
  select(result, x);
  expect(result.current.numberTexts).toEqual({ 标签旋转: '-1e-' });
  change(
    result,
    (v) => {
      if (v.kind === 'axis') v.details.tickLabels.rotation = -10;
    },
    {
      label: '标签旋转',
      text: '-1e1',
      path: ['details', 'tickLabels', 'rotation'],
    },
  );
  expect(result.current.errors).toEqual([]);
  expect(result.current.template.panels[0]!.axes[1]!.title).toMatchObject({
    position: 0.25,
    offsetPt: { x: -2, y: 3 },
  });
});

it('names an unfinished numeric input without schema-union noise across object switches', () => {
  const { result } = renderHook(() =>
    useFigurePropertyDraft(defaultTemplate()),
  );
  select(result, x);
  change(
    result,
    (value) => {
      if (value.kind === 'axis') value.details.tickLabels.divisor = NaN;
    },
    {
      label: 'X 轴标签除数',
      text: '1e-',
      path: ['details', 'tickLabels', 'divisor'],
    },
  );
  select(result, y);
  expect(result.current.errors).toEqual([
    { ref: x, message: 'X 轴标签除数：请输入完整的有效数字' },
  ]);
  select(result, x);
  expect(result.current.numberTexts['X 轴标签除数']).toBe('1e-');
  change(
    result,
    (value) => {
      if (value.kind === 'axis') value.details.tickLabels.divisor = 0.1;
    },
    {
      label: 'X 轴标签除数',
      text: '1e-1',
      path: ['details', 'tickLabels', 'divisor'],
    },
  );
  expect(result.current.errors).toEqual([]);
  change(
    result,
    (value) => {
      if (value.kind === 'axis') value.details.tickLabels.divisor = 0;
    },
    {
      label: 'X 轴标签除数',
      text: '0',
      path: ['details', 'tickLabels', 'divisor'],
    },
  );
  expect(result.current.errors).toHaveLength(1);
  expect(result.current.errors[0]!.message).toContain('divisor');
  expect(result.current.errors[0]!.message).not.toContain('完整');
});

it('normalizes a shared peer becoming categorical and clears its hidden raw values without copying main-axis appearance', () => {
  const template = chartTemplate('bar');
  const peer = structuredClone(template.panels[0]!);
  peer.panelId = 'peer';
  peer.plotSlots = [];
  peer.axes.forEach((axis) => {
    axis.axisId += '-peer';
  });
  const peerY = peer.axes[1]!;
  peerY.tickLabels.notation = 'engineering';
  peerY.tickLabels.divisor = 1000;
  peerY.tickLabels.prefix = 'peer:';
  peerY.tickLabels.rotation = 30;
  peer.axes[0]!.placement = { mode: 'cross', axisId: peerY.axisId, value: 1 };
  template.panels.push(peer);
  template.sharedAxisGroups = [
    {
      groupId: 'shared-y',
      members: [
        { panelId: 'panel-main', axisId: 'axis-y' },
        { panelId: 'peer', axisId: peerY.axisId },
      ],
    },
  ];
  const { result } = renderHook(() => useFigurePropertyDraft(template));
  const peerRef = {
    kind: 'axis',
    panelId: 'peer',
    axisId: peerY.axisId,
  } as const;
  select(result, peerRef);
  change(
    result,
    (value) => {
      if (value.kind === 'axis') value.details.tickLabels.divisor = NaN;
    },
    { label: '除数', text: '1e-', path: ['details', 'tickLabels', 'divisor'] },
  );
  expect(result.current.errors).toHaveLength(1);
  select(result, curve);
  change(result, (value) => {
    if (value.kind === 'plot' && value.settings.plot.kind === 'bar')
      value.settings.plot.orientation = 'horizontal';
  });
  expect(result.current.errors).toEqual([]);
  select(result, peerRef);
  expect(result.current.numberTexts).toEqual({});
  expect(result.current.value).toMatchObject({
    details: {
      scale: 'category',
      tickLabels: { notation: 'auto', prefix: 'peer:', rotation: 30 },
    },
  });
  expect(result.current.template.panels[1]!.axes[0]).not.toHaveProperty(
    'placement',
  );
  expect(
    result.current.template.panels[0]!.axes[1]!.tickLabels,
  ).not.toHaveProperty('prefix');
});

it('clears invalid hidden numeric-format precision and minor style numbers on category conversion while retaining valid styles', () => {
  const template = chartTemplate('bar');
  const old = structuredClone(template.panels[0]!.axes[1]!);
  const { result } = renderHook(() => useFigurePropertyDraft(template));
  select(result, y);
  for (const [label, field] of [
    ['精度', 'precision'],
    ['次长度', 'lengthPt'],
    ['次宽度', 'widthPt'],
  ] as const)
    change(
      result,
      (value) => {
        if (value.kind !== 'axis') return;
        if (field === 'precision') value.details.tickLabels.precision = NaN;
        else value.details.minorTicks[field] = NaN;
      },
      {
        label,
        text: '-',
        path: [
          'details',
          field === 'precision' ? 'tickLabels' : 'minorTicks',
          field,
        ],
      },
    );
  change(result, (value) => {
    if (value.kind === 'axis') value.details.minorTicks.color = '#123456';
  });
  expect(result.current.errors).toHaveLength(1);
  select(result, curve);
  change(result, (value) => {
    if (value.kind === 'plot' && value.settings.plot.kind === 'bar')
      value.settings.plot.orientation = 'horizontal';
  });
  expect(result.current.errors).toEqual([]);
  select(result, y);
  expect(result.current.numberTexts).toEqual({});
  expect(result.current.value).toMatchObject({
    details: {
      tickLabels: { precision: old.tickLabels.precision },
      minorTicks: {
        color: '#123456',
        widthPt: old.minorTicks.widthPt,
        lengthPt: old.minorTicks.lengthPt,
      },
    },
  });
});

it('keeps an uncommitted major grid inside a newly-created grid object when its incompatible minor grid is reset', () => {
  const { result } = renderHook(() =>
    useFigurePropertyDraft(chartTemplate('bar')),
  );
  select(result, y);
  change(
    result,
    (value) => {
      if (value.kind !== 'axis') return;
      value.details.grid = {
        layer: 'front',
        major: { visible: true, widthPt: 2, color: '#123456', dash: 'dashed' },
        minor: { visible: true, widthPt: NaN, color: '#654321', dash: 'solid' },
      };
    },
    {
      label: '次网格宽度',
      text: '-',
      path: ['details', 'grid', 'minor', 'widthPt'],
    },
  );
  expect(result.current.errors).toHaveLength(1);
  select(result, curve);
  change(result, (value) => {
    if (value.kind === 'plot' && value.settings.plot.kind === 'bar')
      value.settings.plot.orientation = 'horizontal';
  });
  expect(result.current.errors).toEqual([]);
  select(result, y);
  expect(result.current.numberTexts).toEqual({});
  expect(result.current.value).toMatchObject({
    details: {
      grid: {
        layer: 'front',
        major: { visible: true, widthPt: 2, color: '#123456', dash: 'dashed' },
      },
    },
  });
});

it('preserves valid pending minor grid appearance while switching its visibility off for a category axis', () => {
  const { result } = renderHook(() =>
    useFigurePropertyDraft(chartTemplate('bar')),
  );
  select(result, y);
  change(
    result,
    (value) => {
      if (value.kind === 'axis') value.details.tickLabels.divisor = NaN;
    },
    { label: '除数', text: '-', path: ['details', 'tickLabels', 'divisor'] },
  );
  change(result, (value) => {
    if (value.kind === 'axis')
      value.details.grid = {
        minor: { visible: true, widthPt: 2, color: '#123456', dash: 'dotted' },
      };
  });
  select(result, curve);
  change(result, (value) => {
    if (value.kind === 'plot' && value.settings.plot.kind === 'bar')
      value.settings.plot.orientation = 'horizontal';
  });
  expect(result.current.errors).toEqual([]);
  select(result, y);
  expect(result.current.value).toMatchObject({
    details: {
      grid: {
        minor: { visible: false, widthPt: 2, color: '#123456', dash: 'dotted' },
      },
    },
  });
});
