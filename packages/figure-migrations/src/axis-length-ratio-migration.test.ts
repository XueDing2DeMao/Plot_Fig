import { expect, it } from 'vitest';
import {
  createCurrentDocument,
  createCurrentTemplate,
} from '../../../tests/helpers/figure-payloads.js';
import { loadFigurePayload } from './index.js';
import { findMigrationStep } from './registry.js';

it.each(['figure-template', 'figure-document'] as const)(
  'upgrades 1.8 %s without changing content or enabling ratios',
  (kind) => {
    const input =
      kind === 'figure-template'
        ? createCurrentTemplate()
        : createCurrentDocument();
    const template =
      input.kind === 'figure-template' ? input : input.templateSnapshot;
    Object.assign(input, { schemaVersion: '1.8.0' });
    Object.assign(template, { schemaVersion: '1.8.0' });
    const panel = template.panels[0]!;
    const left = panel.axes.find((axis) => axis.dimension === 'y')!;
    panel.axes.push({
      ...structuredClone(left),
      axisId: 'right-y',
      position: 'right',
    });
    panel.yAxisAlignment = {
      leftAxisId: left.axisId,
      rightAxisId: 'right-y',
      value: 0,
    };
    panel.axes[0]!.compatibility = { unboundRange: 'panel-v1.7' };
    template.extensions = { origin: { preserved: true } };
    const original = structuredClone(input);
    const expected = structuredClone(input);
    Object.assign(expected, { schemaVersion: '1.22.0' });
    if (expected.kind === 'figure-document')
      Object.assign(expected.templateSnapshot, { schemaVersion: '1.22.0' });
    expect(loadFigurePayload(input)).toMatchObject({
      ok: true,
      value: expected,
    });
    expect(input).toEqual(original);
  },
);
it('rejects ratio fields in a frozen 1.8 payload rather than silently accepting new semantics', () => {
  const old = createCurrentTemplate();
  Object.assign(old, { schemaVersion: '1.8.0' });
  old.panels[0]!.axisLengthRatio = {
    xAxisId: 'axis-x',
    yAxisId: 'axis-y',
    ratio: 1,
  };
  expect(loadFigurePayload(old)).toMatchObject({
    ok: false,
    diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
  });
});
it.each(['figure-template', 'figure-document'] as const)(
  'registers a fixed 1.8 to 1.9 step for %s',
  (kind) => {
    expect(findMigrationStep(kind, '1.8.0')).toMatchObject({
      targetVersion: '1.9.0',
      migrate: expect.any(Function),
    });
  },
);
