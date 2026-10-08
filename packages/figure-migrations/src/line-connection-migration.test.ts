import { CURRENT_SCHEMA_VERSION } from '@plot-fig/figure-schema';
import { expect, it } from 'vitest';
import {
  createCurrentDocument,
  createCurrentTemplate,
} from '../../../tests/helpers/figure-payloads.js';
import { loadFigurePayload } from './index.js';
import { findMigrationStep } from './registry.js';

it.each(['figure-template', 'figure-document'] as const)(
  'upgrades frozen 1.9 %s without enabling new line modes',
  (kind) => {
    const input =
      kind === 'figure-template'
        ? createCurrentTemplate()
        : createCurrentDocument();
    const template =
      input.kind === 'figure-template' ? input : input.templateSnapshot;
    Object.assign(input, { schemaVersion: '1.9.0' });
    Object.assign(template, { schemaVersion: '1.9.0' });
    const original = structuredClone(input);
    const expected = structuredClone(input);
    Object.assign(expected, { schemaVersion: CURRENT_SCHEMA_VERSION });
    if (expected.kind === 'figure-document')
      Object.assign(expected.templateSnapshot, {
        schemaVersion: CURRENT_SCHEMA_VERSION,
      });
    expect(loadFigurePayload(input)).toMatchObject({
      ok: true,
      value: expected,
    });
    expect(input).toEqual(original);
    expect(findMigrationStep(kind, '1.9.0')?.targetVersion).toBe('1.10.0');
    Object.assign(template.panels[0]!.plotSlots[0]!, {
      lineConnection: 'spline',
    });
    expect(loadFigurePayload(input)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
    });
  },
);
