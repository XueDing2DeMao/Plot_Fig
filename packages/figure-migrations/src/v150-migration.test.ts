import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { loadFigurePayload } from './load.js';
import { findMigrationStep } from './registry.js';
it.each(['template', 'document'])(
  'migrates 1.4 %s without allowing new fields to bypass the old version',
  async (kind) => {
    const input = JSON.parse(
      await readFile(
        new URL(
          `../../../tests/fixtures/migrations/figure-${kind}-v1.4.0.json`,
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const axis =
      kind === 'template'
        ? input.panels[0].axes[0]
        : input.templateSnapshot.panels[0].axes[0];
    const before = structuredClone(input);
    expect(loadFigurePayload(input)).toMatchObject({
      ok: true,
      value: { schemaVersion: '1.22.0' },
    });
    expect(input).toEqual(before);
    for (const patch of [
      { rescale: { mode: 'auto' } },
      { range: { mode: 'min-only', min: 0 } },
      { range: { mode: 'max-only', max: 10 } },
    ]) {
      const saved = structuredClone(axis);
      Object.assign(axis, patch);
      expect(loadFigurePayload(input)).toMatchObject({
        ok: false,
        diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
      });
      for (const key of Object.keys(axis)) delete axis[key];
      Object.assign(axis, saved);
    }
    expect(
      findMigrationStep(
        `figure-${kind}` as 'figure-template' | 'figure-document',
        '1.4.0',
      )?.targetVersion,
    ).toBe('1.5.0');
  },
);
