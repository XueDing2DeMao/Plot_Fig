import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import type { XyPlot } from '@plot-fig/figure-schema';
import { markerSourceForPlot } from '@plot-fig/svg-renderer';
import { defaultTemplate } from './default-template.js';
import { importTables, changeSeries } from './workspace-editor.js';
import { applyBatchProperties } from './batch-properties.js';
import { configureF4Binding, f4BindingColumns } from './f4-bindings.js';
import { duplicatePanel } from './panel-operations.js';
const ref = (plotSlotId: string) => ({
  kind: 'plot' as const,
  panelId: 'panel-main',
  plotSlotId,
});
function model() {
  return changeSeries(
    importTables({ template: defaultTemplate(), workspace: emptyWorkspace() }, [
      createDataTable({
        tableId: 't',
        source: { kind: 'csv', name: 'f4.csv' },
        rows: [
          ['X', 'Y', 'C'],
          ['0', '2', '1'],
          ['1', '4', '2'],
        ],
      }),
    ]),
    'duplicate',
    'series-1',
  );
}
it('F4 批量样式保持各曲线绑定，单点标签限制同源，整组重置移除可选字段', () => {
  const m = model(),
    first = m.template.panels[0]!.plotSlots[0] as XyPlot,
    data = bindWorkspace(m.template, m.workspace);
  first.lineMapping = { mode: 'increment', colors: ['#ff0000', '#0000ff'] };
  first.dataLabels = { visible: true, source: 'y' };
  first.subset = { mode: 'length', length: 2, breakConnection: true };
  first.transform = { offsetY: { mode: 'constant', value: 3 } };
  first.labelOverrides = {
    source: markerSourceForPlot(first, data)!,
    points: [{ row: 1, text: 'first' }],
  };
  const groups = [
    'plot-line-mapping',
    'plot-data-labels',
    'plot-label-overrides',
    'plot-subset',
    'plot-transform',
  ];
  const next = applyBatchProperties(
      m.template,
      { source: ref('series-1'), targets: [ref('series-2')], groups },
      data,
    ),
    second = next.panels[0]!.plotSlots[1] as XyPlot;
  expect(second.lineMapping).toEqual(first.lineMapping);
  expect(second.bindings).toEqual(m.template.panels[0]!.plotSlots[1]!.bindings);
  expect(second.transform).toEqual(first.transform);
  expect(second.labelOverrides).toEqual(first.labelOverrides);
  const changed = structuredClone(data);
  changed.columns[1]!.values[0] = 9;
  expect(() =>
    applyBatchProperties(
      m.template,
      {
        source: ref('series-1'),
        targets: [ref('series-2')],
        groups: ['plot-label-overrides'],
      },
      changed,
    ),
  ).toThrow(/同源/);
  const cleared = applyBatchProperties(
    next,
    {
      source: ref('series-1'),
      targets: [ref('series-2')],
      edits: {
        'plot-data-labels.dataLabels': undefined,
        'plot-line-mapping.lineMapping': undefined,
        'plot-transform.transform': undefined,
      },
    },
    data,
  );
  const clear = cleared.panels[0]!.plotSlots[1] as XyPlot;
  expect(clear.dataLabels).toBeUndefined();
  expect(clear.lineMapping).toBeUndefined();
  expect(clear.transform).toBeUndefined();
});
it('图层组和堆叠批量复制按同层曲线位置映射且不遗留来源 ID', () => {
  const m = model(),
    source = m.template.panels[0]!;
  source.groups = [
    {
      groupId: 'g',
      name: '组',
      members: ['series-1', 'series-2'],
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
    },
  ];
  source.stack = { mode: 'normal', members: ['series-1', 'series-2'] };
  const n = duplicatePanel(m, source.panelId),
    target = n.template.panels[1]!;
  delete target.groups;
  delete target.stack;
  const next = applyBatchProperties(
    n.template,
    {
      source: { kind: 'panel', panelId: source.panelId },
      targets: [{ kind: 'panel', panelId: target.panelId }],
      groups: ['panel-curve-groups', 'panel-stack'],
    },
    bindWorkspace(n.template, n.workspace),
  );
  expect(next.panels[1]!.groups?.[0]?.members).toEqual(
    target.plotSlots.map((p) => p.plotSlotId),
  );
  expect(next.panels[1]!.stack?.members).toEqual(
    target.plotSlots.map((p) => p.plotSlotId),
  );
});
it('F4 独立线色、标签及分组列真实绑定并清理独立数据槽', () => {
  let m = model();
  const plot = m.template.panels[0]!.plotSlots[0] as XyPlot,
    columns = f4BindingColumns(m, plot),
    c = columns.find((c) => c.name === 'C')!;
  for (const role of ['lineColor', 'label', 'group'] as const)
    m = configureF4Binding(m, plot.plotSlotId, role, c.columnId);
  const current = m.template.panels[0]!.plotSlots[0] as XyPlot,
    data = bindWorkspace(m.template, m.workspace);
  expect(data.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(
    0,
  );
  for (const role of ['lineColor', 'label', 'group'] as const)
    expect(
      data.bindings.find((b) => b.dataSlotId === current.bindings[role])
        ?.columnId,
    ).toBe(c.columnId);
  const old = current.bindings.lineColor!;
  m = configureF4Binding(m, plot.plotSlotId, 'lineColor', '');
  expect(m.template.dataSlots.some((s) => s.dataSlotId === old)).toBe(false);
  expect(m.workspace.slotBindings[old]).toBeUndefined();
});
it('批量解除组依赖保留每条成员曲线的当前样式', () => {
  const m = model(),
    panel = m.template.panels[0]!;
  panel.groups = [
    {
      groupId: 'g',
      name: '组',
      members: ['series-1', 'series-2'],
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
      colors: ['#ff0000', '#0000ff'],
    },
  ];
  const source = { kind: 'panel' as const, panelId: panel.panelId };
  const next = applyBatchProperties(
    m.template,
    {
      source,
      targets: [source],
      edits: {
        'panel-curve-groups.groups': [
          { ...panel.groups[0]!, mode: 'independent' },
        ],
      },
    },
    bindWorkspace(m.template, m.workspace),
  );
  expect((next.panels[0]!.plotSlots[1] as XyPlot).lineStyle?.color).toBe(
    '#0000ff',
  );
});
