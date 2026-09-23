import { expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '@plot-fig/figure-schema';
import {
  createCurrentTemplate,
  createCurrentDocument,
} from './helpers/figure-payloads.js';
import { chartTemplate } from './helpers/chart-fixtures.js';
import {
  migrateProposal,
  proposalValidators,
} from '../artifacts/F4.2B/schema-proposal.mjs';

it('integrates the approved 1.11 proposal into the application', () => {
  expect(CURRENT_SCHEMA_VERSION).toBe('1.22.0');
});
it.each(['toString', 'valueOf', '__proto__', 'not-a-figure'])(
  'rejects an unsupported payload kind %s before looking up validators',
  (kind) => {
    expect(() => migrateProposal({ kind })).toThrow(/1.10.0/);
  },
);
it.each(['figure-template', 'figure-document'] as const)(
  'draft migration preserves %s without adding defaults',
  (kind) => {
    const input =
      kind === 'figure-template'
        ? createCurrentTemplate()
        : createCurrentDocument();
    Object.assign(input, { schemaVersion: '1.10.0' });
    if (input.kind === 'figure-document')
      Object.assign(input.templateSnapshot, { schemaVersion: '1.10.0' });
    const original = structuredClone(input),
      expected = structuredClone(input);
    Object.assign(expected, { schemaVersion: '1.11.0' });
    if (expected.kind === 'figure-document')
      Object.assign(expected.templateSnapshot, { schemaVersion: '1.11.0' });
    expect(migrateProposal(input)).toEqual(expected);
    expect(input).toEqual(original);
    expect(proposalValidators[kind](expected)).toBe(true);
    const template =
      input.kind === 'figure-template' ? input : input.templateSnapshot;
    Object.assign((template.panels[0]!.plotSlots[0] as any).lineStyle, {
      cap: 'round',
    });
    expect(() => migrateProposal(input)).toThrow(/1.10.0/);
  },
);
it.each(['xy', 'area', 'box', 'contour'])(
  'accepts advanced settings on %s plot strokes only',
  (kind) => {
    const template = chartTemplate(kind) as any;
    template.schemaVersion = '1.11.0';
    Object.assign(template.panels[0].plotSlots[0].lineStyle, {
      cap: 'round',
      join: 'bevel',
      miterLimit: 4,
      opacity: 0.25,
      customDash: { lengthsPt: [8, 3, 1, 3], offsetPt: -0.5 },
    });
    expect(proposalValidators['figure-template'](template)).toBe(true);
    template.panels[0].axes[0].line.cap = 'round';
    expect(proposalValidators['figure-template'](template)).toBe(false);
  },
);
it.each([
  { cap: 'triangle' },
  { join: 'arcs' },
  { opacity: 1.1 },
  { miterLimit: 0.5 },
  { customDash: { lengthsPt: [1, 2, 3] } },
  { customDash: { lengthsPt: [0, 2] } },
  { customDash: { lengthsPt: [1, 2], offsetPt: Infinity } },
])('rejects invalid saved style proposal %j', (patch) => {
  const template = createCurrentTemplate() as any;
  template.schemaVersion = '1.11.0';
  Object.assign(template.panels[0].plotSlots[0].lineStyle, patch);
  expect(proposalValidators['figure-template'](template)).toBe(false);
});
