import { withoutMigratedPlainText } from '../../../tests/helpers/figure-payloads.js';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadFigurePayload } from './load.js';
import { findMigrationStep } from './registry.js';

async function fixture(kind = 'template', version = '1.2.0') {
  return JSON.parse(
    await readFile(
      new URL(
        `../../../tests/fixtures/migrations/figure-${kind}-v${version}.json`,
        import.meta.url,
      ),
      'utf8',
    ),
  );
}

async function legacy(kind: string, version: string) {
  if (version === '0.1.0') return fixture('template', version);
  const input = await fixture(kind);
  input.schemaVersion = version;
  if (kind === 'document') input.templateSnapshot.schemaVersion = version;
  return input;
}

const supported = [
  ['template', '0.1.0'],
  ...['template', 'document'].flatMap((kind) =>
    ['1.0.0', '1.1.0', '1.2.0'].map((version) => [kind, version]),
  ),
];

describe('1.3 migration compatibility in the current chain', () => {
  it.each(supported)(
    'migrates %s %s without losing fields',
    async (kind, version) => {
      const input = await legacy(kind!, version!);
      const before = structuredClone(input);
      const result = loadFigurePayload(input);
      expect(result).toMatchObject({
        ok: true,
        migratedFrom: version,
        diagnostics: [],
        value: { schemaVersion: '1.22.0' },
      });
      if (!result.ok) return;
      if (version === '0.1.0') {
        const { id, title, tags, ...rest } = before;
        expect(withoutLegacyAxisRangeFlags(result.value)).toEqual({
          ...rest,
          schemaVersion: '1.22.0',
          templateId: id,
          metadata: { name: title, tags },
        });
      } else {
        expect(withoutMigratedPlainText(result.value)).toEqual({
          ...before,
          schemaVersion: '1.22.0',
          ...(kind === 'document'
            ? {
                templateSnapshot: {
                  ...before.templateSnapshot,
                  schemaVersion: '1.22.0',
                },
              }
            : {}),
        });
      }
      expect(input).toEqual(before);
      expect(result.value).not.toBe(input);
    },
  );

  it.each(['template', 'document'])(
    'loads current %s without migration',
    async (kind) => {
      const input = await legacy(kind, '1.22.0');
      const template = kind === 'document' ? input.templateSnapshot : input;
      template.panels[0].axes[0].majorTicks.generation = {
        mode: 'increment',
        step: 0.2,
        anchor: -0.1,
      };
      const result = loadFigurePayload(input);
      expect(result).toEqual({ ok: true, value: input, diagnostics: [] });
    },
  );

  it.each(['template', 'document'])(
    'registers the fixed %s 1.2 to 1.3 step',
    (kind) => {
      expect(
        findMigrationStep(
          `figure-${kind}` as 'figure-template' | 'figure-document',
          '1.2.0',
        ),
      ).toMatchObject({
        targetVersion: '1.3.0',
        migrate: expect.any(Function),
      });
    },
  );

  it.each(supported)(
    'rejects new fields masquerading as %s %s',
    async (kind, version) => {
      const input = await legacy(kind!, version!);
      const template = kind === 'document' ? input.templateSnapshot : input;
      template.panels[0].axes[0].majorTicks.generation = { mode: 'auto' };
      expect(loadFigurePayload(input)).toMatchObject({
        ok: false,
        diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED', path: '/' }],
      });
    },
  );

  it.each(['1.0.0', '1.1.0', '1.2.0'])(
    'rejects mismatched snapshots in %s documents',
    async (version) => {
      for (const nestedVersion of ['1.0.0', '1.1.0', '1.2.0', '1.3.0'].filter(
        (v) => v !== version,
      )) {
        const input = await legacy('document', version);
        input.templateSnapshot.schemaVersion = nestedVersion;
        expect(loadFigurePayload(input)).toMatchObject({
          ok: false,
          diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
        });
      }
    },
  );

  it.each(supported)(
    'rejects malformed legacy structure before migration and reports final domain errors for %s %s',
    async (kind, version) => {
      const input = await legacy(kind!, version!);
      const template = kind === 'document' ? input.templateSnapshot : input;
      template.extraField = true;
      expect(loadFigurePayload(input)).toMatchObject({
        ok: false,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            code: 'FIGURE_MIGRATION_FAILED',
          }),
        ]),
      });
      delete template.extraField;
      template.panels[0].axes[0].range = { mode: 'fixed', min: 1, max: -1 };
      expect(loadFigurePayload(input)).toMatchObject({
        ok: false,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
            path: `${kind === 'document' ? '/templateSnapshot' : ''}/panels/0/axes/0/range`,
          }),
        ]),
      });
    },
  );

  it.each(['1.0.0', '1.1.0', '1.2.0'])(
    'does not invoke unsafe accessors or admit non-JSON data in %s',
    async (version) => {
      const input = await legacy('template', version);
      let calls = 0;
      Object.defineProperty(input.panels[0].axes[0].majorTicks, 'generation', {
        enumerable: true,
        get() {
          calls += 1;
          return { mode: 'auto' };
        },
      });
      expect(loadFigurePayload(input)).toMatchObject({
        ok: false,
        diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
      });
      expect(calls).toBe(0);
      const nonJson = await legacy('template', version);
      nonJson.panels[0].axes[0].line.widthPt = Infinity;
      expect(loadFigurePayload(nonJson)).toMatchObject({
        ok: false,
        diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
      });
    },
  );

  it.each(['1.22.1', '1.23.0', '2.0.0'])(
    'rejects future version %s',
    (schemaVersion) => {
      expect(
        loadFigurePayload({ kind: 'figure-template', schemaVersion }),
      ).toMatchObject({
        ok: false,
        diagnostics: [{ code: 'FIGURE_FUTURE_VERSION_UNSUPPORTED' }],
      });
    },
  );

  it.each([
    { kind: 'figure-template', schemaVersion: '1.2.1' },
    { kind: 'figure-template', schemaVersion: '1.3.1' },
    { kind: 'figure-template', schemaVersion: '0.0.9' },
    { kind: 'figure-document', schemaVersion: '0.1.0' },
  ])('keeps unregistered historical versions unsupported: %j', (input) => {
    expect(loadFigurePayload(input)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'FIGURE_VERSION_UNSUPPORTED' }],
    });
  });
});
import { withoutLegacyAxisRangeFlags } from '../../../tests/helpers/figure-payloads.js';
