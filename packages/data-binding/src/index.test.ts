import { describe, expect, it } from 'vitest';
import { createDataBindingSet } from './index.js';
import type { DataBindingSet } from './types.js';

describe('DataBindingSet contract', () => {
  it('creates an empty JSON-safe binding set', () => {
    expect(createDataBindingSet('measurements.csv')).toEqual({
      kind: 'data-binding-set',
      version: '1.0.0',
      source: { kind: 'csv', name: 'measurements.csv', rowCount: 0 },
      columns: [],
      bindings: [],
      diagnostics: [],
    });
  });

  it('represents columns and slot bindings as JSON-safe data', () => {
    const value: DataBindingSet = {
      kind: 'data-binding-set',
      version: '1.0.0',
      source: { kind: 'csv', name: 'measurements.csv', rowCount: 2 },
      columns: [
        {
          columnId: 'x',
          name: 'X',
          index: 0,
          valueType: 'number',
          values: [1, 2],
        },
      ],
      bindings: [{ dataSlotId: 'slot-x', columnId: 'x', status: 'valid' }],
      diagnostics: [],
    };
    expect(JSON.parse(JSON.stringify(value))).toEqual(value);
  });
});
