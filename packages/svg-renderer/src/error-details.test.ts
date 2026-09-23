import { expect, it } from 'vitest';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { XyPlot } from '@plot-fig/figure-schema';
import type { ErrorDetails } from '../../figure-schema/src/schema/error-details.js';
import { advancedErrorRange, renderAdvancedErrors } from './error-details.js';
import { createScale } from './scales.js';
import type { SeriesRow } from './series-rows.js';
import { xyLinePath } from './xy-line-path.js';

function fixture(details: ErrorDetails = {}) {
  const plot = {
    kind: 'xy',
    plotSlotId: 'p',
    bindings: { x: 'x', y: 'y', yErrorLower: 'lo', yErrorUpper: 'hi' },
    errorBarStyle: {
      visible: true,
      color: '#123456',
      widthPt: 1,
      capWidthPt: 4,
    },
    lineStyle: { color: '#abcdef' },
    errorDetails: details,
  } as XyPlot & { errorDetails: ErrorDetails };
  const values = {
    x: [1, 2, 3, 4],
    y: [3, 4, 5, 6],
    lo: [1, 1, 1, 1],
    hi: [2, 2, 2, 2],
  };
  const data: DataBindingSet = {
    kind: 'data-binding-set',
    version: '1.0.0',
    source: { kind: 'session', name: 'test', rowCount: 4 },
    diagnostics: [],
    columns: Object.entries(values).map(([id, v], index) => ({
      columnId: id,
      name: id,
      index,
      valueType: 'number',
      values: v,
    })),
    bindings: Object.keys(values).map((id) => ({
      dataSlotId: id,
      columnId: id,
      status: 'valid',
    })),
  };
  const rows: SeriesRow[] = values.x.map((x, sourceIndex) => ({
    x,
    y: values.y[sourceIndex]!,
    sourceIndex,
  }));
  const context = {
    rect: { x: 0, y: 0, width: 100, height: 100 },
    xScale: createScale({ scale: 'linear' }, 0, 10)!,
    yScale: createScale({ scale: 'linear' }, 0, 10)!,
  };
  return { plot, data, rows, context };
}
it('单向幅值只要求对应误差源，忽略另一方向且拒绝负幅值', () => {
  const { plot, data } = fixture({ y: { direction: 'positive' } });
  delete plot.bindings.yErrorLower;
  expect(
    advancedErrorRange(plot, data, { prefix: 'y', index: 0, base: 3 }),
  ).toEqual([3, 5]);
  data.columns.find((c) => c.columnId === 'hi')!.values[0] = -2;
  expect(
    advancedErrorRange(plot, data, { prefix: 'y', index: 0, base: 3 }),
  ).toBeUndefined();
});
it('绝对端点允许负数，要求低端不高于中心、高端不低于中心', () => {
  const { plot, data } = fixture({ y: { source: 'endpoints' } });
  data.columns.find((c) => c.columnId === 'lo')!.values[0] = -5;
  data.columns.find((c) => c.columnId === 'hi')!.values[0] = -1;
  expect(
    advancedErrorRange(plot, data, { prefix: 'y', index: 0, base: -3 }),
  ).toEqual([-5, -1]);
  expect(
    advancedErrorRange(plot, data, { prefix: 'y', index: 0, base: 3 }),
  ).toBeUndefined();
  plot.errorDetails.y!.direction = 'negative';
  expect(
    advancedErrorRange(plot, data, { prefix: 'y', index: 0, base: 3 }),
  ).toEqual([-5, 3]);
});
it('相对基线方向按每个数据中心分别确定，非有限基线与溢出被拒绝', () => {
  const { plot, data } = fixture({
    y: { direction: 'away-baseline', baseline: 4 },
  });
  expect(
    advancedErrorRange(plot, data, { prefix: 'y', index: 0, base: 3 }),
  ).toEqual([2, 3]);
  expect(
    advancedErrorRange(plot, data, { prefix: 'y', index: 1, base: 5 }),
  ).toEqual([5, 7]);
  plot.errorDetails.y!.direction = 'toward-baseline';
  expect(
    advancedErrorRange(plot, data, { prefix: 'y', index: 0, base: 3 }),
  ).toEqual([3, 5]);
  plot.errorDetails.y!.baseline = Number.NaN;
  expect(() =>
    advancedErrorRange(plot, data, { prefix: 'y', index: 0, base: 3 }),
  ).toThrow();
});
it('误差带独立抽样仍按原行读取上下端点并保留排序及分段', () => {
  const { plot, data, rows, context } = fixture({
    y: {
      render: 'band',
      sampling: { mode: 'all' },
      fill: '#ff0000',
      fillOpacity: 0.2,
      followColor: true,
      dash: 'dash',
    },
  });
  const result = renderAdvancedErrors(plot, data, {
    context,
    segments: [[rows[0]!, rows[3]!]],
    allSegments: [
      [rows[0]!, rows[1]!],
      [rows[2]!, rows[3]!],
    ],
  });
  expect(result.diagnostics).toEqual([]);
  expect(result.svg.match(/data-role="error-band"/g)).toHaveLength(2);
  expect(result.svg).toContain('fill-opacity="0.2"');
  expect(result.svg).toContain('stroke="#abcdef"');
  expect(result.svg).toContain('stroke-dasharray="6 3"');
  expect(result.svg).toContain('data-source-indices="0,1"');
  expect(result.svg).toContain('data-source-indices="2,3"');
});
it('抽样不可跨过未采中的非法对数误差端点', () => {
  const { plot, data, rows, context } = fixture({
    y: { render: 'band', sampling: { mode: 'same' } },
  });
  context.yScale = createScale({ scale: 'log10' }, 1, 10)!;
  data.columns.find((c) => c.columnId === 'lo')!.values[1] = 10;
  const result = renderAdvancedErrors(plot, data, {
    context,
    segments: [[rows[0]!, rows[2]!, rows[3]!]],
    allSegments: [rows],
  });
  expect(result.diagnostics).toHaveLength(1);
  expect(result.svg).not.toContain('data-source-indices="0,2,3"');
  expect(result.svg).toContain('data-source-indices="2,3"');
});
it('单向误差棒不在中心增加端帽，避让实际符号包络并保留源行标识', () => {
  const { plot, data, rows, context } = fixture({
    y: { direction: 'positive', avoidSymbols: true },
  });
  const result = renderAdvancedErrors(plot, data, {
    context,
    segments: [[rows[0]!]],
    markerRadius: () => 6,
  });
  expect(result.svg.match(/data-role="error-cap"/g)).toHaveLength(1);
  expect(result.svg).toContain('y1="64"');
  expect(result.svg).toContain('y2="50"');
  expect(result.svg).toContain('data-source-index="0"');
});
it('独立每隔N点与总点数抽样跨分段有界，横轴误差支持样条边界', () => {
  const { plot, data, rows, context } = fixture({
    y: { sampling: { mode: 'count', count: 2 } },
  });
  let result = renderAdvancedErrors(plot, data, {
    context,
    segments: [rows],
    allSegments: [rows],
  });
  expect(result.svg.match(/data-source-index=/g)).toHaveLength(2);
  plot.errorDetails = { x: { render: 'lines', connection: 'spline' } };
  plot.bindings.xErrorLower = 'lo';
  plot.bindings.xErrorUpper = 'hi';
  delete plot.bindings.yErrorLower;
  delete plot.bindings.yErrorUpper;
  result = renderAdvancedErrors(plot, data, { context, segments: [rows] });
  expect(result.svg).toContain('data-direction="x"');
  expect(result.svg).toContain(' C');
  expect(result.svg).toContain('matrix(0 1 1 0 0 0)');
});
it('误差样条的完整行重复坐标不能被抽样掩盖', () => {
  const { plot, data, rows, context } = fixture({
    y: { render: 'lines', connection: 'spline', sampling: { mode: 'same' } },
  });
  rows[1] = { ...rows[1]!, x: rows[0]!.x };
  expect(() =>
    renderAdvancedErrors(plot, data, {
      context,
      segments: [[rows[0]!, rows[3]!]],
      allSegments: [rows],
    }),
  ).toThrow(/单调|重复/);
});
it('上下绝对端点逐行严格验证，非数值、缺失与数值溢出不可绘制', () => {
  const { plot, data } = fixture({ y: { source: 'endpoints' } });
  const low = data.columns.find((c) => c.columnId === 'lo')!,
    high = data.columns.find((c) => c.columnId === 'hi')!;
  low.values[0] = -5;
  for (const bad of [null, '5', Number.NaN, Infinity]) {
    high.values[0] = bad;
    expect(
      advancedErrorRange(plot, data, { prefix: 'y', index: 0, base: 0 }),
    ).toBeUndefined();
  }
  plot.errorDetails.y = { direction: 'negative' };
  low.values[0] = Number.MAX_VALUE;
  expect(
    advancedErrorRange(plot, data, {
      prefix: 'y',
      index: 0,
      base: -Number.MAX_VALUE,
    }),
  ).toBeUndefined();
});
it('远离基线的单方向仅缺失被隐藏一侧时仍可绘制，反转坐标轴不改变数据方向', () => {
  const { plot, data, rows, context } = fixture({
    y: { direction: 'away-baseline', baseline: 4 },
  });
  data.columns.find((c) => c.columnId === 'hi')!.values[0] = null;
  data.columns.find((c) => c.columnId === 'lo')!.values[3] = null;
  context.yScale = createScale({ scale: 'linear', reverse: true }, 0, 10)!;
  const result = renderAdvancedErrors(plot, data, {
    context,
    segments: [[rows[0]!, rows[3]!]],
  });
  expect(result.diagnostics).toEqual([]);
  expect(result.svg.match(/data-role="error-cap"/g)).toHaveLength(2);
  expect(result.svg).toContain('y2="80"');
  expect(result.svg).toContain('y2="20"');
});
it('按绘制顺序每隔N点取样，完整分段互不连接且输入预算有界', () => {
  const { plot, data, rows, context } = fixture({
    y: { sampling: { mode: 'every', step: 2 } },
  });
  const result = renderAdvancedErrors(plot, data, {
    context,
    segments: [[rows[0]!]],
    allSegments: [[rows[3]!, rows[2]!, rows[1]!], [rows[0]!]],
  });
  expect(result.svg.match(/data-source-index=/g)).toHaveLength(3);
  expect(result.svg).toContain('data-source-index="3"');
  expect(result.svg).toContain('data-source-index="1"');
  expect(result.svg).not.toContain('data-source-index="2"');
  expect(() =>
    renderAdvancedErrors(plot, data, {
      context,
      segments: [Array.from({ length: 100001 }, () => rows[0]!)],
    }),
  ).toThrow(/十万/);
});
it('上游过滤掉的非法对数中心仍断开误差带，排序后也不跨过该源行', () => {
  const { plot, data, rows, context } = fixture({ y: { render: 'band' } });
  context.yScale = createScale({ scale: 'log10' }, 1, 10)!;
  data.columns.find((c) => c.columnId === 'y')!.values[1] = 0;
  const result = renderAdvancedErrors(plot, data, {
    context,
    segments: [[rows[3]!, rows[2]!, rows[0]!]],
    allSegments: [[rows[3]!, rows[2]!, rows[0]!]],
  });
  expect(result.svg).not.toContain('data-source-indices="3,2,0"');
  expect(result.svg).toContain('data-source-indices="3,2"');
});
it('单方向边界线只绘制有效一侧，方向跨基线变化时分别断开', () => {
  const { plot, data, rows, context } = fixture({
    y: { render: 'lines', direction: 'positive' },
  });
  let result = renderAdvancedErrors(plot, data, { context, segments: [rows] });
  expect(result.svg.match(/data-role="error-boundary"/g)).toHaveLength(1);
  plot.errorDetails.y!.direction = 'away-baseline';
  plot.errorDetails.y!.baseline = 4.5;
  result = renderAdvancedErrors(plot, data, { context, segments: [rows] });
  expect(result.svg.match(/data-role="error-boundary"/g)).toHaveLength(2);
  expect(result.svg).toContain('data-error-side="lower"');
  expect(result.svg).toContain('data-error-side="upper"');
  expect(result.svg).toContain('data-source-indices="0,1"');
  expect(result.svg).toContain('data-source-indices="2,3"');
});
it('平移曲线误差端点与中心同步平移，幅值和绝对端点均保留物理差值', () => {
  const { plot, data, rows, context } = fixture({
    y: { source: 'endpoints', direction: 'positive' },
  });
  data.columns.find((c) => c.columnId === 'hi')!.values[0] = 5;
  const translated = [{ ...rows[0]!, x: rows[0]!.x + 2, y: rows[0]!.y + 1 }];
  let result = renderAdvancedErrors(plot, data, {
    context,
    segments: [translated],
    offset: { x: 2, y: 1 },
  });
  expect(result.svg).toContain('x1="30"');
  expect(result.svg).toContain('y1="60"');
  expect(result.svg).toContain('y2="40"');
  plot.errorDetails = {};
  result = renderAdvancedErrors(plot, data, {
    context,
    segments: [translated],
    offset: { x: 2, y: 1 },
  });
  expect(result.svg).toContain('y2="70"');
  expect(result.svg).toContain('y2="10"');
});
it('跟随线色的误差棒按原行映射，独立抽样后颜色身份不变', () => {
  const { plot, data, rows, context } = fixture({
    y: { followColor: true, sampling: { mode: 'all' } },
  });
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#123456'];
  const result = renderAdvancedErrors(plot, data, {
    context,
    segments: [[rows[0]!, rows[3]!]],
    allSegments: [rows],
    lineColorForRow: (row) => colors[row.sourceIndex]!,
  });
  for (let i = 0; i < rows.length; i++) {
    const group = result.svg.match(
      new RegExp(`<g data-source-index="${i}">(.*?)</g>`),
    )?.[1];
    expect(group).toContain(`stroke="${colors[i]}"`);
  }
});
it('误差带跟随各起始原行颜色，样条分色保持完整几何控制点', () => {
  const { plot, data, rows, context } = fixture({
    y: { render: 'band', connection: 'spline', followColor: true },
  });
  data.columns.find((c) => c.columnId === 'hi')!.values = [2, 1, 3, 2];
  const result = renderAdvancedErrors(plot, data, {
    context,
    segments: [rows],
    lineColorForRow: (row) =>
      ['#ff0000', '#00ff00', '#0000ff', '#123456'][row.sourceIndex]!,
  });
  const fullUpper = xyLinePath(
    [
      { x: 10, y: 50 },
      { x: 20, y: 50 },
      { x: 30, y: 20 },
      { x: 40, y: 20 },
    ],
    'spline',
  );
  for (const command of fullUpper.match(/C[^C]+/g) ?? [])
    expect(result.svg).toContain(command.trim());
  expect(result.svg.match(/data-role="error-band"/g)).toHaveLength(3);
  for (const color of ['#ff0000', '#00ff00', '#0000ff']) {
    expect(result.svg).toContain(`fill="${color}"`);
    expect(result.svg).toContain(`stroke="${color}"`);
  }
});
it('百分比堆叠按原始中心选择误差方向并缩放端点，符号中心采用展示坐标', () => {
  const { plot, data, rows, context } = fixture({
    y: { source: 'endpoints', direction: 'away-baseline', baseline: 4 },
  });
  const source = rows[0]!;
  data.columns.find((c) => c.columnId === 'lo')!.values[0] = 1;
  const result = renderAdvancedErrors(plot, data, {
    context,
    segments: [[{ ...source, x: source.x + 1, y: source.y * 2 + 1 }]],
    sourceRows: rows,
    errorTransform: () => ({
      xOffset: 1,
      yOffset: 1,
      yScale: 2,
      mapY: (value) => value * 2 + 1,
    }),
  });
  expect(result.diagnostics).toEqual([]);
  expect(result.svg.match(/data-role="error-cap"/g)).toHaveLength(1);
  expect(result.svg).toContain('x1="20"');
  expect(result.svg).toContain('y1="30"');
  expect(result.svg).toContain('y2="70"');
});
it('误差分段依据变换后的对数中心，原数据负值经偏移变合法时不误断带', () => {
  const { plot, data, rows, context } = fixture({
    y: { render: 'band', direction: 'positive' },
  });
  const ys = [-2, -1, 0, 1];
  data.columns.find((c) => c.columnId === 'y')!.values = ys;
  const source = rows.map((row, i) => ({ ...row, y: ys[i]! }));
  context.yScale = createScale({ scale: 'log10' }, 1, 10)!;
  const result = renderAdvancedErrors(plot, data, {
    context,
    sourceRows: source,
    segments: [source.map((row) => ({ ...row, y: row.y + 4 }))],
    errorTransform: () => ({
      xOffset: 0,
      yOffset: 4,
      yScale: 1,
      mapY: (value) => value + 4,
    }),
  });
  expect(result.diagnostics).toEqual([]);
  expect(result.svg).toContain('data-source-indices="0,1,2,3"');
});
