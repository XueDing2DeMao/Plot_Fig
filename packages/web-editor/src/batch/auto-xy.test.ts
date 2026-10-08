import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
  type RawCell,
} from '@plot-fig/data-binding';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { defaultTemplate } from '../state/default-template.js';
import { batchYColumns } from '../state/batch-y-columns.js';
import { importTables } from '../state/workspace-editor.js';
import { parseWorkspaceProject } from '../state/workspace-project.js';
import { tableBatchItems } from './items.js';
import { prepare, previewBatchItem, runBatch } from './queue.js';
import { sourceColumnNames } from './column-mapping.js';
import { markAxisTitleManual } from '../state/axis-title-bindings.js';

const options = { formats: ['svg' as const], dpi: 300, includeProject: true };

it.each([false, true])(
  'updates automatic axis titles while preserving manual titles (full=%s)',
  (full) => {
    const model = fixture();
    const batchOptions = {
      ...options,
      autoXY: true,
      ...(full
        ? {
            template: model.template,
            mode: 'full' as const,
            columnNames: sourceColumnNames(model.template, model.workspace),
          }
        : {}),
    };
    const item = tableBatchItems(model, ['target'])[0]!;
    const result = prepare(item, batchOptions);
    expect(
      result.template.panels[0]!.axes.find((a) => a.axisId === 'axis-x')!.title!
        .text,
    ).toBe('angle');
    expect(
      result.template.panels[0]!.axes.find((a) => a.axisId === 'axis-y')!.title!
        .text,
    ).toBe('intensity');
    const y = model.template.panels[0]!.axes.find(
      (a) => a.axisId === 'axis-y',
    )!;
    y.title!.text = 'Intensity (a.u.)';
    markAxisTitleManual(y);
    const manual = prepare(
      tableBatchItems(model, ['target'])[0]!,
      batchOptions,
    );
    expect(
      manual.template.panels[0]!.axes.find((a) => a.axisId === 'axis-y')!.title!
        .text,
    ).toBe('Intensity (a.u.)');
  },
);

function table(id: string, rows: RawCell[][]) {
  return createDataTable({
    tableId: id,
    source: { kind: 'csv', name: `${id}.csv` },
    rows,
  });
}

function fixture(
  targetRows: RawCell[][] = [
    ['angle', 'intensity'],
    [10, 20],
    [20, 40],
  ],
) {
  return importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      table('source', [
        ['x', 'y'],
        [1, 2],
        [2, 3],
      ]),
      table('target', targetRows),
    ],
  );
}

function multiCurveFixture() {
  const source = table('source', [
    ['x', 'signal-a', 'signal-b', 'signal-c'],
    [1, 10, 20, 30],
    [2, 11, 21, 31],
  ]);
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      source,
      table('target', [
        ['angle', 'intensity'],
        [10, 20],
        [20, 40],
      ]),
    ],
  );
  const next = batchYColumns(model, {
    panelId: model.template.panels[0]!.panelId,
    tableId: source.tableId,
    xColumnId: source.columns[0]!.columnId,
    yColumnIds: source.columns.slice(1).map((column) => column.columnId),
  });
  const first = next.template.panels[0]!.plotSlots[0]!;
  if (first.kind !== 'xy') throw new Error('Expected XY fixture');
  first.lineStyle = {
    visible: true,
    color: '#bd1976',
    widthPt: 2,
    dash: 'dashed',
  };
  return next;
}

it('automatically maps each two-column table and exports the same SVG as its preview with a reopenable project', async () => {
  const model = fixture();
  model.workspace.tables.push(
    table('another', [
      ['position', 'counts'],
      [30, 80],
      [40, 90],
    ]),
  );
  const before = structuredClone(model);
  const items = tableBatchItems(model, ['target', 'another']);
  expect(items.map((item) => item.error)).toEqual([undefined, undefined]);
  const result = await runBatch(items, options, {
    exporter: async (svg) => new TextEncoder().encode(svg),
  });
  expect(result.records.map((record) => record.status)).toEqual([
    'success',
    'success',
  ]);
  for (const [index, item] of items.entries()) {
    const target = model.workspace.tables.find(
      (candidate) => candidate.tableId === item.id,
    )!;
    expect(item.model!.workspace.slotBindings).toEqual({
      'slot-x': {
        tableId: target.tableId,
        columnId: target.columns[0]!.columnId,
      },
      'slot-y': {
        tableId: target.tableId,
        columnId: target.columns[1]!.columnId,
      },
    });
    const files = result.records[index]!.files;
    const svg = new TextDecoder().decode(
      result.files[files.find((name) => name.endsWith('.svg'))!],
    );
    expect(svg).toBe(previewBatchItem(item, options).svg);
    expect(svg).toContain('data-plot-slot-id="series-1"');
    const reopened = parseWorkspaceProject(
      new TextDecoder().decode(
        result.files[files.find((name) => name.endsWith('.plotfig.json'))!],
      ),
    );
    if (!reopened.ok) throw new Error(JSON.stringify(reopened.diagnostics));
    expect(reopened.workspace).toEqual(item.model!.workspace);
    expect(reopened.template).toEqual(item.model!.template);
  }
  expect(model).toEqual(before);
});

it.each([
  ['date', '2026-09-28', '2026-09-29'],
  ['datetime', '2026-09-28T08:30:00Z', '2026-09-29T08:30:00Z'],
] as const)(
  'accepts %s in the first column as automatic X',
  (type, start, end) => {
    const model = fixture([
      ['timestamp', 'reading'],
      [start, 20],
      [end, 40],
    ]);
    model.workspace.tables[1]!.columns[0]!.settings.type = type;
    const item = tableBatchItems(model, ['target'])[0]!;
    expect(item.error).toBeUndefined();
    const data = bindWorkspace(item.model!.template, item.model!.workspace);
    expect(
      data.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    ).toEqual([]);
    expect(
      data.columns.find((column) => column.name === 'timestamp')!.values,
    ).toEqual([Date.parse(start), Date.parse(end)]);
    expect(previewBatchItem(item, options).svg).toContain(
      'data-plot-slot-id="series-1"',
    );
  },
);

it('prefers complete exact names over two-column position', () => {
  const model = fixture([
    ['y', 'x'],
    [20, 10],
    [40, 20],
  ]);
  const target = model.workspace.tables[1]!;
  const item = tableBatchItems(model, ['target'])[0]!;
  expect(item.error).toBeUndefined();
  expect(item.model!.workspace.slotBindings).toEqual({
    'slot-x': {
      tableId: target.tableId,
      columnId: target.columns[1]!.columnId,
    },
    'slot-y': {
      tableId: target.tableId,
      columnId: target.columns[0]!.columnId,
    },
  });
});

it('preserves explicit manual mappings and does not override explicit empty choices', () => {
  const model = fixture();
  const target = model.workspace.tables[1]!;
  const mapping = {
    'slot-x': {
      tableId: target.tableId,
      columnId: target.columns[1]!.columnId,
    },
    'slot-y': {
      tableId: target.tableId,
      columnId: target.columns[0]!.columnId,
    },
  };
  const item = tableBatchItems(model, ['target'], {
    columnMappings: { target: mapping },
  })[0]!;
  expect(item.error).toBeUndefined();
  expect(item.model!.workspace.slotBindings).toEqual(mapping);
  expect(
    tableBatchItems(model, ['target'], {
      columnMappings: { target: { ...mapping, 'slot-y': null } },
    })[0]!.error,
  ).toContain('缺失');
});

it.each([
  ['slot-x', 1],
  ['slot-y', 0],
] as const)(
  'fills the remaining column after manually assigning %s despite a conflicting exact name',
  (slotId, columnIndex) => {
    const model = fixture([
      ['x', 'y'],
      [10, 20],
      [20, 40],
    ]);
    const target = model.workspace.tables[1]!;
    const before = structuredClone(model);
    const item = tableBatchItems(model, ['target'], {
      columnMappings: {
        target: {
          [slotId]: {
            tableId: target.tableId,
            columnId: target.columns[columnIndex]!.columnId,
          },
        },
      },
    })[0]!;
    expect(item.error).toBeUndefined();
    expect(item.model!.workspace.slotBindings).toEqual({
      'slot-x': {
        tableId: target.tableId,
        columnId: target.columns[1]!.columnId,
      },
      'slot-y': {
        tableId: target.tableId,
        columnId: target.columns[0]!.columnId,
      },
    });
    expect(model).toEqual(before);
  },
);

it('reduces an unmatched multi-curve XY figure to one styled curve for each two-column target', async () => {
  const model = multiCurveFixture();
  const before = structuredClone(model);
  const first = model.template.panels[0]!.plotSlots[0]!;
  const item = tableBatchItems(model, ['target'])[0]!;
  expect(item.error).toBeUndefined();
  const plots = item.model!.template.panels[0]!.plotSlots;
  expect(plots).toHaveLength(1);
  expect(plots[0]!.plotSlotId).toBe(first.plotSlotId);
  if (plots[0]!.kind !== 'xy' || first.kind !== 'xy')
    throw new Error('Expected XY');
  expect(plots[0]!.lineStyle).toEqual(first.lineStyle);
  expect(plots[0]!.markerStyle).toEqual(first.markerStyle);
  expect(
    item.model!.template.dataSlots.map((slot) => slot.role).sort(),
  ).toEqual(['x', 'y']);
  const result = await runBatch([item], options, {
    exporter: async (svg) => new TextEncoder().encode(svg),
  });
  expect(result.records[0]!.status).toBe('success');
  const svg = new TextDecoder().decode(
    result.files[
      result.records[0]!.files.find((name) => name.endsWith('.svg'))!
    ],
  );
  expect(svg).toBe(previewBatchItem(item, options).svg);
  expect(svg).toContain('stroke="#bd1976"');
  for (const removed of model.template.panels[0]!.plotSlots.slice(1)) {
    expect(svg).not.toContain(`data-plot-slot-id="${removed.plotSlotId}"`);
  }
  const reopened = parseWorkspaceProject(
    new TextDecoder().decode(
      result.files[
        result.records[0]!.files.find((name) => name.endsWith('.plotfig.json'))!
      ],
    ),
  );
  if (!reopened.ok) throw new Error(JSON.stringify(reopened.diagnostics));
  expect(reopened.template.panels[0]!.plotSlots).toHaveLength(1);
  expect(reopened.workspace).toEqual(item.model!.workspace);
  expect(model).toEqual(before);
});

it('retains every original curve when column names match completely', () => {
  const model = multiCurveFixture();
  const item = tableBatchItems(model, ['source'])[0]!;
  expect(item.error).toBeUndefined();
  expect(item.model!.template.panels[0]!.plotSlots).toEqual(
    model.template.panels[0]!.plotSlots,
  );
  expect(item.model!.workspace.slotBindings).toEqual(
    model.workspace.slotBindings,
  );
});

it('requires explicit mapping when an axis rug references a curve that automatic XY reduction would remove', () => {
  const model = multiCurveFixture();
  const panel = model.template.panels[0]!;
  panel.axes[0]!.advanced = {
    rug: {
      plotSlotIds: [panel.plotSlots[1]!.plotSlotId],
      source: 'raw',
      arrangement: 'overlap',
      side: 'inside',
      followStyle: true,
    },
  };
  expect(validateFigureTemplate(model.template).ok).toBe(true);
  const before = structuredClone(model);
  const item = tableBatchItems(model, ['target'])[0]!;
  expect(item.error).toContain('缺失');
  expect(item.model).toBeUndefined();
  expect(model).toEqual(before);
});

it('keeps multi-panel and cross-table figures strict', () => {
  const panels = fixture();
  const extra = structuredClone(panels.template.panels[0]!);
  extra.panelId = 'panel-extra';
  extra.plotSlots[0]!.plotSlotId = 'series-extra';
  panels.template.panels.push(extra);
  expect(tableBatchItems(panels, ['target'])[0]!.error).toBeTruthy();
  const crossTable = fixture();
  crossTable.workspace.slotBindings['slot-y'] = {
    tableId: 'target',
    columnId: crossTable.workspace.tables[1]!.columns[1]!.columnId,
  };
  expect(tableBatchItems(crossTable, ['target'])[0]!.error).toContain('多张表');
});

it('does not discard a bound error column to enable automatic XY mapping', () => {
  const model = fixture();
  const plot = model.template.panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('Expected XY');
  plot.bindings.yError = 'slot-error';
  model.template.dataSlots.push({
    dataSlotId: 'slot-error',
    name: 'error',
    role: 'yError',
    valueType: 'number',
    required: true,
  });
  model.workspace.slotBindings['slot-error'] =
    model.workspace.slotBindings['slot-y']!;
  expect(tableBatchItems(model, ['target'])[0]!.error).toBeTruthy();
});

it('does not guess among additional columns or treat a nonnumeric second column as Y', () => {
  const wider = fixture([
    ['angle', 'intensity', 'extra'],
    [10, 20, 30],
    [20, 40, 50],
  ]);
  expect(tableBatchItems(wider, ['target'])[0]!.error).toBeTruthy();
  const text = fixture([
    ['angle', 'label'],
    [10, 'one'],
    [20, 'two'],
  ]);
  expect(tableBatchItems(text, ['target'])[0]!.error).toBeTruthy();
});
