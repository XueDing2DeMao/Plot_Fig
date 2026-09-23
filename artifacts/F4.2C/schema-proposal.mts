import {
  templateV1110Schema,
  documentV1110Schema,
} from '../../packages/figure-schema/src/validation/history/v1110-schema.js';
import { createRequire } from 'node:module';
import { canonicalizeFigurePayload } from '../../packages/figure-schema/src/canonicalize.js';
const require = createRequire(
  new URL('../../packages/figure-schema/package.json', import.meta.url),
);
const Ajv = require('ajv/dist/2020.js').default,
  ajv = new Ajv({ strict: true, allErrors: true });
require('ajv-formats')(ajv);
const kinds = ['figure-template', 'figure-document'] as const;
type Kind = (typeof kinds)[number];
const current = (kind: Kind): any =>
  structuredClone(
    kind === 'figure-template' ? templateV1110Schema : documentV1110Schema,
  );
const object = (
  properties: Record<string, unknown>,
  required: string[] = [],
) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  ...(required.length ? { required } : {}),
});
const number = (minimum: number, maximum: number) => ({
  type: 'number',
  minimum,
  maximum,
});
const color = { type: 'string', minLength: 1, maxLength: 128, pattern: '\\S' };
const target = {
  anyOf: [
    object({ mode: { type: 'string', enum: ['axis-min', 'axis-max'] } }, [
      'mode',
    ]),
    object({ mode: { const: 'value' }, value: { type: 'number' } }, [
      'mode',
      'value',
    ]),
  ],
};
const drop = object(
  {
    target,
    style: object(
      {
        color,
        widthPt: number(0, 100),
        dash: {
          type: 'string',
          enum: ['solid', 'dashed', 'dotted', 'dash-dot'],
        },
      },
      ['color', 'widthPt', 'dash'],
    ),
  },
  ['target'],
);
export const extrasProperties = {
  closeLine: { type: 'boolean' },
  symbolGapPct: number(0, 256),
  lineArrows: object(
    {
      position: { type: 'string', enum: ['start', 'end', 'both', 'repeat'] },
      lengthPt: number(1, 100),
      angleDeg: number(10, 120),
      spacingFactor: number(1, 100),
      curveTolerance: number(1, 10),
      color,
    },
    ['position', 'lengthPt', 'angleDeg'],
  ),
  dropLines: object({ horizontal: drop, vertical: drop }),
};
export function proposalSchema(kind: Kind) {
  const schema = current(kind);
  schema.$id = schema.$id.replace('1.11.0', '1.12.0');
  schema.properties.schemaVersion.const = '1.12.0';
  const template =
    kind === 'figure-template' ? schema : schema.properties.templateSnapshot;
  template.properties.schemaVersion.const = '1.12.0';
  const xy =
    template.properties.panels.items.properties.plotSlots.items.anyOf.find(
      (plot: any) => plot.properties.kind.const === 'xy',
    );
  Object.assign(xy.properties, structuredClone(extrasProperties));
  return schema;
}
export const proposalValidators = Object.fromEntries(
  kinds.map((kind) => [kind, ajv.compile(proposalSchema(kind))]),
);
const currentValidators = Object.fromEntries(
  kinds.map((kind) => [kind, ajv.compile(current(kind))]),
);
export function migrateProposal(input: unknown) {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (!kinds.includes(next?.kind) || !currentValidators[next.kind](next))
    throw new Error('1.11.0 图形结构无效');
  next.schemaVersion = '1.12.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.12.0';
  return next;
}
