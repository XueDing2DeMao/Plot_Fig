import { readFileSync } from 'node:fs';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { expect, it } from 'vitest';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { parseWorkspaceProject } from '../state/workspace-project.js';
import { BATCH_LIMITS, tableBatchItems } from './items.js';
import { prepare, previewBatchItem, runBatch } from './queue.js';

function model() {
  return importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    ['a', 'b'].map((id) =>
      createDataTable({
        tableId: id,
        source: { name: id + '.csv', kind: 'csv' },
        rows: [
          ['x', 'y'],
          ['1', '2'],
          ['2', '3'],
        ],
      }),
    ),
  );
}
const options = { formats: ['svg' as const], dpi: 300, includeProject: true };

it('allows a queued user cancellation between fast SVG items', async () => {
  const m = model(),
    controller = new AbortController();
  let calls = 0;
  const result = await runBatch(
    ['a', 'b', 'c'].map((id) => ({ id, name: id, model: m })),
    options,
    {
      signal: controller.signal,
      exporter: async () => {
        if (++calls === 1) setTimeout(() => controller.abort(), 0);
        return new Uint8Array([1]);
      },
    },
  );
  expect(result.records.map((r) => r.status)).toEqual([
    'success',
    'cancelled',
    'cancelled',
  ]);
  expect(calls).toBe(1);
});

it('strips the data table extension and keeps numbered filenames unique', async () => {
  const m = model();
  const result = await runBatch(
    ['1', '2'].map((id) => ({ id, name: 'figure.csv', model: m })),
    options,
    { exporter: async () => new Uint8Array([1]) },
  );
  expect(Object.keys(result.files)).toEqual([
    '001-figure.svg',
    '001-figure.plotfig.json',
    '002-figure.svg',
    '002-figure.plotfig.json',
  ]);
});

it('does not silently drop a previously bound optional column', () => {
  const m = model(),
    slot = m.template.dataSlots.find((s) => s.role === 'y')!;
  slot.required = false;
  m.workspace.tables[1]!.columns[1]!.name = 'missing-y';
  expect(tableBatchItems(m, ['b'], { autoXY: false })[0]!.error).toContain(
    '缺失',
  );
});

it('enforces item, input and output limits without discarding earlier successful files', async () => {
  const m = model();
  expect(() => tableBatchItems(m, Array(51).fill('a'))).toThrow('50');
  const inputBytes = BATCH_LIMITS.inputBytes;
  try {
    BATCH_LIMITS.inputBytes = 1;
    await expect(
      runBatch(tableBatchItems(m, ['a']), options, {
        exporter: async () => {
          throw new Error('must not export');
        },
      }),
    ).rejects.toThrow('100 MiB');
  } finally {
    BATCH_LIMITS.inputBytes = inputBytes;
  }
  const bytes = BATCH_LIMITS.outputBytes;
  try {
    BATCH_LIMITS.outputBytes = 3;
    const result = await runBatch(
      [
        { id: 'a', name: 'same', model: m },
        { id: 'b', name: 'same', model: m },
      ],
      { ...options, includeProject: false },
      { exporter: async () => new Uint8Array([1, 2]) },
    );
    expect(result.records.map((r) => r.status)).toEqual(['success', 'failed']);
    expect(Object.keys(result.files)).toEqual(['001-same.svg']);
    expect(result.records[1]!.messages.join(' ')).toContain('200 MiB');
  } finally {
    BATCH_LIMITS.outputBytes = bytes;
  }
});

it('reports table, slot and role for missing, duplicate and incompatible columns', () => {
  const m = model();
  const table = m.workspace.tables[1]!;
  table.columns[1]!.name = 'x';
  expect(tableBatchItems(m, ['b'])[0]!.error).toMatch(/b.*X.*x.*重复/s);
  table.columns[1]!.name = 'y';
  table.columns[1]!.settings.type = 'string';
  expect(tableBatchItems(m, ['b'])[0]!.error).toMatch(/b.*Y.*y.*类型/s);
  table.columns[1]!.name = 'Y';
  expect(tableBatchItems(m, ['b'], { autoXY: false })[0]!.error).toMatch(
    /b.*Y.*y.*缺失/s,
  );
});

it('repairs a single item with explicit column IDs without changing the model', () => {
  const m = model(),
    table = m.workspace.tables[1]!;
  table.columns[1]!.name = 'signal';
  const original = structuredClone(m),
    slot = m.template.dataSlots.find((s) => s.role === 'y')!;
  const item = tableBatchItems(m, ['b'], {
    columnMappings: {
      b: {
        [slot.dataSlotId]: {
          tableId: 'b',
          columnId: table.columns[1]!.columnId,
        },
      },
    },
  })[0]!;
  expect(item.error).toBeUndefined();
  expect(item.model?.workspace.slotBindings[slot.dataSlotId]?.tableId).toBe(
    'b',
  );
  expect(m).toEqual(original);
});

it('does not silently collapse a current figure that depends on multiple tables', () => {
  const m = model(),
    slot = m.template.dataSlots.find((s) => s.role === 'y')!;
  m.workspace.slotBindings[slot.dataSlotId] = {
    tableId: 'b',
    columnId: m.workspace.tables[1]!.columns[1]!.columnId,
  };
  expect(tableBatchItems(m, ['a'])[0]!.error).toContain('多张表');
});

it('uses the full template slots even if the original figure cannot bind the target', () => {
  const m = model(),
    template = defaultTemplate();
  m.workspace.tables[1]!.columns[1]!.name = 'signal';
  const y = template.dataSlots.find((s) => s.role === 'y')!;
  y.name = 'signal';
  template.dataSlots.find((s) => s.role === 'x')!.name = 'x';
  const item = tableBatchItems(m, ['b'], { template })[0]!;
  expect(item.error).toBeUndefined();
  expect(item.model?.template.dataSlots).toEqual(template.dataSlots);
});

it('requires explicit mapping when a full template sees repeated names across tables', () => {
  const m = model(),
    template = defaultTemplate();
  template.dataSlots.forEach((s) => {
    s.name = s.role;
  });
  const full = { ...options, template, mode: 'full' as const };
  const item = { id: 'p', name: 'two-tables', model: m };
  expect(() => prepare(item, full)).toThrow(/重复/);
  const refs = Object.fromEntries(
    template.dataSlots
      .filter((s) => s.required)
      .map((s) => [
        s.dataSlotId,
        {
          tableId: 'b',
          columnId: m.workspace.tables[1]!.columns.find(
            (c) => c.name === s.name,
          )!.columnId,
        },
      ]),
  );
  expect(
    prepare(item, { ...full, columnMappings: { p: refs } }).workspace
      .slotBindings,
  ).toEqual(refs);
});

it('S5 exports three valid tables, reports the fourth and previews the exact exported SVG', async () => {
  const parsed = parseWorkspaceProject(
    readFileSync(
      new URL(
        '../../../../tests/fixtures/m0/S5-table-batch.plotfig.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  if (!parsed.ok) throw new Error('fixture');
  const original = structuredClone(parsed);
  const items = tableBatchItems(
    parsed,
    parsed.workspace.tables.map((t) => t.tableId),
  );
  const result = await runBatch(items, options, {
    exporter: async (svg) => new TextEncoder().encode(svg),
  });
  expect(result.records.map((r) => r.status)).toEqual([
    'success',
    'success',
    'success',
    'failed',
  ]);
  for (const [i, item] of items.slice(0, 3).entries()) {
    expect(
      new TextDecoder().decode(
        result.files[result.records[i]!.files.find((f) => f.endsWith('.svg'))!],
      ),
    ).toBe(previewBatchItem(item, options).svg);
  }
  expect(parsed).toEqual(original);
  expect(items[3]!.error).toContain('重复');
});
