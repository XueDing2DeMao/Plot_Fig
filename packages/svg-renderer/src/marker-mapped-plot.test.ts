import { describe, expect, it } from 'vitest';
import { lineMetrics, visibleLinePieces } from './xy-line-metrics.js';
import { renderMappedPlot } from './marker-mapped-plot.js';
import { renderPlot } from './plot.js';
import { createScale } from './scales.js';
import { captureMarkerSource } from './marker-overrides.js';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { XyPlot } from '@plot-fig/figure-schema';
const columns = ['x', 'y', 'c'].map((id, index) => ({
  columnId: id,
  name: id,
  index,
  valueType: 'number' as const,
  values: index === 0 ? [3, 1, 2] : [0, 5, 10],
  source: { tableId: 't', tableName: 'T', dataStartRow: 1 },
}));
const data: DataBindingSet = {
  kind: 'data-binding-set',
  version: '1.0.0',
  source: { kind: 'session', name: 'Test', rowCount: 3 },
  columns,
  bindings: ['x', 'y', 'c'].map((id) => ({
    dataSlotId: id,
    columnId: id,
    status: 'valid',
  })),
  diagnostics: [],
};
const plot = {
  kind: 'xy',
  plotSlotId: 'p',
  xAxisId: 'ax',
  yAxisId: 'ay',
  bindings: { x: 'x', y: 'y' },
  mode: 'line-markers',
  lineStyle: { visible: true, color: '#111111', widthPt: 1, dash: 'solid' },
  markerStyle: {
    visible: true,
    shape: 'circle',
    sizePt: 4,
    fill: '#777777',
    stroke: '#111111',
    strokeWidthPt: 0,
  },
} as XyPlot;
const context = {
  rect: { x: 0, y: 0, width: 300, height: 100 },
  xScale: createScale({ scale: 'linear' }, 0, 4)!,
  yScale: createScale({ scale: 'linear' }, 0, 10)!,
};
describe('映射符号与真实曲线', () => {
  it('单点隐藏和非法对数跨度都不输出符号几何', () => {
    const source = captureMarkerSource(columns, columns[0]!, columns[1]!);
    const hidden = renderMappedPlot(plot, data, context, {
      overrides: { source, points: [{ row: 1, style: { visible: false } }] },
    });
    expect(hidden.svg).not.toContain('data-source-index="0"');
    const log = {
      ...context,
      xScale: createScale({ scale: 'log10' }, 0.1, 10)!,
    };
    const invalid = renderMappedPlot(plot, data, log, {
      mapping: {
        size: { mode: 'diameter', unit: 'x-data', minSize: 10, maxSize: 10 },
      },
      columns: { size: columns[2]! },
      overrides: { source, points: [{ row: 1, style: { visible: true } }] },
    });
    expect(invalid.svg).not.toContain('data-role="mapped-symbol"');
  });
  it('切到没有来源元数据的输入时暂停旧补丁但仍绘制基础图形', () => {
    const source = captureMarkerSource(columns, columns[0]!, columns[1]!);
    const legacy = {
      ...data,
      columns: data.columns.map(({ source, ...column }) => column),
    };
    const result = renderMappedPlot(plot, legacy, context, {
      overrides: { source, points: [{ row: 1, style: { fill: '#ff00ff' } }] },
    });
    expect(result.overrideState.paused).toBe(true);
    expect(result.svg).toContain('<circle');
    expect(result.svg).not.toContain('#ff00ff');
  });
  it('各个点使用自己的半径，隐藏的符号不挖空线条', () => {
    const metrics = lineMetrics(
      [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
      ],
      'straight',
      false,
    );
    const pieces = visibleLinePieces(
      metrics,
      [
        { x: 20, y: 0 },
        { x: 5, y: 0 },
        { x: 10, y: 0 },
      ],
      [4, 1, 0],
    );
    expect(pieces.map((p) => [p.from, p.to])).toEqual([
      [0, 4],
      [6, 16],
      [24, 30],
    ]);
    expect(() => visibleLinePieces(metrics, [{ x: 0, y: 0 }], [])).toThrow(
      /数量/,
    );
  });
  it('空映射保持旧 SVG 字节一致', () => {
    expect(renderMappedPlot(plot, data, context, {}).svg).toBe(
      renderPlot(plot, data, context)!.svg,
    );
  });
  it('曲线整体隐藏符号优先于单点或映射，误差与线条仍按原行绘制', () => {
    const next = {
      ...plot,
      markerStyle: { ...plot.markerStyle!, visible: false },
    };
    const result = renderMappedPlot(next, data, context, {
      mapping: {
        size: { mode: 'diameter', minSize: 5, maxSize: 20, unit: 'pt' },
      },
      columns: { size: columns[2]! },
    });
    expect(result.svg).not.toContain('data-role="mapped-symbol"');
    expect(result.svg).toContain('<path');
  });
  it('原行上的颜色在显示抽样和完整导出中一致', () => {
    const next = {
      ...plot,
      dataView: {
        sort: 'x-ascending' as const,
        sampling: { mode: 'every' as const, step: 2 },
      },
    };
    const options = {
      mapping: {
        color: {
          mode: 'continuous' as const,
          target: 'fill' as const,
          colors: ['#000000', '#ffffff'],
        },
      },
      columns: { color: columns[2]! },
    };
    const display = renderMappedPlot(next, data, context, options);
    const exported = renderMappedPlot(next, data, context, options, 'export');
    expect(display.svg).toContain('fill="#808080"');
    expect(display.svg).toContain('fill="#000000"');
    expect(display.svg).not.toContain('fill="#ffffff"');
    expect(exported.svg).toContain('fill="#ffffff"');
  });
});
