import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { canonicalizeFigurePayload } from '../../packages/figure-schema/src/canonicalize.js';
import {
  validateFigureTemplateDomain,
  validateFigureDocumentDomain,
} from '../../packages/figure-schema/src/validation/domain.js';
import {
  advancedMarkerShapes,
  validateMarkerAppearance,
} from '../../packages/svg-renderer/src/marker-appearance.js';
const require = createRequire(
  new URL('../../packages/figure-schema/package.json', import.meta.url),
);
const Ajv = require('ajv/dist/2020.js').default;
const ajv = new Ajv({ strict: true, allErrors: true });
require('ajv-formats')(ajv);
const kinds = ['figure-template', 'figure-document'] as const;
type Kind = (typeof kinds)[number];
const baseline = (kind: Kind) =>
  JSON.parse(
    readFileSync(
      new URL(`./${kind}-v1.12.0.schema.json`, import.meta.url),
      'utf8',
    ),
  );
const templateOf = (schema: any, kind: Kind) =>
  kind === 'figure-template' ? schema : schema.properties.templateSnapshot;
export function proposalSchema(kind: Kind) {
  const schema = baseline(kind);
  schema.$id = schema.$id.replace('1.12.0', '1.13.0');
  schema.properties.schemaVersion.const = '1.13.0';
  const template = templateOf(schema, kind);
  template.properties.schemaVersion.const = '1.13.0';
  const xy =
    template.properties.panels.items.properties.plotSlots.items.anyOf.find(
      (p: any) => p.properties.kind.const === 'xy',
    );
  const marker = xy.properties.markerStyle;
  Object.assign(marker.properties, {
    shape: { type: 'string', enum: [...advancedMarkerShapes] },
    rotationDeg: { type: 'number', minimum: -360, maximum: 360 },
    opacity: { type: 'number', minimum: 0, maximum: 1 },
    followLineOpacity: { type: 'boolean' },
    customVertices: {
      type: 'array',
      minItems: 3,
      maxItems: 64,
      items: {
        type: 'array',
        minItems: 2,
        maxItems: 2,
        items: { type: 'number', minimum: -1, maximum: 1 },
      },
    },
  });
  marker.allOf = [
    {
      if: { properties: { shape: { const: 'custom' } }, required: ['shape'] },
      then: {
        properties: { customVertices: {} },
        required: ['customVertices'],
      },
      else: {
        not: {
          properties: { customVertices: {} },
          required: ['customVertices'],
        },
      },
    },
  ];
  return schema;
}
const oldValidators = Object.fromEntries(
  kinds.map((k) => [k, ajv.compile(baseline(k))]),
);
const validators = Object.fromEntries(
  kinds.map((k) => [k, ajv.compile(proposalSchema(k))]),
);
function domainErrors(value: any) {
  try {
    const issues =
      value.kind === 'figure-template'
        ? validateFigureTemplateDomain(value)
        : validateFigureDocumentDomain(value);
    return issues.map((issue) => `${issue.path}: ${issue.message}`);
  } catch {
    return ['图形对象引用或绑定无效'];
  }
}
export function validateProposal(value: any): string[] {
  if (!value || !kinds.includes(value.kind)) return ['未知的图形类型'];
  const validate = validators[value.kind];
  if (!validate(value))
    return validate.errors.map((e: any) => `${e.instancePath}: ${e.message}`);
  const template =
    value.kind === 'figure-template' ? value : value.templateSnapshot;
  const errors: string[] = [];
  for (const panel of template.panels)
    for (const plot of panel.plotSlots)
      if (plot.kind === 'xy' && plot.markerStyle) {
        try {
          validateMarkerAppearance(plot.markerStyle);
        } catch (e) {
          errors.push(`${plot.plotSlotId}: ${(e as Error).message}`);
        }
      }
  return [...errors, ...domainErrors(value)];
}
export function migrateProposal(input: unknown): any {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !kinds.includes(next?.kind) ||
    !oldValidators[next.kind](next) ||
    domainErrors(next).length
  )
    throw new Error('1.12.0 图形结构或引用无效');
  next.schemaVersion = '1.13.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.13.0';
  return next;
}
