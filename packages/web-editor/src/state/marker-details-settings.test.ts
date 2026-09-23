import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import type { MarkerDetails, XyPlot } from '@plot-fig/figure-schema';
import { defaultTemplate } from './default-template.js';
import { importTables, changeSeries } from './workspace-editor.js';
import { applyBatchProperties } from './batch-properties.js';
import { duplicatePanel } from './panel-operations.js';
import { movePlotToPanel } from './plot-panel-operations.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
const details: MarkerDetails = {
  fixedSize: { value: 0.5, unit: 'x-data' },
  strokeRadiusPct: 0,
  fillOnlyOpacity: true,
  character: {
    mode: 'sequence',
    alphabet: 'ABC',
    fontFamily: 'Arial',
    outline: 'circle',
  },
  overlap: { direction: 'horizontal', gapPt: 2, center: true },
  legend: { rows: [1, 3], sizePt: 12 },
};
function model() {
  const m = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 't',
        source: { kind: 'csv', name: 'data.csv' },
        rows: [
          ['X', 'Y'],
          ['1', '2'],
          ['2', '3'],
          ['2', '3'],
        ],
      }),
    ],
  );
  const p = m.template.panels[0]!.plotSlots[0]! as XyPlot;
  p.markerDetails = structuredClone(details);
  p.legendEntry.visible = true;
  return m;
}
it('曲线与图层复制、跨层移动、项目重开保留六类属性', () => {
  let m = changeSeries(model(), 'duplicate', 'series-1');
  expect((m.template.panels[0]!.plotSlots[1]! as XyPlot).markerDetails).toEqual(
    details,
  );
  m = duplicatePanel(m, m.template.panels[0]!.panelId);
  const target = m.template.panels[1]!;
  m = movePlotToPanel(m, 'series-1', {
    panelId: target.panelId,
    xAxisId: target.axes.find((a) => a.dimension === 'x')!.axisId,
    yAxisId: target.axes.find((a) => a.dimension === 'y')!.axisId,
  });
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(m.template, m.workspace),
  );
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) return;
  for (const p of reopened.template.panels.flatMap((p) => p.plotSlots))
    expect((p as XyPlot).markerDetails).toEqual(details);
  const r = renderFigureSvg(
    reopened.template,
    bindWorkspace(reopened.template, reopened.workspace),
    { purpose: 'export' },
  );
  expect(r.ok, JSON.stringify(r.diagnostics)).toBe(true);
  if (r.ok) expect(r.svg).toContain('data-source-row="3"');
});
it('批量单项修改保留其他细节、列绑定和独立轴；恢复后删除空对象', () => {
  const m = changeSeries(model(), 'duplicate', 'series-1'),
    p = m.template.panels[0]!,
    a = { kind: 'plot' as const, panelId: p.panelId, plotSlotId: 'series-1' },
    b = { ...a, plotSlotId: p.plotSlots[1]!.plotSlotId };
  let t = applyBatchProperties(m.template, {
    source: a,
    targets: [b],
    edits: { 'plot-marker-details.strokeRadiusPct': 75 },
  });
  expect((t.panels[0]!.plotSlots[1]! as XyPlot).markerDetails).toEqual({
    ...details,
    strokeRadiusPct: 75,
  });
  expect(t.panels[0]!.plotSlots[1]!.bindings).toEqual(p.plotSlots[1]!.bindings);
  t = applyBatchProperties(t, {
    source: a,
    targets: [b],
    groups: ['plot-marker-details'],
  });
  expect((t.panels[0]!.plotSlots[1]! as XyPlot).markerDetails).toEqual(details);
  t = applyBatchProperties(t, {
    source: a,
    targets: [b],
    edits: Object.fromEntries(
      Object.keys(details).map((k) => ['plot-marker-details.' + k, undefined]),
    ),
  });
  expect((t.panels[0]!.plotSlots[1]! as XyPlot).markerDetails).toBeUndefined();
  expect(() =>
    applyBatchProperties(m.template, {
      source: a,
      targets: [b],
      edits: { 'plot-marker-details.fixedSize': { value: -1, unit: 'x-data' } },
    }),
  ).toThrow();
  expect((m.template.panels[0]!.plotSlots[1]! as XyPlot).markerDetails).toEqual(
    details,
  );
});
