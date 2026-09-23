import { expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { preparePlot, arrangeBands } from './charts/prepare.js';
import { renderBars, renderArea } from './charts/svg-marks.js';
import { createScale } from './scales.js';
import { labelSourceForPlot } from './data-labels.js';
import { renderChartDataLabels } from './chart-data-labels.js';

const context = {
  rect: { x: 0, y: 0, width: 200, height: 200 },
  xScale: createScale({ scale: 'linear' }, 0, 10)!,
  yScale: createScale({ scale: 'linear' }, 0, 20)!,
};
it('正式柱图图元与标签分开绘制，类别重排后仍绑定实际柱顶和原值', () => {
  const plot = chartTemplate('bar').panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'bar') throw new Error('fixture');
  plot.dataLabels = { visible: true, source: 'xy', position: 'center' };
  const data = chartData({ category: ['B', 'A'], value: [3, 5] });
  const item = preparePlot(plot, data);
  arrangeBands([item]);
  const categoryContext = {
    ...context,
    xScale: {
      ...createScale({ scale: 'linear' }, -0.5, 1.5)!,
      categories: [
        { key: 's:A', label: 'A' },
        { key: 's:B', label: 'B' },
      ],
    },
  };
  const labels = renderChartDataLabels(item, data, categoryContext);
  expect(labels.svg).toContain('translate(150 170)');
  expect(labels.svg).toContain('>B, 3</tspan>');
  expect(labels.svg).toContain('translate(50 150)');
  expect(renderBars(item, categoryContext)).not.toContain(
    'data-role="data-label"',
  );
});
it('面积图偏移堆叠仅对真实原行标注，标签文字和来源覆盖保持原数据身份', () => {
  const plot = chartTemplate('area').panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'area') throw new Error('fixture');
  plot.baseline = 2;
  plot.dataLabels = {
    visible: true,
    source: 'custom',
    template: '{row}: {x}, {y}',
    position: 'center',
  };
  const data = chartData({ x: [1, 2, 3], y: [3, null, 5] });
  for (const column of data.columns)
    column.source = { tableId: 't', tableName: 'T', dataStartRow: 0 };
  const item = preparePlot(plot, data);
  item.curveGeometry = {
    errorTransform: () => ({
      xOffset: 1,
      yOffset: 4,
      yScale: 2,
      mapY: (value) => value * 2 + 4,
    }),
  };
  let result = renderChartDataLabels(item, data, context);
  expect(result.placed).toBe(2);
  expect(result.svg).toContain('translate(40 100)');
  expect(result.svg).toContain('>1: 1, 3</tspan>');
  expect(result.svg).toContain('>3: 3, 5</tspan>');
  plot.labelOverrides = {
    source: labelSourceForPlot(plot, data)!,
    points: [{ row: 3, text: 'chosen' }],
  };
  result = renderChartDataLabels(item, data, context);
  expect(result.svg).toContain('>chosen</tspan>');
  data.columns[1]!.values[2] = 6;
  result = renderChartDataLabels(item, data, context);
  expect(result.svg).not.toContain('>chosen</tspan>');
  expect(result.diagnostics[0]!.message).toContain('暂停');
});
it('面积图隐式基线继承变换后的基线，显式标签基线采用指定坐标', () => {
  const plot = chartTemplate('area').panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'area') throw new Error('fixture');
  plot.baseline = 2;
  plot.dataLabels = {
    visible: true,
    source: 'y',
    anchor: 'baseline',
    position: 'center',
  };
  const data = chartData({ x: [1, 2], y: [3, 5] });
  const item = preparePlot(plot, data);
  item.curveGeometry = {
    errorTransform: () => ({
      xOffset: 1,
      yOffset: 4,
      yScale: 2,
      mapY: (value) => value * 2 + 4,
    }),
  };
  expect(renderChartDataLabels(item, data, context).svg).toContain(
    'translate(40 120)',
  );
  plot.dataLabels.baseline = 0;
  expect(renderChartDataLabels(item, data, context).svg).toContain(
    'translate(40 200)',
  );
});
it('堆叠共同范围以外的面积原行不生成虚假标签，图元入口不重复生成标签', () => {
  const plot = chartTemplate('area').panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'area') throw new Error('fixture');
  plot.dataLabels = { visible: true, source: 'row', position: 'center' };
  const data = chartData({ x: [1, 2, 3], y: [3, 4, 5] });
  const item = preparePlot(plot, data);
  item.curveGeometry = {
    errorTransform: (row) =>
      row.x === 1
        ? undefined
        : { xOffset: 0, yOffset: 0, yScale: 2, mapY: (value) => value * 2 },
  };
  const result = renderChartDataLabels(item, data, context);
  expect(result.placed).toBe(2);
  expect(result.svg).not.toContain('data-source-row="1"');
  expect(result.svg).toContain('data-source-row="2"');
  expect(renderArea(item, context)).not.toContain('data-role="data-label"');
});
