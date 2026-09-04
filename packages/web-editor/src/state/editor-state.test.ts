import { inferDataBindingSet, parseCsvText } from '@plot-fig/data-binding';
import { describe, expect, it } from 'vitest';
import { defaultTemplate, rebindEditorData } from './editor-state.js';

function sourceData() {
  const parsed = parseCsvText(
    'X,Y,Time,Signal,Group\n0,1,10,7,A\n1,2,20,5,B',
    'sample.csv',
  );
  if (!parsed.ok) throw new Error('fixture must parse');
  return inferDataBindingSet(parsed.rows, 'sample.csv');
}

describe('editor rebinding', () => {
  it('applies the complete override map without mutating inputs', () => {
    const template = defaultTemplate();
    const data = sourceData();
    const beforeTemplate = structuredClone(template);
    const beforeData = structuredClone(data);

    const state = rebindEditorData(template, data, {
      'slot-x': 'time',
      'slot-y': 'signal',
    });

    expect(state.status).toBe('ready');
    expect(state.overrides).toEqual({
      'slot-x': 'time',
      'slot-y': 'signal',
    });
    expect(state.data?.bindings).toEqual([
      { dataSlotId: 'slot-x', columnId: 'time', status: 'valid' },
      { dataSlotId: 'slot-y', columnId: 'signal', status: 'valid' },
    ]);
    expect(template).toEqual(beforeTemplate);
    expect(data).toEqual(beforeData);
  });

  it('clears the SVG for an incompatible override and recovers cleanly', () => {
    const template = defaultTemplate();
    const invalid = rebindEditorData(template, sourceData(), {
      'slot-y': 'group',
    });

    expect(invalid.status).toBe('error');
    expect(invalid.svg).toBeUndefined();
    expect(invalid.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'COLUMN_TYPE_CONFLICT' }),
      ]),
    );

    const recovered = rebindEditorData(template, invalid.data!, {
      'slot-y': 'signal',
    });

    expect(recovered.status).toBe('ready');
    expect(recovered.svg).toContain('data-role="figure"');
    expect(recovered.diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'COLUMN_TYPE_CONFLICT' }),
      ]),
    );
  });
});
