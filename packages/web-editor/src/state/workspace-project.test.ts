import { describe, expect, it } from 'vitest';
import {
  createDataTable,
  emptyWorkspace,
  appendWorkspaceTables,
  bindTableToPlot,
  updateTableColumn,
} from '@plot-fig/data-binding';
import { defaultTemplate } from './default-template.js';
import { loadCsvText } from './editor-state.js';
import { serializeProjectFile } from './project-file.js';
import { duplicatePanel } from './panel-operations.js';
import { ensurePlotAxis, setYAxisAlignment } from './axis-operations.js';
import {
  serializeWorkspaceProject,
  parseWorkspaceProject,
} from './workspace-project.js';

function workspace() {
  const table = createDataTable({
    tableId: 'a',
    source: { kind: 'csv', name: 'a.csv' },
    rows: [
      ['X', 'Y'],
      ['0', 'bad'],
      ['1', '-999'],
    ],
  });
  const edited = updateTableColumn(table, 'y', {
    settings: { type: 'number', unit: 'N', missingTokens: ['-999'] },
  });
  return appendWorkspaceTables(emptyWorkspace(), [
    edited,
    { ...table, tableId: 'b', name: 'second' },
  ]);
}
describe('workspace project v2', () => {
  it('round trips every raw table and setting even without complete bindings', () => {
    const template = defaultTemplate(),
      data = workspace();
    const text = serializeWorkspaceProject(template, data);
    expect(JSON.parse(text).version).toBe('2.0.0');
    expect(parseWorkspaceProject(text)).toEqual({
      ok: true,
      template,
      workspace: data,
    });
    expect(serializeWorkspaceProject(template, data)).toBe(text);
  });
  it('preserves scoped bindings and migrates legacy CSV projects', () => {
    const template = defaultTemplate();
    const data = bindTableToPlot(workspace(), template, {
      plotSlotId: template.panels[0]!.plotSlots[0]!.plotSlotId,
      tableId: 'b',
    });
    expect(
      parseWorkspaceProject(serializeWorkspaceProject(template, data)),
    ).toMatchObject({
      ok: true,
      workspace: {
        slotBindings: { 'slot-y': { tableId: 'b', columnId: 'y' } },
      },
    });
    const csv = 'X,Y\n0,1\n1,2';
    const oldState = loadCsvText(csv, 'old.csv');
    const old = serializeProjectFile(template, oldState.data!, csv);
    const migrated = parseWorkspaceProject(old);
    expect(migrated).toMatchObject({
      ok: true,
      workspace: {
        tables: [{ source: { name: 'old.csv' } }],
        slotBindings: { 'slot-x': { tableId: 'source-1', columnId: 'x' } },
      },
    });
  });
  it('rejects invalid settings, duplicate ids, dangling references and malformed data', () => {
    const valid = JSON.parse(
      serializeWorkspaceProject(defaultTemplate(), workspace()),
    );
    const mutations = [
      (p: typeof valid) => {
        p.workspace.tables[0].columns[0].settings.utcOffsetMinutes = 9999;
      },
      (p: typeof valid) => {
        p.workspace.tables[1].tableId = 'a';
      },
      (p: typeof valid) => {
        p.workspace.activeTableId = 'missing';
      },
      (p: typeof valid) => {
        p.workspace.slotBindings['slot-x'] = {
          tableId: 'a',
          columnId: 'missing',
        };
      },
      (p: typeof valid) => {
        p.workspace.tables[0].rows[1][0] = {};
      },
      (p: typeof valid) => {
        p.template.panels = [];
      },
      (p: typeof valid) => {
        p.version = '99.0.0';
      },
    ];
    for (const mutate of mutations) {
      const bad = structuredClone(valid);
      mutate(bad);
      expect(parseWorkspaceProject(JSON.stringify(bad)).ok).toBe(false);
    }
    expect(parseWorkspaceProject('{').ok).toBe(false);
  });

  it('round trips independent four-side axes and an empty layer without losing publication objects', () => {
    const template = defaultTemplate();
    const first = template.panels[0]!;
    template.annotations.push({
      annotationId: 'reference-kept',
      kind: 'reference-line',
      coordinateSpace: 'data',
      panelId: first.panelId,
      xAxisId: 'axis-x',
      yAxisId: 'axis-y',
      orientation: 'y',
      value: 0.5,
    });
    first.axes.find((axis) => axis.axisId === 'frame-x')!.extensions = {
      origin: { customLabel: '原始轴元信息' },
    };
    const source = duplicatePanel(
      { template, workspace: workspace() },
      first.panelId,
    );
    const second = source.template.panels[1]!;
    second.plotSlots = [];
    second.frame.width = 0.3;
    second.clip = false;
    const top = second.axes.find((axis) => axis.position === 'top')!;
    top.range = { mode: 'fixed', min: -0.125, max: 0.375 };
    top.tickLabels.visible = true;
    const right = second.axes.find((axis) => axis.position === 'right')!;
    right.range = { mode: 'fixed', min: 0.001, max: 0.01 };
    right.line.color = '#123456';
    source.template.metadata.name = '已修改对象的项目';
    source.template.page.size.width.value = 220;
    const beforeSave = structuredClone(source);

    const text = serializeWorkspaceProject(source.template, source.workspace);
    const reopened = parseWorkspaceProject(text);
    expect(reopened).toEqual({
      ok: true,
      template: beforeSave.template,
      workspace: beforeSave.workspace,
    });
    expect(source).toEqual(beforeSave);
    if (!reopened.ok) throw new Error('project should reopen');
    expect(reopened.template.schemaVersion).toBe('1.22.0');
    expect(reopened.template.panels[0]).toEqual(beforeSave.template.panels[0]);
    expect(reopened.template.panels[1]!.plotSlots).toEqual([]);
    expect(reopened.template.annotations).toEqual(
      beforeSave.template.annotations,
    );
    expect(
      JSON.parse(
        serializeWorkspaceProject(reopened.template, reopened.workspace),
      ),
    ).toEqual(JSON.parse(text));
  });

  it('round trips a right-axis curve binding and common-value alignment', () => {
    const template = defaultTemplate();
    const panel = template.panels[0]!;
    panel.axes = panel.axes.filter((axis) => axis.position !== 'right');
    panel.plotSlots.push({
      ...structuredClone(panel.plotSlots[0]!),
      plotSlotId: 'series-right',
      legendEntry: { visible: true, text: 'Right' },
    });
    const withRight = ensurePlotAxis(
      template,
      panel.panelId,
      'series-right',
      'right',
    );
    const aligned = setYAxisAlignment(withRight, panel.panelId, 0);

    const text = serializeWorkspaceProject(aligned, workspace());
    const reopened = parseWorkspaceProject(text);

    expect(reopened.ok).toBe(true);
    if (!reopened.ok) throw new Error('dual-axis project should reopen');
    const reopenedPanel = reopened.template.panels[0]!;
    const right = reopenedPanel.axes.find((axis) => axis.position === 'right')!;
    expect(reopened.template.schemaVersion).toBe('1.22.0');
    expect(reopenedPanel.yAxisAlignment).toEqual({
      leftAxisId: 'axis-y',
      rightAxisId: right.axisId,
      value: 0,
    });
    expect(reopenedPanel.plotSlots[0]!.yAxisId).toBe('axis-y');
    expect(reopenedPanel.plotSlots[1]!.yAxisId).toBe(right.axisId);
    expect(reopenedPanel.axes).toEqual(aligned.panels[0]!.axes);
  });
});
