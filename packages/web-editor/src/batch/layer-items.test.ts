import { expect, it } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { createLayerBatch } from '../state/layer-batch.js';
import { layerBatchItems } from './layer-items.js';
import { runBatch } from './queue.js';
import { batchArchive } from './archive.js';
import { unzipSync } from 'fflate';

it('exports selected layers as separate files and isolates an unconfigured layer failure', async () => {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'a',
        source: { name: 'a.csv', kind: 'csv' },
        rows: [
          ['X', 'Y'],
          ['1', '2'],
          ['2', '3'],
        ],
      }),
    ],
  );
  const next = createLayerBatch(model, model, {
    mode: 'count',
    count: 1,
    keepExisting: true,
  });
  const original = next.template.panels[0]!,
    empty = next.template.panels[1]!;
  const options = {
    formats: ['svg' as const],
    dpi: 300,
    includeProject: false,
  };
  const result = await runBatch(
    layerBatchItems(next, [original.panelId, empty.panelId]),
    options,
    { exporter: async (svg) => new TextEncoder().encode(svg) },
  );
  expect(result.records.map((r) => r.status)).toEqual(['success', 'failed']);
  expect(result.records[1]!.messages).toEqual(['请先为本图层绑定数据列：X、Y']);
  const files = unzipSync(
    new Uint8Array(await (await batchArchive(result, options)).arrayBuffer()),
  );
  const svgNames = Object.keys(files).filter((n) => n.endsWith('.svg'));
  expect(svgNames).toHaveLength(1);
  const svg = new TextDecoder().decode(files[svgNames[0]!]);
  expect(svg).toContain(`data-panel-id="${original.panelId}"`);
  expect(svg).not.toContain(`data-panel-id="${empty.panelId}"`);
  expect(layerBatchItems(next, [empty.panelId]).map((item) => item.id)).toEqual(
    [empty.panelId],
  );
  expect(
    layerBatchItems(next, [empty.panelId])[0]!.model!.workspace.tables,
  ).toHaveLength(0);
});

it('includes only tables referenced by each exported layer', () => {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    ['a', 'b'].map((id) =>
      createDataTable({
        tableId: id,
        source: { name: id + '.csv', kind: 'csv' },
        rows: [
          ['X', 'Y'],
          ['1', '2'],
          ['2', '3'],
        ],
      }),
    ),
  );
  const next = createLayerBatch(model, model, {
    mode: 'tables',
    tableIds: ['a', 'b'],
    keepExisting: false,
  });
  const items = layerBatchItems(
    next,
    next.template.panels.map((p) => p.panelId),
  );
  expect(
    items.map((item) => item.model!.workspace.tables.map((t) => t.tableId)),
  ).toEqual([['a'], ['b']]);
  expect(next.workspace.tables).toHaveLength(2);
});
