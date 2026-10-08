import { describe, expect, it } from 'vitest';
import { createDataTable, type DataWorkspace } from '@plot-fig/data-binding';
import type { CurveGroup, PlotSlot, XyPlot } from '@plot-fig/figure-schema';
import { defaultTemplate } from './default-template.js';
import {
  mergeImportedGroupParameters,
  parseGroupParameterColumnName,
  previewGroupParameterImport,
  type GroupParameterImportRow,
} from './group-parameter-import.js';

type Mapping = NonNullable<CurveGroup['colorMapping']>;
const colors = ['#000000', '#ffffff'];
function fixtures(names = ['500', '550', '1000']) {
  const table = createDataTable({
    tableId: 'table-one',
    source: { kind: 'csv', name: 'measurements.csv' },
    rows: [
      ['X', ...names],
      [0, ...names.map(() => 1)],
      [1, ...names.map(() => 2)],
    ],
  });
  // 保留待测原始列名，不依赖导入器的列名清洗。
  table.columns.slice(1).forEach((column, index) => {
    column.name = names[index]!;
  });
  const prototype = defaultTemplate().panels[0]!.plotSlots[0]! as XyPlot;
  const plots: XyPlot[] = names.map((_, index) => ({
    ...structuredClone(prototype),
    plotSlotId: `curve-${index}`,
    bindings: { x: 'source-x', y: `source-y-${index}` },
    legendEntry: { visible: true, source: 'manual', text: `Curve ${index}` },
  }));
  const workspace: DataWorkspace = {
    tables: [table],
    activeTableId: null,
    slotBindings: Object.fromEntries([
      [
        'source-x',
        { tableId: table.tableId, columnId: table.columns[0]!.columnId },
      ],
      ...plots.map((plot, index) => [
        plot.bindings.y,
        {
          tableId: table.tableId,
          columnId: table.columns[index + 1]!.columnId,
        },
      ]),
    ]),
  };
  return { plots, workspace, table };
}

describe('parseGroupParameterColumnName', () => {
  it.each([
    ['500', 500],
    ['+550', 550],
    ['-1000', -1000],
    ['.5', 0.5],
    ['1.', 1],
    ['-0.25', -0.25],
    ['1e3', 1000],
    ['-2.5E-2', -0.025],
    ['+1.e+2', 100],
    ['  500\t', 500],
    ['-0', -0],
  ])('parses complete finite decimal %j', (name, value) => {
    expect(parseGroupParameterColumnName(name as string)).toBe(value);
  });

  it.each([
    '',
    '   ',
    '\t\n',
    'Sample_01',
    '500 nm',
    '1 000',
    '500\n550',
    '0x10',
    '0b11',
    '0o17',
    'NaN',
    'Infinity',
    '-Infinity',
    '1e309',
    '1_000',
    '1,000',
    '10%',
    '1e',
    '.',
    '+',
    '５００',
  ])('rejects non-decimal, partial or non-finite name %j', (name) => {
    expect(parseGroupParameterColumnName(name)).toBeNull();
  });
});

describe('previewGroupParameterImport', () => {
  it('reads each exact Y binding and preserves plot order and source names', () => {
    const { plots, workspace } = fixtures(['500', ' 550 ', '1e3']);
    workspace.activeTableId = 'unrelated-active-table';
    plots[1]!.legendEntry.text = '';
    const before = structuredClone({ plots, workspace });
    expect(
      previewGroupParameterImport([plots[2]!, plots[0]!, plots[1]!], workspace),
    ).toEqual([
      {
        plotSlotId: 'curve-2',
        curveName: 'Curve 2',
        columnName: '1e3',
        ok: true,
        value: 1000,
      },
      {
        plotSlotId: 'curve-0',
        curveName: 'Curve 0',
        columnName: '500',
        ok: true,
        value: 500,
      },
      {
        plotSlotId: 'curve-1',
        curveName: 'curve-1',
        columnName: ' 550 ',
        ok: true,
        value: 550,
      },
    ]);
    expect({ plots, workspace }).toEqual(before);
  });

  it('follows table and column IDs despite matching names and changed column order', () => {
    const { plots, workspace, table } = fixtures(['500']);
    const other = structuredClone(table);
    other.tableId = 'other-table';
    other.columns[1]!.name = '1000';
    workspace.tables.unshift(other);
    table.columns.reverse();
    expect(previewGroupParameterImport(plots, workspace)[0]).toMatchObject({
      ok: true,
      value: 500,
    });
  });

  it('reports a specific error for missing Y role, unbound slot, table or column', () => {
    const { plots, workspace } = fixtures(['500', '550', '1000']);
    const noY: PlotSlot = {
      plotSlotId: 'no-y',
      bindings: { values: 'source-y-0' },
      kind: 'histogram',
      xAxisId: 'axis-x',
      yAxisId: 'axis-y',
      legendEntry: { visible: true, text: 'Histogram' },
      bins: { mode: 'count', count: 10 },
      normalization: 'count',
      fillStyle: {
        color: '#000000',
        opacity: 1,
        borderColor: '#000000',
        borderWidthPt: 1,
      },
    };
    delete workspace.slotBindings['source-y-0'];
    workspace.slotBindings['source-y-1'] = {
      tableId: 'missing-table',
      columnId: 'unknown',
    };
    workspace.slotBindings['source-y-2'] = {
      tableId: 'table-one',
      columnId: 'missing-column',
    };
    const rows = previewGroupParameterImport([noY, ...plots], workspace);
    expect(rows).toHaveLength(4);
    const errors = rows.map((row) => {
      expect(row.ok).toBe(false);
      expect(row.columnName).toBeNull();
      return row.ok ? '' : row.error;
    });
    expect(errors[0]).toMatch(/Y.*绑定/);
    expect(errors[1]).toMatch(/source-y-0.*未绑定/);
    expect(errors[2]).toMatch(/missing-table.*不存在/);
    expect(errors[3]).toMatch(/missing-column.*不存在/);
  });

  it('keeps invalid source names visible and distinguishes blank names', () => {
    const { plots, workspace } = fixtures(['Sample_01', '   ', '1e309']);
    const rows = previewGroupParameterImport(plots, workspace);
    expect(rows.map((row) => row.columnName)).toEqual([
      'Sample_01',
      '   ',
      '1e309',
    ]);
    for (const row of rows) {
      expect(row.ok).toBe(false);
      expect(row.ok ? '' : row.error).not.toBe('');
    }
    expect(rows[1]).toMatchObject({
      ok: false,
      error: expect.stringMatching(/为空/),
    });
  });

  it('does not infer a parameter from displayed curve text, X binding or data cells', () => {
    const { plots, workspace, table } = fixtures(['Sample_01']);
    plots[0]!.legendEntry.text = '550';
    table.columns[0]!.name = '500';
    table.rows[1]![1] = 1000;
    expect(previewGroupParameterImport(plots, workspace)[0]).toMatchObject({
      ok: false,
      columnName: 'Sample_01',
    });
  });
});

describe('mergeImportedGroupParameters', () => {
  it('updates successful IDs once while preserving failed values, unrelated members and mapping settings', () => {
    const { plots, workspace } = fixtures(['500', 'Sample_01', '1000']);
    const mapping: Mapping = {
      source: 'values',
      colors,
      reverse: true,
      domain: { min: 0, max: 1200 },
      label: 'Temperature',
      values: [
        { plotSlotId: 'curve-1', value: 12 },
        { plotSlotId: 'unrelated', value: 42 },
        { plotSlotId: 'curve-0', value: 1 },
      ],
    };
    const before = structuredClone(mapping);
    const next = mergeImportedGroupParameters(
      mapping,
      previewGroupParameterImport(plots, workspace),
    );
    expect(next).toEqual({
      ...mapping,
      values: [
        { plotSlotId: 'curve-1', value: 12 },
        { plotSlotId: 'unrelated', value: 42 },
        { plotSlotId: 'curve-0', value: 500 },
        { plotSlotId: 'curve-2', value: 1000 },
      ],
    });
    expect(mapping).toEqual(before);
    expect(next).not.toBe(mapping);
    expect(next.colors).toBe(mapping.colors);
    expect(next.domain).toBe(mapping.domain);
    if (next.source === 'values')
      expect(next.values[0]).toBe(mapping.values[0]);
  });

  it('switches an index mapping to explicit values without losing its configuration', () => {
    const { plots, workspace } = fixtures();
    const mapping: Mapping = {
      source: 'index',
      colors,
      reverse: false,
      label: 'nm',
      domain: { min: 400, max: 1100 },
    };
    expect(
      mergeImportedGroupParameters(
        mapping,
        previewGroupParameterImport(plots, workspace),
      ),
    ).toEqual({
      ...mapping,
      source: 'values',
      values: [
        { plotSlotId: 'curve-0', value: 500 },
        { plotSlotId: 'curve-1', value: 550 },
        { plotSlotId: 'curve-2', value: 1000 },
      ],
    });
  });

  it('leaves either mapping source unchanged when there are no successes or no value changes', () => {
    const { plots, workspace } = fixtures(['invalid']);
    for (const mapping of [
      { source: 'index', colors },
      {
        source: 'values',
        colors,
        values: [{ plotSlotId: 'curve-0', value: 500 }],
      },
    ] satisfies Mapping[]) {
      expect(mergeImportedGroupParameters(mapping, [])).toBe(mapping);
      expect(
        mergeImportedGroupParameters(
          mapping,
          previewGroupParameterImport(plots, workspace),
        ),
      ).toBe(mapping);
    }
    const mapping: Mapping = {
      source: 'values',
      colors,
      values: [{ plotSlotId: 'curve-0', value: 500 }],
    };
    const valid = fixtures(['500']);
    expect(
      mergeImportedGroupParameters(
        mapping,
        previewGroupParameterImport(valid.plots, valid.workspace),
      ),
    ).toBe(mapping);
  });

  it('preserves ID ownership after reordering and does not continuously track renamed columns', () => {
    const { plots, workspace, table } = fixtures();
    const initial: Mapping = { source: 'values', colors, values: [] };
    const next = mergeImportedGroupParameters(
      initial,
      previewGroupParameterImport([...plots].reverse(), workspace),
    );
    table.columns[1]!.name = '750';
    expect(
      next.source === 'values' &&
        next.values.find((entry) => entry.plotSlotId === 'curve-0')?.value,
    ).toBe(500);
    const refreshed = mergeImportedGroupParameters(
      next,
      previewGroupParameterImport(plots, workspace),
    );
    expect(
      refreshed.source === 'values' &&
        refreshed.values.find((entry) => entry.plotSlotId === 'curve-0')?.value,
    ).toBe(750);
  });

  it('ignores non-finite values in manually supplied preview rows', () => {
    const mapping: Mapping = {
      source: 'values',
      colors,
      values: [{ plotSlotId: 'curve-0', value: 500 }],
    };
    const rows: GroupParameterImportRow[] = [NaN, Infinity].map((value) => ({
      plotSlotId: 'curve-0',
      curveName: 'Curve 0',
      columnName: 'invalid',
      ok: true,
      value,
    }));
    expect(mergeImportedGroupParameters(mapping, rows)).toBe(mapping);
  });
});
