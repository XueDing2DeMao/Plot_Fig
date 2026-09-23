import { withoutMigratedPlainText } from '../../../tests/helpers/figure-payloads.js';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadFigurePayload } from './load.js';
import { findMigrationStep } from './registry.js';

async function legacy(kind: string, version: string) {
  const fixtureVersion =
    version === '0.1.0' || version === '1.3.0' ? version : '1.2.0';
  const value = JSON.parse(
    await readFile(
      new URL(
        '../../../tests/fixtures/migrations/figure-' +
          kind +
          '-v' +
          fixtureVersion +
          '.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  value.schemaVersion = version;
  if (kind === 'document') value.templateSnapshot.schemaVersion = version;
  return value;
}

const supported = [
  ['template', '0.1.0'],
  ...['template', 'document'].flatMap((kind) =>
    ['1.0.0', '1.1.0', '1.2.0', '1.3.0'].map((version) => [kind, version]),
  ),
];

const newFields: Array<[string, unknown]> = [
  ['placement', { mode: 'frame' }],
  ['grid', {}],
  ['line.visible', true],
  ['majorTicks.direction', 'out'],
  ['majorTicks.color', '#111'],
  ['minorTicks.direction', 'out'],
  ['minorTicks.color', '#111'],
  ['minorTicks.lengthMode', 'manual'],
  ['tickLabels.notation', 'engineering'],
  ['tickLabels.prefix', ''],
  ['tickLabels.suffix', ''],
  ['tickLabels.divisor', 1],
  ['tickLabels.bold', false],
  ['tickLabels.italic', false],
  ['tickLabels.background', 'none'],
  ['tickLabels.anchor', 'middle'],
  ['tickLabels.position', 'tick'],
  ['tickLabels.rotation', 0],
  ['tickLabels.offsetPt', { x: 0, y: 0 }],
  ['tickLabels.wrapWidthPt', 40],
  ['tickLabels.lineHeight', 1.2],
  ['tickLabels.overlap', 'keep'],
  ['title.bold', false],
  ['title.italic', false],
  ['title.position', 0.5],
  ['title.rotation', 0],
  ['title.offsetPt', { x: 0, y: 0 }],
];

function set(value: any, path: string, property: unknown) {
  const segments = path.split('.');
  let target = value;
  for (const segment of segments.slice(0, -1)) target = target[segment] ??= {};
  target[segments.at(-1)!] = property;
}

describe('complete migration paths to 1.4.0', () => {
  it.each(supported)(
    'upgrades %s %s without inserting appearance defaults',
    async (kind, version) => {
      const input = await legacy(kind!, version!);
      const before = structuredClone(input);
      const result = loadFigurePayload(input);
      expect(result).toMatchObject({
        ok: true,
        migratedFrom: version,
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

  it.each(newFields)(
    'rejects 1.3 presence of %s even when set to its default',
    async (path, property) => {
      for (const kind of ['template', 'document']) {
        const input = await legacy(kind, '1.3.0');
        const template = kind === 'document' ? input.templateSnapshot : input;
        set(template.panels[0].axes.at(-1), path, property);
        expect(loadFigurePayload(input)).toMatchObject({
          ok: false,
          diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
        });
      }
    },
  );

  it.each(supported)(
    'applies the new barrier to the entire %s %s chain',
    async (kind, version) => {
      const input = await legacy(kind!, version!);
      const template = kind === 'document' ? input.templateSnapshot : input;
      template.panels[0].axes.at(-1).line.visible = true;
      expect(loadFigurePayload(input)).toMatchObject({
        ok: false,
        diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
      });
    },
  );

  it('retains legal generation and does not recursively inspect Origin extensions', async () => {
    const input = await legacy('template', '1.3.0');
    input.panels[0].axes[0].extensions = {
      origin: {
        placement: { mode: 'frame' },
        line: { visible: true },
        notation: 'engineering',
        grid: {},
      },
    };
    const before = structuredClone(input);
    const result = loadFigurePayload(input);
    expect(result).toMatchObject({ ok: true });
    if (result.ok)
      expect(withoutMigratedPlainText(result.value)).toEqual({
        ...before,
        schemaVersion: '1.22.0',
      });
    expect(input).toEqual(before);
  });

  it('keeps the 1.2 generation barrier active before applying the 1.3 appearance barrier', async () => {
    const input = await legacy('template', '1.2.0');
    input.panels[0].axes[0].majorTicks.generation = { mode: 'auto' };
    expect(loadFigurePayload(input)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
    });
  });

  it.each(['1.2.0', '1.4.0'])(
    'rejects 1.3 documents whose snapshot version is %s',
    async (version) => {
      const input = await legacy('document', '1.3.0');
      input.templateSnapshot.schemaVersion = version;
      expect(loadFigurePayload(input)).toMatchObject({
        ok: false,
        diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
      });
    },
  );

  it('rejects unsafe historical accessors without invoking them', async () => {
    const input = await legacy('template', '1.3.0');
    let calls = 0;
    Object.defineProperty(input.panels[0].axes[0], 'grid', {
      enumerable: true,
      get() {
        calls++;
        return {};
      },
    });
    expect(loadFigurePayload(input)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
    });
    expect(calls).toBe(0);
  });

  it.each(['template', 'document'])(
    'registers %s 1.3 to the fixed 1.4 target',
    (kind) => {
      expect(
        findMigrationStep(
          ('figure-' + kind) as 'figure-template' | 'figure-document',
          '1.3.0',
        ),
      ).toMatchObject({
        targetVersion: '1.4.0',
        migrate: expect.any(Function),
      });
    },
  );

  it.each(['template', 'document'])(
    'loads current %s appearance without migration',
    async (kind) => {
      const input = await legacy(kind, '1.3.0');
      input.schemaVersion = '1.22.0';
      const template = kind === 'document' ? input.templateSnapshot : input;
      template.schemaVersion = '1.22.0';
      template.panels[0].axes[0].line.visible = false;
      template.panels[0].axes[0].tickLabels.suffix = ' units';
      expect(loadFigurePayload(input)).toEqual({
        ok: true,
        value: input,
        diagnostics: [],
      });
    },
  );
});
import { withoutLegacyAxisRangeFlags } from '../../../tests/helpers/figure-payloads.js';
