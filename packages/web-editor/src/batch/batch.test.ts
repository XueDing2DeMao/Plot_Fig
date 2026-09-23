import { expect, it } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { projectBatchItems, tableBatchItems } from './items.js';
import { runBatch, prepare } from './queue.js';
import { batchArchive } from './archive.js';
import { unzipSync } from 'fflate';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from '../state/workspace-project.js';
const model = () =>
  importTables({ template: defaultTemplate(), workspace: emptyWorkspace() }, [
    createDataTable({
      tableId: 'a',
      source: { name: 'a.csv', kind: 'csv' },
      rows: [
        ['x', 'y'],
        ['1', '2'],
        ['2', '3'],
      ],
    }),
  ]);
it('keeps saved project Auto windows on export, but refits table replacement', () => {
  const m = model(),
    axis = m.template.panels[0]!.axes[0]!;
  axis.range = { mode: 'fixed', min: -100, max: 100 };
  axis.rescale = { mode: 'auto' };
  const options = { formats: ['svg' as const], dpi: 600, includeProject: true };
  expect(
    prepare({ id: 'saved', name: 'saved.plotfig.json', model: m }, options)
      .template.panels[0]!.axes[0]!.range,
  ).toEqual(axis.range);
  expect(
    tableBatchItems(m, ['a'])[0]!.model!.template.panels[0]!.axes[0]!.range,
  ).toEqual({ mode: 'fixed', min: 1, max: 2 });
  expect(axis.range).toEqual({ mode: 'fixed', min: -100, max: 100 });
});
it('maps table batches by unique column names and does not mutate originals', () => {
  const m = model(),
    before = structuredClone(m);
  const items = tableBatchItems(m, ['a']);
  expect(items[0]!.model?.workspace.slotBindings).toEqual(
    m.workspace.slotBindings,
  );
  expect(m).toEqual(before);
});

it('batches existing project files into a ZIP with shared styles and each figure’s original data', async () => {
  const first = model();
  const second = model();
  second.workspace.tables[0]!.rows = [
    ['time', 'signal'],
    ['10', '120'],
    ['20', '70'],
  ];
  second.workspace.tables[0]!.columns[0]!.name = 'time';
  second.workspace.tables[0]!.columns[1]!.name = 'signal';
  second.template.panels[0]!.axes[0]!.range = {
    mode: 'fixed',
    min: 0,
    max: 25,
  };
  second.template.panels[0]!.axes[1]!.range = {
    mode: 'fixed',
    min: 0,
    max: 150,
  };
  second.template.panels[0]!.axes[0]!.title!.text = 'Time (s)';
  const originals = [first, second];
  const items = await projectBatchItems([
    ...originals.map(
      (m, i) =>
        new File(
          [serializeWorkspaceProject(m.template, m.workspace)],
          `figure-${i + 1}.plotfig.json`,
        ),
    ),
    new File(['invalid'], 'bad.plotfig.json'),
  ]);
  const before = structuredClone(items);
  const template = defaultTemplate();
  const plot = template.panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('fixture');
  plot.lineStyle!.color = '#c92a2a';
  plot.lineStyle!.dash = 'dashed';
  template.panels[0]!.axes[0]!.tickLabels.fontSizePt = 14;
  const sourceBefore = structuredClone(template);
  const options = {
    formats: ['svg' as const],
    dpi: 600,
    includeProject: true,
    template,
    mode: 'style' as const,
  };
  const result = await runBatch(items, options, {
    exporter: async (svg) => new TextEncoder().encode(svg),
  });
  const archive = unzipSync(
    new Uint8Array(await (await batchArchive(result, options)).arrayBuffer()),
  );
  expect(result.records.map((r) => r.status)).toEqual([
    'success',
    'success',
    'failed',
  ]);
  expect(Object.keys(archive)).toHaveLength(5);
  const decoder = new TextDecoder();
  for (const [index, original] of originals.entries()) {
    const files = result.records[index]!.files;
    const project = files.find((f) => f.endsWith('.plotfig.json'))!;
    const reopened = parseWorkspaceProject(decoder.decode(archive[project]));
    if (!reopened.ok) throw new Error(JSON.stringify(reopened.diagnostics));
    expect(reopened.workspace).toEqual(original.workspace);
    expect(reopened.template.dataSlots).toEqual(original.template.dataSlots);
    expect(
      reopened.template.panels[0]!.axes.map((a) => [a.range, a.title?.text]),
    ).toEqual(
      original.template.panels[0]!.axes.map((a) => [a.range, a.title?.text]),
    );
    expect(reopened.template.panels[0]!.plotSlots[0]!.bindings).toEqual(
      original.template.panels[0]!.plotSlots[0]!.bindings,
    );
    expect(reopened.template.panels[0]!.axes[0]!.tickLabels.fontSizePt).toBe(
      14,
    );
    const svg = decoder.decode(archive[files.find((f) => f.endsWith('.svg'))!]);
    expect(svg).toContain('stroke="#c92a2a"');
  }
  const manifest = JSON.parse(decoder.decode(archive['manifest.json']));
  expect(manifest.records.map((r: { status: string }) => r.status)).toEqual([
    'success',
    'success',
    'failed',
  ]);
  expect(items).toEqual(before);
  expect(template).toEqual(sourceBefore);
});
it('isolates failures, keeps all requested formats and generates unique filenames', async () => {
  const m = model(),
    items = [
      { id: '1', name: 'same.csv', model: m },
      { id: '2', name: 'same.csv', error: 'invalid input' },
    ];
  const result = await runBatch(
    items,
    { formats: ['svg', 'pdf'], dpi: 600, includeProject: true },
    { exporter: async () => new Uint8Array([1, 2, 3]) },
  );
  expect(result.records.map((r) => r.status)).toEqual(['success', 'failed']);
  expect(Object.keys(result.files)).toHaveLength(3);
  expect(result.records[0]!.files.some((n) => n.endsWith('.pdf'))).toBe(true);
});
it('stops current and pending jobs on cancellation and can retry failed items', async () => {
  const controller = new AbortController(),
    m = model(),
    items = [
      { id: '1', name: 'a', model: m },
      { id: '2', name: 'b', model: m },
    ];
  const result = await runBatch(
    items,
    { formats: ['svg'], dpi: 600, includeProject: false },
    {
      signal: controller.signal,
      exporter: async () => {
        controller.abort();
        return new Uint8Array([1]);
      },
    },
  );
  expect(result.records.every((r) => r.status === 'cancelled')).toBe(true);
  expect(Object.keys(result.files)).toHaveLength(0);
  const retry = await runBatch(
    items,
    { formats: ['svg'], dpi: 600, includeProject: false },
    { previous: result, exporter: async () => new Uint8Array([1]) },
  );
  expect(retry.records.every((r) => r.status === 'success')).toBe(true);
});
it('drops stale partial output when a retry fails a previously exported format', async () => {
  const items = [{ id: '1', name: 'a', model: model() }];
  const options = {
    formats: ['svg', 'pdf'] as const,
    dpi: 600,
    includeProject: false,
  };
  const previous = await runBatch(
    items,
    { ...options, formats: [...options.formats] },
    {
      exporter: async (_, format) => {
        if (format === 'pdf') throw Error('first failure');
        return new Uint8Array([1]);
      },
    },
  );
  const result = await runBatch(
    items,
    { ...options, formats: [...options.formats] },
    {
      previous,
      exporter: async (_, format) => {
        if (format === 'svg') throw Error('retry failure');
        return new Uint8Array([2]);
      },
    },
  );
  expect(Object.keys(result.files)).toEqual(
    result.records.flatMap((r) => r.files),
  );
  expect(Object.keys(result.files)).toEqual(['001-a.pdf']);
  expect(Object.keys(previous.files)).toEqual(['001-a.svg']);
});
