import { expect, it } from 'vitest';
import {
  createDataTable,
  emptyWorkspace,
  appendWorkspaceTables,
  bindTableToPlot,
  bindWorkspace,
} from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import {
  serializeWorkspaceProject,
  parseWorkspaceProject,
} from './workspace-project.js';
import { serializeProjectFile } from './project-file.js';
import { loadCsvText } from './editor-state.js';
import { defaultTemplate } from './default-template.js';
import { createProjectFile, parseProjectFile } from './project-file.js';
import { chartData } from '../../../../tests/helpers/chart-fixtures.js';

it('reports the source table, column and raw row for duplicate bar categories', () => {
  const template = chartTemplate('bar');
  const table = createDataTable({
    tableId: 't',
    source: { kind: 'csv', name: 'duplicates.csv' },
    rows: [
      ['category', 'value'],
      [1, 2],
      [1, 3],
    ],
  });
  const workspace = bindTableToPlot(
    appendWorkspaceTables(emptyWorkspace(), [table]),
    template,
    { plotSlotId: 'series-1', tableId: 't' },
  );
  const result = renderFigureSvg(template, bindWorkspace(template, workspace));
  expect(result.ok).toBe(false);
  expect(result.diagnostics[0]!.message).toMatch(
    /duplicates.*category.*源第 3 行.*重复类别/,
  );
});

it('accepts numeric categories in a current FigureDocument descriptor', () => {
  const project = createProjectFile(
    chartTemplate('bar'),
    chartData({ category: [1, 2], value: [3, 4] }),
    'category,value\n1,3\n2,4',
  );
  expect(parseProjectFile(JSON.stringify(project)).ok).toBe(true);
});

it.each(['bar', 'histogram', 'box', 'area', 'heatmap', 'contour'])(
  'restores bound %s data, parameters and an identical SVG',
  (kind) => {
    const template = chartTemplate(kind);
    const rows = ['heatmap', 'contour'].includes(kind)
      ? [
          ['x', 'y', 'z'],
          [0, 0, 0],
          [1, 0, 1],
          [0, 1, 2],
          [1, 1, 3],
        ]
      : [
          ['x', 'y'],
          [0, 1],
          [1, 2],
          [2, 3],
        ];
    const table = createDataTable({
      tableId: 't',
      source: { kind: 'csv', name: 'source.csv' },
      rows,
    });
    const workspace = bindTableToPlot(
      appendWorkspaceTables(emptyWorkspace(), [table]),
      template,
      { plotSlotId: 'series-1', tableId: 't' },
    );
    const original = renderFigureSvg(
      template,
      bindWorkspace(template, workspace),
    );
    expect(original.ok).toBe(true);
    const loaded = parseWorkspaceProject(
      serializeWorkspaceProject(template, workspace),
    );
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.workspace).toEqual(workspace);
    expect(
      renderFigureSvg(
        loaded.template,
        bindWorkspace(loaded.template, loaded.workspace),
      ),
    ).toEqual(original);
  },
);

it('migrates real 1.0 snapshots inside both legacy CSV and workspace project envelopes', () => {
  const template = defaultTemplate(),
    csv = 'X,Y\n0,1\n1,2';
  const oldData = loadCsvText(csv, 'legacy.csv').data!;
  const legacy = JSON.parse(serializeProjectFile(template, oldData, csv));
  legacy.document.schemaVersion = '1.0.0';
  legacy.document.templateSnapshot.schemaVersion = '1.0.0';
  const migrated = parseWorkspaceProject(JSON.stringify(legacy));
  expect(migrated).toMatchObject({
    ok: true,
    template: { schemaVersion: '1.22.0' },
  });
  if (!migrated.ok) return;
  const v2 = JSON.parse(
    serializeWorkspaceProject(migrated.template, migrated.workspace),
  );
  v2.template = { ...template, schemaVersion: '1.0.0' };
  expect(parseWorkspaceProject(JSON.stringify(v2))).toMatchObject({
    ok: true,
    template: { schemaVersion: '1.22.0' },
    workspace: migrated.workspace,
  });
});
