import { describe, expect, it } from 'vitest';
import { bindDataSlots, inferDataBindingSet } from '@plot-fig/data-binding';
import { defaultTemplate } from './editor-state.js';
import { parseProjectFile, serializeProjectFile } from './project-file.js';

const csvText = 'X,Y\n0,1\n1,3\n';

function createData() {
  const template = defaultTemplate();
  return bindDataSlots(
    template,
    inferDataBindingSet(
      [
        ['X', 'Y'],
        ['0', '1'],
        ['1', '3'],
      ],
      'xy.csv',
    ),
  );
}

describe('project file', () => {
  it('serializes a deterministic project envelope and parses it back', () => {
    const template = defaultTemplate();
    const data = createData();
    const first = serializeProjectFile(template, data, csvText);
    expect(first).toBe(serializeProjectFile(template, data, csvText));
    expect(JSON.parse(first)).toMatchObject({
      kind: 'plot-fig-project',
      version: '1.0.0',
      document: { kind: 'figure-document', schemaVersion: '1.22.0' },
      data: { sourceName: 'xy.csv', csvText },
    });
    expect(parseProjectFile(first)).toMatchObject({
      ok: true,
      sourceName: 'xy.csv',
      csvText,
    });
  });

  it('returns diagnostics for malformed, future and oversized files', () => {
    expect(parseProjectFile('{')).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'PROJECT_INVALID' }],
    });
    expect(
      parseProjectFile(
        JSON.stringify({ kind: 'plot-fig-project', version: '99.0.0' }),
      ),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'PROJECT_VERSION_UNSUPPORTED' }],
    });
    expect(parseProjectFile('x'.repeat(10_000_001))).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'PROJECT_TOO_LARGE' }],
    });
  });
});
