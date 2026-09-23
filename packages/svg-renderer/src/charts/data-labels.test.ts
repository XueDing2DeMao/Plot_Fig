import { expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
} from '../../../../tests/helpers/chart-fixtures.js';
import { preparePlot, arrangeBands } from './prepare.js';
import { renderBars, renderArea } from './svg-marks.js';
import { createScale } from '../scales.js';
import { labelSourceForPlot } from '../data-labels.js';
import type { RenderDiagnostic } from '../types.js';
const numeric = () => createScale({ scale: 'linear' }, 0, 10)!;
function setup() {
  const p = chartTemplate('bar').panels[0]!.plotSlots[0]!;
  if (p.kind !== 'bar') throw new Error('fixture');
  const data = chartData({
    category: ['B', 'A'],
    value: [3, 5],
    label: ['Bee', 'Ay'],
  });
  for (const c of data.columns)
    c.source = { tableId: 't', tableName: 'T', dataStartRow: 2 };
  const item = preparePlot(p, data);
  arrangeBands([item]);
  const c = {
    ...createScale({ scale: 'linear' }, -0.5, 1.5)!,
    categories: [
      { key: 's:A', label: 'A' },
      { key: 's:B', label: 'B' },
    ],
  };
  return {
    p,
    data,
    item,
    context: {
      rect: { x: 0, y: 0, width: 200, height: 200 },
      xScale: c,
      yScale: numeric(),
    },
  };
}
it('柱图标签绑定列与重排类别保持原行，并锚定实际柱顶', () => {
  const { p, data, item, context } = setup();
  p.bindings.label = 'slot-label';
  p.dataLabels = { visible: true, source: 'column', position: 'center' };
  const svg = renderBars(item, context, { data, diagnostics: [] });
  expect(svg).toContain('data-source-row="1" transform="translate(150 140)');
  expect(svg).toContain('>Bee</tspan>');
  expect(svg).toContain('data-source-row="2" transform="translate(50 100)');
  expect(svg).toContain('>Ay</tspan>');
});
it('水平堆叠柱图标签显示原值，位置采用累计柱顶及实际基线', () => {
  const { p, data, item, context } = setup();
  p.orientation = 'horizontal';
  p.dataLabels = { visible: true, source: 'y', position: 'center' };
  item.bars[0]!.start = 2;
  item.bars[0]!.end = 5;
  const horizontal = {
    ...context,
    xScale: context.yScale,
    yScale: context.xScale,
  };
  const svg = renderBars(item, horizontal, { data, diagnostics: [] });
  expect(svg).toContain('data-source-row="1" transform="translate(100 50)');
  expect(svg).toContain('>3</tspan>');
  p.dataLabels.anchor = 'baseline';
  expect(renderBars(item, horizontal, { data, diagnostics: [] })).toContain(
    'data-source-row="1" transform="translate(40 50)',
  );
});
it('柱图单点覆盖采用类别和值列身份，标签列源变化时暂停', () => {
  const { p, data, item, context } = setup();
  p.dataLabels = { visible: true, source: 'x', position: 'center' };
  p.labelOverrides = {
    source: labelSourceForPlot(p, data)!,
    points: [
      { row: 1, text: 'chosen' },
      { row: 2, visible: false },
    ],
  };
  const svg = renderBars(item, context, { data, diagnostics: [] });
  expect(svg).toContain('>chosen</tspan>');
  expect(svg.match(/data-role="data-label"/g)).toHaveLength(1);
  data.columns[2]!.values[0] = 'changed';
  const diagnostics: RenderDiagnostic[] = [];
  expect(renderBars(item, context, { data, diagnostics })).toContain(
    '>B</tspan>',
  );
  expect(diagnostics[0]!.message).toContain('暂停');
});
it('面积图跨缺失行保留原行号，基线锚点继承面积基线', () => {
  const p = chartTemplate('area').panels[0]!.plotSlots[0]!;
  if (p.kind !== 'area') throw new Error('fixture');
  p.baseline = 2;
  p.dataLabels = {
    visible: true,
    source: 'row',
    position: 'center',
    anchor: 'baseline',
  };
  const data = chartData({ x: [1, 2, 3, 4, 5], y: [3, 4, null, 5, 6] });
  const item = preparePlot(p, data);
  const context = {
    rect: { x: 0, y: 0, width: 200, height: 200 },
    xScale: numeric(),
    yScale: numeric(),
  };
  const svg = renderArea(item, context, { data, diagnostics: [] });
  expect(svg.match(/data-source-row="\d+"/g)).toEqual([
    'data-source-row="1"',
    'data-source-row="2"',
    'data-source-row="4"',
    'data-source-row="5"',
  ]);
  expect(svg).toContain('translate(80 160)');
  delete p.dataLabels;
  expect(renderArea(item, context, { data, diagnostics: [] })).toBe(
    renderArea(item, context),
  );
});
