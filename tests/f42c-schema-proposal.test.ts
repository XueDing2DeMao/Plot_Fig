import { expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import {
  createCurrentTemplate,
  createCurrentDocument,
} from './helpers/figure-payloads.js';
import { chartTemplate } from './helpers/chart-fixtures.js';
import {
  proposalValidators,
  migrateProposal,
} from '../artifacts/F4.2C/schema-proposal.mjs';
const extras = {
  closeLine: true,
  symbolGapPct: 25.5,
  lineArrows: {
    position: 'repeat',
    lengthPt: 7,
    angleDeg: 40,
    spacingFactor: 5,
    curveTolerance: 1.5,
  },
  dropLines: { vertical: { target: { mode: 'value', value: -0.5 } } },
};
it('integrates the approved 1.12 proposal into the application', () => {
  expect(CURRENT_SCHEMA_VERSION).toBe('1.22.0');
  const template = createCurrentTemplate();
  Object.assign(template.panels[0]!.plotSlots[0]!, extras);
  expect(validateFigureTemplate(template).ok).toBe(true);
});
it.each(['figure-template', 'figure-document'] as const)(
  'upgrades %s in the proposal by changing only version fields',
  (kind) => {
    const input =
      kind === 'figure-template'
        ? createCurrentTemplate()
        : createCurrentDocument();
    Object.assign(input, { schemaVersion: '1.11.0' });
    if (input.kind === 'figure-document')
      Object.assign(input.templateSnapshot, { schemaVersion: '1.11.0' });
    const before = structuredClone(input),
      next = migrateProposal(input),
      expected = structuredClone(input);
    Object.assign(expected, { schemaVersion: '1.12.0' });
    if (expected.kind === 'figure-document')
      Object.assign(expected.templateSnapshot, { schemaVersion: '1.12.0' });
    expect(next).toEqual(expected);
    expect(input).toEqual(before);
    const template =
      next.kind === 'figure-template' ? next : next.templateSnapshot;
    Object.assign(template.panels[0].plotSlots[0], extras);
    expect(proposalValidators[kind](next)).toBe(true);
  },
);
it.each(['toString', '__proto__', 'valueOf', 'unknown'])(
  'rejects unexpected kind %s before indexing a validator',
  (kind) => expect(() => migrateProposal({ kind })).toThrow(/1.11.0/),
);
it.each(['area', 'box', 'contour', 'bar', 'histogram', 'heatmap'])(
  'does not add XY extras to %s',
  (kind) => {
    const template = chartTemplate(kind) as any;
    template.schemaVersion = '1.12.0';
    expect(proposalValidators['figure-template'](template)).toBe(true);
    Object.assign(template.panels[0].plotSlots[0], extras);
    expect(proposalValidators['figure-template'](template)).toBe(false);
  },
);
it.each([
  { closeLine: 1 },
  { symbolGapPct: 257 },
  { symbolGapPct: -0.1 },
  { lineArrows: { position: 'none', lengthPt: 7, angleDeg: 40 } },
  {
    lineArrows: {
      position: 'repeat',
      lengthPt: 7,
      angleDeg: 40,
      spacingFactor: 0,
    },
  },
  { lineArrows: { position: 'end', lengthPt: 7, angleDeg: 121 } },
  {
    lineArrows: { position: 'end', lengthPt: 7, angleDeg: 40, color: ' \t\n' },
  },
  {
    dropLines: {
      vertical: {
        target: { mode: 'axis-min' },
        style: { color: ' \t\n', widthPt: 0.75, dash: 'solid' },
      },
    },
  },
  { dropLines: { vertical: { target: { mode: 'value' } } } },
  { dropLines: { horizontal: { target: { mode: 'axis-min', value: 0 } } } },
  { dropLines: { vertical: { target: { mode: 'value', value: Infinity } } } },
  {
    dropLines: {
      vertical: {
        target: { mode: 'axis-min' },
        style: { color: '#000000', widthPt: 101, dash: 'solid' },
      },
    },
  },
])('rejects invalid saved proposal %j', (patch) => {
  const input = createCurrentTemplate();
  Object.assign(input, { schemaVersion: '1.11.0' });
  const template = migrateProposal(input);
  Object.assign(template.panels[0].plotSlots[0], patch);
  expect(proposalValidators['figure-template'](template)).toBe(false);
  expect(validateFigureTemplate(template).ok).toBe(false);
});
