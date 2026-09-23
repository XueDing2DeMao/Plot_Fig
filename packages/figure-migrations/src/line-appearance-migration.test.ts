import { expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import {
  createCurrentDocument,
  createCurrentTemplate,
} from '../../../tests/helpers/figure-payloads.js';
import { loadFigurePayload } from './index.js';
import { findMigrationStep } from './registry.js';

it.each(['figure-template', 'figure-document'] as const)(
  'migrates frozen 1.10 %s without adding appearance defaults',
  (kind) => {
    const input =
      kind === 'figure-template'
        ? createCurrentTemplate()
        : createCurrentDocument();
    const template =
      input.kind === 'figure-template' ? input : input.templateSnapshot;
    Object.assign(input, { schemaVersion: '1.10.0' });
    Object.assign(template, { schemaVersion: '1.10.0' });
    const original = structuredClone(input),
      expected = structuredClone(input);
    Object.assign(expected, { schemaVersion: '1.22.0' });
    if (expected.kind === 'figure-document')
      Object.assign(expected.templateSnapshot, { schemaVersion: '1.22.0' });
    expect(CURRENT_SCHEMA_VERSION).toBe('1.22.0');
    expect(findMigrationStep(kind, '1.10.0')?.targetVersion).toBe('1.11.0');
    expect(loadFigurePayload(input)).toMatchObject({
      ok: true,
      value: expected,
    });
    expect(input).toEqual(original);
    Object.assign((template.panels[0]!.plotSlots[0] as any).lineStyle, {
      cap: 'round',
    });
    expect(loadFigurePayload(input)).toMatchObject({ ok: false });
  },
);
it('accepts advanced stroke properties in the formal schema', () => {
  const template = createCurrentTemplate();
  Object.assign((template.panels[0]!.plotSlots[0] as any).lineStyle, {
    cap: 'round',
    join: 'bevel',
    miterLimit: 4,
    opacity: 0.625,
    customDash: { lengthsPt: [8, 3, 1, 3], offsetPt: -0.5 },
  });
  expect(validateFigureTemplate(template).ok).toBe(true);
});
it.each([
  { cap: 'triangle' },
  { join: 'arcs' },
  { opacity: -0.01 },
  { opacity: 1.01 },
  { miterLimit: 0.99 },
  { miterLimit: 100.01 },
  { customDash: { lengthsPt: [1, 2, 3] } },
  { customDash: { lengthsPt: [0, 1] } },
  { customDash: { lengthsPt: [1, 1001] } },
  { customDash: { lengthsPt: Array(18).fill(1) } },
  { customDash: { lengthsPt: [1, 2], offsetPt: -10001 } },
  { customDash: { lengthsPt: [1, 2], offsetPt: Infinity } },
  { customDash: { lengthsPt: [1, 2], extra: true } },
])('rejects invalid advanced properties in the formal schema %j', (patch) => {
  const template = createCurrentTemplate();
  Object.assign((template.panels[0]!.plotSlots[0] as any).lineStyle, patch);
  expect(validateFigureTemplate(template).ok).toBe(false);
});
it('rejects curve-only properties on axis grids and annotation strokes', () => {
  for (const location of ['grid', 'annotation']) {
    const template = createCurrentTemplate() as any;
    const style = {
      visible: true,
      color: '#000000',
      widthPt: 1,
      dash: 'solid',
    };
    if (location === 'grid') template.panels[0].axes[0].grid = { major: style };
    else
      template.annotations.push({
        kind: 'arrow',
        annotationId: 'line-check',
        coordinateSpace: 'page',
        start: { x: 10, y: 10 },
        end: { x: 30, y: 30 },
        shapeStyle: {
          line: style,
          fill: 'none',
          opacity: 1,
          arrowHead: 'none',
          arrowSizePt: 6,
        },
      });
    // 先证实基础载荷合法，防止错误夹具掩盖越界字段。
    expect(validateFigureTemplate(template).ok).toBe(true);
    Object.assign(style, { cap: 'round' });
    expect(validateFigureTemplate(template).ok).toBe(false);
  }
});
