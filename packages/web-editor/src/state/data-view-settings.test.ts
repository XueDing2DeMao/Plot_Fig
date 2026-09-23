import { expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import type { XyPlot, XyDataView } from '@plot-fig/figure-schema';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { applyBatchProperties, batchCommonValue } from './batch-properties.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { duplicateSeries } from './series-operations.js';
import { duplicatePanel } from './panel-operations.js';
import { movePlotToPanel } from './plot-panel-operations.js';
import { rescaleFigureRanges } from '@plot-fig/svg-renderer';
const view: XyDataView = {
  rowRange: { from: 2, to: 5 },
  missing: 'break',
  sort: 'x-ascending',
  duplicates: 'last',
  sampling: { mode: 'count', count: 2, keepFirst: true, keepLast: true },
  sampleExport: true,
  calculationSource: 'selected',
};
function setup() {
  const template = chartTemplate('xy'),
    panel = template.panels[0]!,
    first = panel.plotSlots[0] as XyPlot;
  first.dataView = structuredClone(view);
  const other = structuredClone(first);
  other.plotSlotId = 'other';
  other.dataView = { sort: 'x-descending' };
  panel.plotSlots.push(other);
  const source = {
    kind: 'plot' as const,
    panelId: panel.panelId,
    plotSlotId: first.plotSlotId,
  };
  return { template, source, target: { ...source, plotSlotId: 'other' } };
}
it('完整保存与重开数据视图，复制曲线、复制图层、移到另一层均保留独立值', () => {
  const { template, source } = setup(),
    json = serializeWorkspaceProject(template, emptyWorkspace());
  expect(JSON.parse(json)).toMatchObject({
    version: '2.0.0',
    template: { schemaVersion: '1.22.0' },
  });
  expect(parseWorkspaceProject(json)).toMatchObject({ ok: true, template });
  const copy = duplicateSeries(template, {}, source.plotSlotId);
  expect(copy.ok).toBe(true);
  if (copy.ok) {
    const plot = copy.value.template.panels[0]!.plotSlots.at(-1) as XyPlot;
    expect(plot.dataView).toEqual(view);
    plot.dataView!.rowRange!.from = 1;
    expect((template.panels[0]!.plotSlots[0] as XyPlot).dataView).toEqual(view);
  }
  const layers = duplicatePanel(
      { template, workspace: emptyWorkspace() },
      source.panelId,
    ),
    destination = layers.template.panels.at(-1)!;
  expect((destination.plotSlots[0] as XyPlot).dataView).toEqual(view);
  const moved = movePlotToPanel(layers, source.plotSlotId, {
    panelId: destination.panelId,
    xAxisId: destination.axes[0]!.axisId,
    yAxisId: destination.axes[1]!.axisId,
  });
  expect(
    (
      moved.template.panels
        .at(-1)!
        .plotSlots.find((p) => p.plotSlotId === source.plotSlotId) as XyPlot
    ).dataView,
  ).toEqual(view);
});
it('批量复制完整数据规则，清除原子对象，不改绑定、轴或源对象', () => {
  const { template, source, target } = setup(),
    before = structuredClone(template);
  expect(
    batchCommonValue(template, [source, target], 'plot-data-view.rowRange'),
  ).toEqual({ mixed: true });
  const next = applyBatchProperties(template, {
    source,
    targets: [target],
    groups: ['plot-data-view'],
  });
  expect((next.panels[0]!.plotSlots[1] as XyPlot).dataView).toEqual(view);
  expect(next.panels[0]!.plotSlots[1]!.bindings).toEqual(
    template.panels[0]!.plotSlots[1]!.bindings,
  );
  expect(next.panels[0]!.axes).toEqual(template.panels[0]!.axes);
  const reset = applyBatchProperties(next, {
    source,
    targets: [target],
    edits: {
      'plot-data-view.sampling': undefined,
      'plot-data-view.rowRange': undefined,
    },
  });
  expect((reset.panels[0]!.plotSlots[1] as XyPlot).dataView).toEqual({
    missing: 'break',
    sort: 'x-ascending',
    duplicates: 'last',
    calculationSource: 'selected',
  });
  expect(template).toEqual(before);
});
it('非法范围及不足端点额度的批量请求整体拒绝，不部分修改', () => {
  const { template, source, target } = setup(),
    before = structuredClone(template),
    data = chartData({ x: [1, 2, 3, 4, 5], y: [1, 2, 3, 4, 5] });
  for (const patch of [
    { rowRange: { from: 3, to: 1 } },
    { sampling: { mode: 'count', count: 1, keepFirst: true, keepLast: true } },
  ])
    expect(() =>
      applyBatchProperties(
        template,
        {
          source,
          targets: [source, target],
          edits: Object.fromEntries(
            Object.entries(patch).map(([k, v]) => ['plot-data-view.' + k, v]),
          ),
        },
        data,
      ),
    ).toThrow();
  expect(template).toEqual(before);
});
it('批量所选计算范围在草稿中立即重算，与最终应用一致，抽样不改自动窗口', () => {
  const { template, source, target } = setup();
  for (const axis of template.panels[0]!.axes) {
    axis.range = { mode: 'fixed', min: 0, max: 60 };
    axis.rescale = { mode: 'auto' };
    delete axis.compatibility;
  }
  const data = chartData({ x: [0, 1, 2, 3, 4, 5], y: [0, 1, 50, 3, 4, 5] }),
    next = applyBatchProperties(
      template,
      {
        source,
        targets: [source, target],
        edits: {
          'plot-data-view.rowRange': { from: 4, to: 6 },
          'plot-data-view.calculationSource': 'selected',
        },
      },
      data,
    );
  const expected = rescaleFigureRanges({
    before: template,
    candidate: next,
    beforeData: data,
    data,
    reason: 'change',
  }).template;
  expect(next.panels[0]!.axes).toEqual(expected.panels[0]!.axes);
  expect(next.panels[0]!.axes[1]!.range).toMatchObject({ min: 3, max: 5 });
  const sample = applyBatchProperties(
    next,
    {
      source,
      targets: [source, target],
      edits: { 'plot-data-view.sampling': { mode: 'every', step: 1 } },
    },
    data,
  );
  expect(sample.panels[0]!.axes).toEqual(next.panels[0]!.axes);
});
