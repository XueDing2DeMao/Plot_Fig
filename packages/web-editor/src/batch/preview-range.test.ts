import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { parseWorkspaceProject } from '../state/workspace-project.js';
import { tableBatchItems } from './items.js';
import { previewBatchItem, runBatch } from './queue.js';

const options = { formats: ['svg' as const], dpi: 300, includeProject: true };

function fixture() {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'a',
        source: { kind: 'csv', name: 'a.csv' },
        rows: [
          ['x', 'y'],
          [2.3, 2],
          [4, 4],
          [6.3, 8],
        ],
      }),
      createDataTable({
        tableId: 'b',
        source: { kind: 'csv', name: 'b.csv' },
        rows: [
          ['x', 'y'],
          [10, 20],
          [15, 25],
          [20, 30],
        ],
      }),
    ],
  );
  const panel = model.template.panels[0]!;
  panel.axes[0]!.range = { mode: 'fixed', min: 2.2, max: 6.4 };
  panel.axes[0]!.rescale = {
    mode: 'auto',
    nice: true,
    margin: { minPercent: 8, maxPercent: 8 },
  };
  panel.axes[1]!.range = { mode: 'fixed', min: 0, max: 10 };
  return model;
}

it('keeps the main figure window for the same table across batch preview, export and reopened project', async () => {
  const model = fixture();
  const before = structuredClone(model);
  const main = renderFigureSvg(
    model.template,
    bindWorkspace(model.template, model.workspace),
    { purpose: 'export' },
  );
  if (!main.ok) throw new Error(JSON.stringify(main.diagnostics));
  const item = tableBatchItems(model, ['a'])[0]!;
  expect(item.error).toBeUndefined();
  expect(
    item.model!.template.panels[0]!.axes.map((axis) => axis.range),
  ).toEqual(model.template.panels[0]!.axes.map((axis) => axis.range));
  expect(previewBatchItem(item, options).svg).toBe(main.svg);
  const result = await runBatch([item], options, {
    exporter: async (svg) => new TextEncoder().encode(svg),
  });
  expect(result.records[0]!.status).toBe('success');
  const files = result.records[0]!.files;
  expect(
    new TextDecoder().decode(
      result.files[files.find((name) => name.endsWith('.svg'))!],
    ),
  ).toBe(main.svg);
  const reopened = parseWorkspaceProject(
    new TextDecoder().decode(
      result.files[files.find((name) => name.endsWith('.plotfig.json'))!],
    ),
  );
  if (!reopened.ok) throw new Error(JSON.stringify(reopened.diagnostics));
  expect(reopened.template.panels[0]!.axes.map((axis) => axis.range)).toEqual(
    model.template.panels[0]!.axes.map((axis) => axis.range),
  );
  expect(reopened.workspace.tables).toEqual([model.workspace.tables[0]!]);
  expect(reopened.workspace.slotBindings).toEqual(model.workspace.slotBindings);
  expect(model).toEqual(before);
});

it('refits replacement data for Auto while preserving Normal and Fixed windows', () => {
  for (const mode of ['auto', 'normal', 'fixed'] as const) {
    const model = fixture();
    const axis = model.template.panels[0]!.axes[0]!;
    axis.rescale = { mode };
    const before = structuredClone(model);
    const item = tableBatchItems(model, ['b'])[0]!;
    expect(item.error).toBeUndefined();
    expect(item.model!.template.panels[0]!.axes[0]!.range).toEqual(
      mode === 'auto' ? { mode: 'fixed', min: 10, max: 20 } : axis.range,
    );
    expect(item.model!.workspace.slotBindings['slot-x']!.tableId).toBe('b');
    expect(model).toEqual(before);
  }
});

it('initializes explicit templates, including the current figure, against the selected data', () => {
  const model = fixture();
  expect(
    tableBatchItems(model, ['a'], { template: model.template })[0]!.model!
      .template.panels[0]!.axes[0]!.range,
  ).toEqual({ mode: 'fixed', min: 1, max: 7 });
  const template = structuredClone(model.template);
  template.templateId = 'new-template';
  template.dataSlots.forEach((slot) => {
    slot.name = slot.role;
  });
  template.panels[0]!.axes[0]!.range = { mode: 'fixed', min: -100, max: 100 };
  template.panels[0]!.axes[0]!.rescale = { mode: 'auto' };
  const before = structuredClone(template);
  const item = tableBatchItems(model, ['a'], { template })[0]!;
  expect(item.error).toBeUndefined();
  expect(item.model!.template.panels[0]!.axes[0]!.range).toEqual({
    mode: 'fixed',
    min: 2.3,
    max: 6.3,
  });
  expect(template).toEqual(before);
});
