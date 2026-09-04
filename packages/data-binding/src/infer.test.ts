import { describe, expect, it } from 'vitest';
import { inferDataBindingSet } from './infer.js';

describe('inferDataBindingSet', () => {
  it('infers numeric and category columns while preserving blanks as null', () => {
    const result = inferDataBindingSet(
      [
        ['X', 'Group'],
        ['1.5', 'A'],
        ['', 'B'],
      ],
      'measurements.csv',
    );
    expect(result.columns).toEqual([
      {
        columnId: 'x',
        name: 'X',
        index: 0,
        valueType: 'number',
        values: [1.5, null],
      },
      {
        columnId: 'group',
        name: 'Group',
        index: 1,
        valueType: 'category',
        values: ['A', 'B'],
      },
    ]);
    expect(result.source.rowCount).toBe(2);
  });

  it('reports duplicate headers deterministically', () => {
    const result = inferDataBindingSet(
      [
        ['X', 'X'],
        ['1', '2'],
      ],
      'duplicate.csv',
    );
    expect(result.columns.map((column) => column.columnId)).toEqual([
      'x',
      'x-1',
    ]);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'CSV_DUPLICATE_HEADER',
      sourcePath: '/header/1',
    });
  });
});
