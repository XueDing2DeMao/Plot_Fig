import type { FigureTemplate } from '@plot-fig/figure-schema';
import { describe, expect, it } from 'vitest';
import { bindDataSlots } from './bind.js';
import { inferDataBindingSet } from './infer.js';
import { createCurrentTemplate } from '../../../tests/helpers/figure-payloads.js';

describe('bindDataSlots', () => {
  it('matches slot names exactly before case-insensitive matching', () => {
    const template = createCurrentTemplate();
    const data = inferDataBindingSet(
      [
        ['X', 'Y'],
        ['1', '2'],
      ],
      'x.csv',
    );
    const result = bindDataSlots(template, data);
    expect(result.bindings).toEqual([
      { dataSlotId: 'slot-x', columnId: 'x', status: 'valid' },
      { dataSlotId: 'slot-y', columnId: 'y', status: 'valid' },
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('reports missing and incompatible columns without mutating the template', () => {
    const template = createCurrentTemplate();
    const before = structuredClone(template) as FigureTemplate;
    const data = inferDataBindingSet([['Label'], ['a']], 'labels.csv');
    const result = bindDataSlots(template, data);
    expect(result.bindings).toEqual([]);
    expect(result.diagnostics.map((entry) => entry.code)).toEqual([
      'SLOT_COLUMN_MISSING',
      'SLOT_COLUMN_MISSING',
    ]);
    expect(template).toEqual(before);
  });
});
