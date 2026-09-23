import { expect, it } from 'vitest';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { XyPlot } from '@plot-fig/figure-schema';
import { renderDataLabels } from './data-labels.js';
import { createScale } from './scales.js';
import { prepareSeriesRows } from './series-rows.js';
import { captureMarkerSource } from './marker-overrides.js';
const data: DataBindingSet = {
  kind: 'data-binding-set',
  version: '1.0.0',
  source: { kind: 'session', name: 'T', rowCount: 4 },
  columns: [
    {
      columnId: 'x',
      name: 'x',
      index: 0,
      valueType: 'number',
      values: [1, 2, 2, 4],
    },
    {
      columnId: 'y',
      name: 'y',
      index: 1,
      valueType: 'number',
      values: [1.25, 2, 2, 4],
    },
    {
      columnId: 'label',
      name: 'label',
      index: 2,
      valueType: 'string',
      values: ['<A> & X', 'B', 'C', 'D'],
    },
  ].map((c) => ({
    ...c,
    source: { tableId: 't', tableName: 'T', dataStartRow: 1 },
  })) as DataBindingSet['columns'],
  bindings: ['x', 'y', 'label'].map((id) => ({
    dataSlotId: id,
    columnId: id,
    status: 'valid',
  })),
  diagnostics: [],
};
const plot = {
  kind: 'xy',
  plotSlotId: 'p',
  bindings: { x: 'x', y: 'y', label: 'label' },
  mode: 'line-markers',
  lineStyle: { visible: true, color: '#ff0000', widthPt: 1, dash: 'solid' },
  markerStyle: {
    visible: true,
    shape: 'circle',
    sizePt: 10,
    fill: '#00ff00',
    stroke: '#000000',
    strokeWidthPt: 1,
  },
} as XyPlot;
const context = {
  rect: { x: 0, y: 0, width: 200, height: 200 },
  xScale: createScale({ scale: 'linear' }, 0, 5)!,
  yScale: createScale({ scale: 'linear' }, 0, 5)!,
};
const rows = () =>
  prepareSeriesRows(data.columns[0]!, data.columns[1]!).rawRows;
it.each([0, 45])(
  '移动避让把边界标签保持在绘图区内（旋转 %s 度）',
  (rotationDeg) => {
    const r = renderDataLabels({
      plot: {
        ...plot,
        dataLabels: {
          visible: true,
          source: 'custom',
          template: '边界文字',
          collision: 'move',
          position: 'above',
          rotationDeg,
        },
      },
      data,
      context,
      rows: [{ sourceIndex: 0, x: 0, y: 5 }],
    });
    expect(r.placed).toBe(1);
    const match = /transform="translate\(([-\d.]+)[ ,]([-\d.]+)\)/.exec(r.svg);
    expect(Number(match?.[1])).toBeGreaterThan(0);
    expect(Number(match?.[2])).toBeGreaterThan(0);
  },
);
it('使用原行文本、格式和独立抽样，安全转义文字模板', () => {
  const r = renderDataLabels({
    plot: {
      ...plot,
      dataLabels: {
        visible: true,
        source: 'custom',
        template: '{row}: {label} = {y}',
        format: { mode: 'fixed', precision: 1, prefix: '[', suffix: ']' },
        sampling: { mode: 'rows', rows: [1, 3] },
      },
    },
    data,
    context,
    rows: rows().reverse(),
  });
  expect(r.placed).toBe(2);
  expect(r.svg).toContain('1: &lt;A&gt; &amp; X = 1.3');
  expect(r.svg).toContain('3: C = 2.0');
  expect(r.svg).not.toContain('2: B');
});
it('隐藏或有界移动相交标签，保留引导线、背景、旋转和实际颜色', () => {
  const base = {
    ...plot,
    dataLabels: {
      visible: true,
      source: 'y' as const,
      position: 'above' as const,
      color: { mode: 'marker' as const },
      rotationDeg: 15,
      box: {
        visible: true,
        fill: '#ffffff',
        stroke: '#000000',
        widthPt: 1,
        paddingPt: 2,
      },
      leader: { visible: true, color: '#000000', widthPt: 1 },
    },
  };
  const hide = renderDataLabels({
    plot: { ...base, dataLabels: { ...base.dataLabels, collision: 'hide' } },
    data,
    context,
    rows: rows(),
  });
  expect(hide.hidden).toBe(1);
  expect(hide.svg).toContain('fill="#00ff00"');
  const move = renderDataLabels({
    plot: { ...base, dataLabels: { ...base.dataLabels, collision: 'move' } },
    data,
    context,
    rows: rows(),
  });
  expect(move.placed).toBe(4);
  expect(move.svg).toContain('data-role="label-leader"');
  expect(move.svg).toContain('rotate(15)');
});
it('单点覆盖匹配完整源数据并在源变化时暂停，原行隐藏和偏移生效', () => {
  const p = {
    ...plot,
    dataLabels: { visible: true, source: 'row' as const },
    labelOverrides: {
      source: captureMarkerSource(
        data.columns,
        data.columns[0]!,
        data.columns[1]!,
      ),
      points: [
        { row: 2, visible: false },
        {
          row: 3,
          text: 'chosen',
          offset: { x: -4, y: 0, unit: 'pt' as const },
        },
      ],
    },
  };
  const r = renderDataLabels({ plot: p, data, context, rows: rows() });
  expect(r.placed).toBe(3);
  expect(r.svg).toContain('chosen');
  const changed = structuredClone(data);
  changed.columns[2]!.values[0] = 'NEW';
  const paused = renderDataLabels({
    plot: p,
    data: changed,
    context,
    rows: rows(),
  });
  expect(paused.placed).toBe(4);
  expect(paused.svg).not.toContain('chosen');
  expect(paused.diagnostics[0]!.message).toContain('暂停');
});
it('锚点复用真实误差上下端点，基线与回调像素坐标支持通用图型', () => {
  const p = {
    ...plot,
    dataLabels: {
      visible: true,
      source: 'y' as const,
      position: 'center' as const,
      anchor: 'y-error-upper' as const,
    },
  };
  const r = renderDataLabels({
    plot: p,
    data,
    context,
    rows: [rows()[0]!],
    errorBounds: () => [0, 3],
  });
  expect(r.svg).toContain('translate(40 80)');
  const b = renderDataLabels({
    plot: {
      ...p,
      dataLabels: { ...p.dataLabels, anchor: 'baseline', baseline: 0 },
    },
    data,
    context,
    rows: [rows()[0]!],
  });
  expect(b.svg).toContain('translate(40 200)');
  expect(() =>
    renderDataLabels({
      plot: {
        ...p,
        dataLabels: { ...p.dataLabels, sampling: { mode: 'rows', rows: [99] } },
      },
      data,
      context,
      rows: rows(),
    }),
  ).toThrow(/原行/);
});
it('超过标签数量上限明确报错', () => {
  const many = Array.from({ length: 2001 }, (_, i) => ({
    sourceIndex: i,
    x: 1,
    y: 1,
  }));
  expect(() =>
    renderDataLabels({
      plot: { ...plot, dataLabels: { visible: true, source: 'row' } },
      data,
      context,
      rows: many,
    }),
  ).toThrow(/2000/);
});
it('数字标签列沿用格式，字号百分比偏移、换行和线色跟随均可组合', () => {
  const d = structuredClone(data);
  d.columns[2]!.valueType = 'number';
  d.columns[2]!.values = [1.234, 2, 3, 4];
  const r = renderDataLabels({
    plot: {
      ...plot,
      dataLabels: {
        visible: true,
        source: 'column',
        format: { mode: 'fixed', precision: 2 },
        font: { family: 'Arial', sizePt: 10, bold: true, italic: true },
        position: 'center',
        offset: { x: -50, y: 100, unit: 'font-percent' },
        wrapChars: 2,
        color: { mode: 'line' },
        sampling: { mode: 'rows', rows: [1] },
      },
    },
    data: d,
    context,
    rows: rows(),
    lineColorForRow: () => '#123456',
  });
  expect(r.svg).toContain('translate(35 160)');
  expect(r.svg).toContain('fill="#123456"');
  expect(r.svg).toContain('font-weight="bold"');
  expect(r.svg.match(/<tspan/g)).toHaveLength(2);
  expect(r.svg).toContain('>1.</tspan>');
  expect(r.svg).toContain('>23</tspan>');
});
it('标签数量和间隔按原行独立抽样，列数据不允许破坏 SVG', () => {
  const selected = (
    sampling: NonNullable<
      NonNullable<
        Parameters<typeof renderDataLabels>[0]['plot']['dataLabels']
      >['sampling']
    >,
  ) =>
    renderDataLabels({
      plot: { ...plot, dataLabels: { visible: true, source: 'row', sampling } },
      data,
      context,
      rows: rows().reverse(),
    }).svg.match(/data-source-row="\d+"/g);
  expect(selected({ mode: 'every', step: 2 })).toEqual([
    'data-source-row="1"',
    'data-source-row="3"',
  ]);
  expect(selected({ mode: 'count', count: 3 })).toEqual([
    'data-source-row="1"',
    'data-source-row="3"',
    'data-source-row="4"',
  ]);
  const invalid = structuredClone(data);
  invalid.columns[2]!.values[0] = 'bad\u0001';
  expect(() =>
    renderDataLabels({
      plot: { ...plot, dataLabels: { visible: true, source: 'column' } },
      data: invalid,
      context,
      rows: rows(),
    }),
  ).toThrow(/字符/);
});
it('标签按单点实际符号避让，基础符号隐藏时仍保留可见覆盖的间距', () => {
  const row = rows()[0]!;
  const r = renderDataLabels({
    plot: {
      ...plot,
      markerStyle: { ...plot.markerStyle!, visible: false },
      dataLabels: { visible: true, source: 'y' },
    },
    data,
    context,
    rows: [row],
    markerForRow: () => plot.markerStyle!,
  });
  expect(r.svg).toContain('translate(40 136.5)');
});
it('平移或堆叠后标签文字仍使用原始数据值，位置跟随展示数据', () => {
  const raw = rows()[0]!;
  const r = renderDataLabels({
    plot: {
      ...plot,
      dataLabels: {
        visible: true,
        source: 'custom',
        template: '{x}, {y}',
        position: 'center',
      },
    },
    data,
    context,
    rows: [{ ...raw, x: 2, y: 4 }],
    rawRowForRow: () => raw,
  });
  expect(Number(r.svg.match(/translate\(80 ([^)]+)\)/)?.[1])).toBeCloseTo(40);
  expect(r.svg).toContain('>1, 1.25</tspan>');
});
