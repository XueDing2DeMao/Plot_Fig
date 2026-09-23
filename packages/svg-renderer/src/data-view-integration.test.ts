import { expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { createCurrentDocument } from '../../../tests/helpers/figure-payloads.js';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { loadFigurePayload } from '@plot-fig/figure-migrations';
import {
  renderFigureSvg,
  figureCoordinates,
  rescaleFigureRanges,
  prepareXyData,
} from './index.js';

function setup(x = [0, 1, 2, 3, 4, 5], y = [0, 2, 50, 3, 4, 5]) {
  const template = chartTemplate('xy'),
    plot = template.panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('XY');
  plot.mode = 'line-markers';
  for (const axis of template.panels[0]!.axes) {
    axis.range = { mode: 'auto' };
    delete axis.compatibility;
    delete axis.rescale;
  }
  return { template, plot, data: chartData({ x, y }) };
}
function output(...args: Parameters<typeof renderFigureSvg>) {
  const r = renderFigureSvg(...args);
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
  return r.svg;
}
const markers = (svg: string) => svg.match(/data-role="marker"/g)?.length ?? 0;
const lines = (svg: string) =>
  (svg.match(/<g data-role="plot-slot"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? '').match(
    /<path d=/g,
  )?.length ?? 0;
it('1.13模板/document仅升版本，不添加数据视图，也不能伪装新字段', () => {
  for (const value of [setup().template, createCurrentDocument()]) {
    Object.assign(value, { schemaVersion: '1.13.0' });
    if (value.kind === 'figure-document')
      Object.assign(value.templateSnapshot, { schemaVersion: '1.13.0' });
    const before = structuredClone(value),
      expected = structuredClone(value);
    Object.assign(expected, { schemaVersion: '1.21.0' });
    if (expected.kind === 'figure-document')
      Object.assign(expected.templateSnapshot, { schemaVersion: '1.21.0' });
    expect(loadFigurePayload(value)).toMatchObject({
      ok: true,
      value: expected,
    });
    expect(value).toEqual(before);
    Object.assign(
      (value.kind === 'figure-template' ? value : value.templateSnapshot)
        .panels[0]!.plotSlots[0]!,
      { dataView: { sort: 'none' } },
    );
    expect(loadFigurePayload(value).ok).toBe(false);
  }
});
it('显示抽样与完整导出分离，raw自动范围不被抽样或行范围改变', () => {
  const { template, plot, data } = setup();
  const before = figureCoordinates(template, data);
  plot.dataView = {
    rowRange: { from: 4, to: 6 },
    sampling: { mode: 'every', step: 2 },
  };
  expect(markers(output(template, data))).toBe(2);
  expect(markers(output(template, data, { purpose: 'export' }))).toBe(3);
  const scale = (t: typeof template) =>
    figureCoordinates(t, data)
      .panels.get(t.panels[0]!.panelId)!
      .scales.get(plot.yAxisId)!;
  expect(scale(template).max).toBe(
    before.panels.get(template.panels[0]!.panelId)!.scales.get(plot.yAxisId)!
      .max,
  );
  plot.dataView.calculationSource = 'selected';
  expect(scale(template).max).toBeLessThan(10);
  plot.dataView.sampleExport = true;
  expect(markers(output(template, data, { purpose: 'export' }))).toBe(2);
});
it('先按缺口分段，再稳定排序去重，段间不能因连线/闭合/抽样重连', () => {
  const { template, plot, data } = setup(
    [3, 1, 1, 2, 6, 4, 5],
    [3, 1, 2, NaN, 6, 4, 5],
  );
  plot.dataView = {
    missing: 'break',
    sort: 'x-ascending',
    duplicates: 'last',
    sampling: { mode: 'count', count: 4, keepFirst: true, keepLast: true },
  };
  plot.closeLine = true;
  const svg = output(template, data);
  expect(markers(svg)).toBe(4);
  expect(lines(svg)).toBe(2);
  expect(markers(output(template, data, { purpose: 'export' }))).toBe(5);
  plot.dataView.sampling = {
    mode: 'count',
    count: 3,
    keepFirst: true,
    keepLast: true,
  };
  plot.mode = 'markers';
  expect(renderFigureSvg(template, data).ok).toBe(false);
});
it('样条检查完整处理后样本，排序可修复原始乱序；抽样不能隐藏重复X错误', () => {
  const { template, plot, data } = setup([3, 1, 2, 2], [3, 1, 2, 4]);
  plot.lineConnection = 'spline';
  plot.dataView = { sort: 'x-ascending', duplicates: 'last' };
  expect(renderFigureSvg(template, data).ok).toBe(true);
  plot.dataView.duplicates = 'keep';
  plot.dataView.sampling = { mode: 'count', count: 2 };
  expect(renderFigureSvg(template, data).ok).toBe(false);
  plot.dataView.duplicates = 'last';
  plot.dataView.sort = 'x-descending';
  expect(renderFigureSvg(template, data).ok).toBe(false);
});
it('上/右对数轴的无效点先断开，selected计算排除无效原行，反向不改排序规则', () => {
  const { template, plot, data } = setup([1, 2, 3, 4, 5], [1, 2, 0, 4, 5]);
  const panel = template.panels[0]!;
  const axis = panel.axes.find((a) => a.axisId === plot.yAxisId)!;
  axis.position = 'right';
  axis.scale = 'log10';
  axis.reverse = true;
  plot.dataView = { missing: 'break', calculationSource: 'selected' };
  const svg = output(template, data);
  expect(markers(svg)).toBe(4);
  expect(lines(svg)).toBe(2);
  expect(
    figureCoordinates(template, data)
      .panels.get(panel.panelId)!
      .scales.get(plot.xAxisId)!.max,
  ).toBeGreaterThanOrEqual(5);
});
it('采样后的误差仍取原行，计算范围使用完整所选行及其误差端点', () => {
  const { template, plot } = setup();
  plot.dataView = {
    rowRange: { from: 2, to: 5 },
    sort: 'x-descending',
    sampling: { mode: 'every', step: 2 },
    calculationSource: 'selected',
  };
  template.dataSlots.push({
    dataSlotId: 'slot-yError',
    name: 'error',
    role: 'yError',
    valueType: 'number',
    required: false,
  });
  plot.bindings.yError = 'slot-yError';
  plot.errorBarStyle = {
    visible: true,
    color: '#123456',
    widthPt: 1,
    capWidthPt: 4,
  };
  const data = chartData({
    x: [0, 1, 2, 3, 4, 5],
    y: [0, 10, 20, 30, 40, 50],
    yError: [100, 1, 2, 3, 4, 100],
  });
  const svg = output(template, data);
  expect(markers(svg)).toBe(2);
  expect(svg.match(/data-role="error-bar"/g)).toHaveLength(2);
  const scale = figureCoordinates(template, data)
    .panels.get(template.panels[0]!.panelId)!
    .scales.get(plot.yAxisId)!;
  expect(scale.max).toBeGreaterThanOrEqual(44);
  expect(scale.max).toBeLessThan(100);
});
it('抽样不能隐藏完整样条映射后重合或数值不稳定的坐标', () => {
  const { template, plot, data } = setup([0, 1e-20, 1], [0, 1, 0]);
  plot.lineConnection = 'spline';
  plot.dataView = { sampling: { mode: 'count', count: 2 } };
  for (const purpose of ['display', 'export'] as const)
    expect(renderFigureSvg(template, data, { purpose }).ok).toBe(false);
});
it.each([
  { rowRange: { from: 3, to: 1 } },
  { sampling: { mode: 'every', step: 0 } },
  { sampling: { mode: 'count', count: 1.5 } },
  { unknown: true },
])('schema拒绝非法数据视图%j', (dataView) => {
  const { template, plot } = setup();
  Object.assign(plot, { dataView });
  expect(validateFigureTemplate(template).ok).toBe(false);
});
it('处理视图变化只触发相关独立轴的自动窗口，抽样不触发', () => {
  const { template, plot, data } = setup();
  const y = template.panels[0]!.axes.find((a) => a.axisId === plot.yAxisId)!;
  y.rescale = { mode: 'auto' };
  y.range = { mode: 'fixed', min: 0, max: 60 };
  const candidate = structuredClone(template);
  Object.assign(candidate.panels[0]!.plotSlots[0]!, {
    dataView: { rowRange: { from: 4, to: 6 }, calculationSource: 'selected' },
  });
  const r = rescaleFigureRanges({
    before: template,
    candidate,
    beforeData: data,
    data,
    reason: 'change',
  });
  expect(
    r.template.panels[0]!.axes.find((a) => a.axisId === y.axisId)!.range,
  ).not.toEqual(y.range);
});
it('非对称误差在排序去重后仍使用原始上下端点，完整计算不丢失抽样外端点', () => {
  const { template, plot } = setup();
  plot.dataView = {
    sort: 'x-descending',
    duplicates: 'last',
    sampling: { mode: 'every', step: 2 },
    calculationSource: 'selected',
  };
  plot.errorBarStyle = {
    visible: true,
    color: '#123456',
    widthPt: 1,
    capWidthPt: 4,
  };
  for (const role of ['yErrorLower', 'yErrorUpper'] as const) {
    template.dataSlots.push({
      dataSlotId: 'slot-' + role,
      name: role,
      role,
      valueType: 'number',
      required: false,
    });
    plot.bindings[role] = 'slot-' + role;
  }
  const data = chartData({
    x: [1, 2, 2, 3],
    y: [10, 100, 20, 30],
    yErrorLower: [1, 100, 2, 3],
    yErrorUpper: [4, 100, 50, 6],
  });
  expect(
    prepareXyData(plot, data, template.panels[0]!.axes)
      .displaySegments.flat()
      .map((r) => r.sourceIndex),
  ).toEqual([3, 0]);
  const svg = output(template, data);
  expect(svg.match(/data-role="error-bar"/g)).toHaveLength(2);
  expect(
    output(template, data, { purpose: 'export' }).match(
      /data-role="error-bar"/g,
    ),
  ).toHaveLength(3);
  const scale = figureCoordinates(template, data)
    .panels.get(template.panels[0]!.panelId)!
    .scales.get(plot.yAxisId)!;
  expect(scale.max).toBeGreaterThanOrEqual(70);
  expect(scale.max).toBeLessThan(100);
  expect(scale.min).toBeLessThanOrEqual(9);
});
it('同层来自不同表的两条曲线各自选行，各自的上下/左右轴保持独立', () => {
  const { template, plot, data } = setup([1, 2, 3], [10, 20, 30]),
    panel = template.panels[0]!;
  plot.dataView = {
    rowRange: { from: 2, to: 3 },
    calculationSource: 'selected',
  };
  for (const column of data.columns)
    column.source = { tableId: 'first', tableName: 'First', dataStartRow: 2 };
  const other = structuredClone(plot);
  other.plotSlotId = 'other';
  other.xAxisId = 'top-x';
  other.yAxisId = 'right-y';
  other.bindings = { x: 'other-x', y: 'other-y' };
  other.dataView = {
    rowRange: { from: 1, to: 2 },
    sampling: { mode: 'count', count: 1 },
    calculationSource: 'selected',
  };
  panel.plotSlots.push(other);
  for (const role of ['x', 'y'] as const) {
    const axis = structuredClone(panel.axes.find((a) => a.dimension === role)!);
    axis.axisId = role === 'x' ? 'top-x' : 'right-y';
    axis.position = role === 'x' ? 'top' : 'right';
    panel.axes.push(axis);
    template.dataSlots.push({
      dataSlotId: 'other-' + role,
      name: role,
      role,
      valueType: 'number',
      required: true,
    });
    data.columns.push({
      columnId: 'other-' + role,
      name: role,
      index: data.columns.length,
      valueType: 'number',
      values: role === 'x' ? [100, 200, 300] : [1000, 2000, 3000],
      source: { tableId: 'second', tableName: 'Second', dataStartRow: 5 },
    });
    data.bindings.push({
      dataSlotId: 'other-' + role,
      columnId: 'other-' + role,
      status: 'valid',
    });
  }
  const scales = figureCoordinates(template, data).panels.get(
    panel.panelId,
  )!.scales;
  expect(scales.get(plot.yAxisId)!.max).toBeLessThan(100);
  expect(scales.get(other.yAxisId)!.max).toBeGreaterThanOrEqual(2000);
  expect(scales.get(other.yAxisId)!.max).toBeLessThan(3000);
  expect(markers(output(template, data))).toBe(3);
  expect(markers(output(template, data, { purpose: 'export' }))).toBe(4);
  const first = prepareXyData(plot, data, panel.axes),
    second = prepareXyData(other, data, panel.axes);
  expect(first.selectedRows[0]!.identity).not.toEqual(
    second.selectedRows[0]!.identity,
  );
});
