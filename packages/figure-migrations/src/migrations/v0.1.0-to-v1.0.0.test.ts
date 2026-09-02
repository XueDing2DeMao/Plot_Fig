import { readFile } from 'node:fs/promises';
import {
  canonicalizeFigurePayload,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import { describe, expect, it } from 'vitest';
import { migrateV010ToV100 } from './v0.1.0-to-v1.0.0.js';

const fixture = new URL(
  '../../../../tests/fixtures/migrations/figure-template-v0.1.0.json',
  import.meta.url,
);

const readLegacyTemplate = async () =>
  JSON.parse(await readFile(fixture, 'utf8')) as Record<string, unknown>;

describe('migrateV010ToV100', () => {
  it('renames legacy identity fields and yields a valid current template', async () => {
    const input = await readLegacyTemplate();
    const before = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
    const output = migrateV010ToV100(input) as Record<string, unknown>;

    expect(output).toMatchObject({
      kind: 'figure-template',
      schemaVersion: '1.0.0',
      templateId: 'template-basic-xy',
      metadata: { name: 'Basic XY', tags: ['xy'] },
      page: input.page,
      panels: input.panels,
      dataSlots: input.dataSlots,
      annotations: input.annotations,
      theme: input.theme,
    });
    expect(output).not.toHaveProperty('id');
    expect(output).not.toHaveProperty('title');
    expect(output).not.toHaveProperty('tags');
    expect(validateFigureTemplate(output)).toEqual({
      ok: true,
      value: output,
      issues: [],
    });
    expect(input).toEqual(before);
  });

  it('deep-clones nested data instead of sharing references', async () => {
    const input = await readLegacyTemplate();
    const output = migrateV010ToV100(input) as Record<string, unknown>;
    const panels = output.panels as Array<Record<string, unknown>>;
    const inputPanels = input.panels as Array<Record<string, unknown>>;

    expect(output).not.toBe(input);
    expect(output.page).not.toBe(input.page);
    expect(output.metadata).not.toBeUndefined();
    expect(output.metadata).not.toBe(input);
    expect(output.metadata).not.toBe(input.tags);
    expect(output.metadata).toEqual({ name: 'Basic XY', tags: ['xy'] });
    expect(panels).not.toBe(inputPanels);
    expect(panels[0]).not.toBe(inputPanels[0]);
    expect(panels[0]?.axes).not.toBe(inputPanels[0]?.axes);
    expect(panels[0]?.plotSlots).not.toBe(inputPanels[0]?.plotSlots);
    expect(output.theme).not.toBe(input.theme);
  });

  it('throws stable TypeError results for unsafe inputs without invoking getters', () => {
    let idGetterCalls = 0;
    const accessorInput = Object.assign(Object.create(null), {
      kind: 'figure-template',
      schemaVersion: '0.1.0',
      title: 'Basic XY',
      tags: ['xy'],
    });

    Object.defineProperty(accessorInput, 'id', {
      enumerable: true,
      get() {
        idGetterCalls += 1;
        return 'template-basic-xy';
      },
    });

    expect(() => migrateV010ToV100(accessorInput)).toThrowError(
      new TypeError('canonical JSON does not allow accessors at /id'),
    );
    expect(idGetterCalls).toBe(0);

    expect(() =>
      migrateV010ToV100({
        kind: 'figure-template',
        schemaVersion: '0.1.0',
        id: 'template-basic-xy',
        title: 'Basic XY',
        tags: [Symbol('xy')],
      }),
    ).toThrowError(
      new TypeError('canonical JSON contains a non-JSON value at /tags/0'),
    );

    expect(() =>
      migrateV010ToV100({
        kind: 'figure-template',
        schemaVersion: '0.1.0',
        id: 'template-basic-xy',
        title: 'Basic XY',
        tags: ['xy'],
        constructor: 'dangerous',
      }),
    ).toThrowError(
      new TypeError(
        'canonical JSON does not allow dangerous keys at /constructor',
      ),
    );
  });

  it('produces canonically stable migrated output across repeated runs', async () => {
    const input = await readLegacyTemplate();
    const first = migrateV010ToV100(input);
    const second = migrateV010ToV100(input);

    expect(canonicalizeFigurePayload(first)).toBe(
      canonicalizeFigurePayload(second),
    );
  });
});
