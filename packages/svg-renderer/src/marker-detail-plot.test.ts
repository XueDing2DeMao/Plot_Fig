import { expect, it } from 'vitest';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { XyPlot } from '@plot-fig/figure-schema';
import { renderMarkerDetailPlot } from './marker-detail-plot.js';
import { renderMappedPlot, markerSourceForPlot } from './marker-mapped-plot.js';
import { createScale } from './scales.js';
const data: DataBindingSet = {
  kind: 'data-binding-set',
  version: '1.0.0',
  source: { kind: 'session', name: 'T', rowCount: 5 },
  columns: ['x', 'y'].map((id, index) => ({
    columnId: id,
    name: id,
    index,
    valueType: 'number',
    values: [1, 2, 2, 2, 4],
    source: { tableId: 't', tableName: 'T', dataStartRow: 1 },
  })),
  bindings: ['x', 'y'].map((id) => ({
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
  mode: 'line-markers',
  bindings: { x: 'x', y: 'y' },
  lineStyle: { visible: true, color: '#111111', widthPt: 1, dash: 'solid' },
  markerStyle: {
    visible: true,
    shape: 'circle',
    sizePt: 10,
    fill: '#336699',
    stroke: '#111111',
    strokeWidthPt: 1,
  },
  dropLines: { horizontal: { target: { mode: 'axis-min' } } },
} as XyPlot;
const context = {
  rect: { x: 0, y: 0, width: 100, height: 100 },
  xScale: createScale({ scale: 'linear' }, 0, 5)!,
  yScale: createScale({ scale: 'linear' }, 0, 5)!,
};
it('无细节时保持正式绘制字节完全一致，数组配置必须拒绝', () => {
  expect(renderMarkerDetailPlot(plot, data, context, {}).svg).toBe(
    renderMappedPlot(plot, data, context).svg,
  );
  expect(() =>
    renderMarkerDetailPlot(plot, data, context, [] as never),
  ).toThrow();
});
it('展开仅移动符号，原线条与垂线仍位于真实坐标；抽样和排序保留原偏移', () => {
  const details = {
    overlap: { direction: 'horizontal' as const, gapPt: 2, center: true },
  };
  const baseline = renderMappedPlot(plot, data, context).svg;
  const result = renderMarkerDetailPlot(plot, data, context, details).svg;
  const paths = (svg: string) =>
    [...svg.matchAll(/<path\b[^>]*\/>/g)]
      .map((m) => m[0])
      .filter((s) => !s.includes('overlap-center'));
  expect(paths(result)).toEqual(paths(baseline));
  const sampled = {
    ...plot,
    dataView: {
      sort: 'x-descending' as const,
      sampling: { mode: 'every' as const, step: 2 },
      sampleExport: true,
    },
  };
  const partial = renderMarkerDetailPlot(sampled, data, context, details).svg;
  const point = (s: string) =>
    s.match(/data-source-index="2">([^<]*<circle[^>]+>)/)?.[1];
  expect(point(partial)).toBe(point(result));
  expect(point(result)).toBeDefined();
  expect(result.match(/data-role="overlap-center"/g)).toHaveLength(1);
});
it('启用细节后数据来源变更仍发出单点覆盖暂停警告', () => {
  const p = {
    ...plot,
    markerOverrides: {
      source: markerSourceForPlot(plot, data)!,
      points: [{ row: 1, style: { fill: '#ff00ff' } }],
    },
  };
  const changed = structuredClone(data);
  changed.columns[0]!.values[0] = 1.5;
  const r = renderMarkerDetailPlot(p, changed, context, {
    fillOnlyOpacity: true,
  });
  expect(r.overrideState.paused).toBe(true);
  expect(r.diagnostics.some((d) => d.message.includes('暂停'))).toBe(true);
  expect(r.svg).not.toContain('#ff00ff');
});
