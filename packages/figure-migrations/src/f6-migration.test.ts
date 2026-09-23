import { expect, it } from 'vitest';
import {
  createCurrentDocument,
  createCurrentTemplate,
} from '../../../tests/helpers/figure-payloads.js';
import { loadFigurePayload } from './load.js';
import { migrateV1190ToV1200 } from './migrations/v1.19.0-to-v1.20.0.js';

it.each(['figure-template', 'figure-document'] as const)(
  'migrates a frozen 1.19 %s without changing its content',
  (kind) => {
    const input: any =
      kind === 'figure-template'
        ? createCurrentTemplate()
        : createCurrentDocument();
    input.schemaVersion = '1.19.0';
    if (kind === 'figure-document')
      input.templateSnapshot.schemaVersion = '1.19.0';
    const before = structuredClone(input),
      migrated: any = migrateV1190ToV1200(input);
    expect(input).toEqual(before);
    expect(migrated).toEqual({
      ...before,
      schemaVersion: '1.20.0',
      ...(kind === 'figure-document'
        ? {
            templateSnapshot: {
              ...before.templateSnapshot,
              schemaVersion: '1.20.0',
            },
          }
        : {}),
    });
    expect(loadFigurePayload(before)).toMatchObject({
      ok: true,
      value: {
        ...migrated,
        schemaVersion: '1.22.0',
        ...(kind === 'figure-document'
          ? {
              templateSnapshot: {
                ...migrated.templateSnapshot,
                schemaVersion: '1.22.0',
              },
            }
          : {}),
      },
    });
  },
);

it('rejects F6-only fields disguised as schema 1.19', () => {
  const input: any = createCurrentTemplate();
  input.schemaVersion = '1.19.0';
  input.panels[0].plotSlots[0].overlap = 0.25;
  expect(() => migrateV1190ToV1200(input)).toThrow('1.19.0图形结构无效');
});
