import {
  templateV1100Schema,
  documentV1100Schema,
} from '../../packages/figure-schema/src/validation/history/v1100-schema.js';
const frozenSchema = (kind: string) =>
  structuredClone(
    kind === 'figure-template' ? templateV1100Schema : documentV1100Schema,
  ) as any;
import { createRequire } from 'node:module';
import { canonicalizeFigurePayload } from '../../packages/figure-schema/src/canonicalize.js';

// 独立的保存格式提案；不写入现有 schema、迁移注册或应用入口。
const require = createRequire(
  new URL('../../packages/figure-schema/package.json', import.meta.url),
);
const Ajv = require('ajv/dist/2020.js').default;
const ajv = new Ajv({ strict: true, allErrors: true });
require('ajv-formats')(ajv);

export function proposalSchema(kind: 'figure-template' | 'figure-document') {
  const schema = frozenSchema(kind);
  schema.$id = schema.$id.replace('1.10.0', '1.11.0');
  schema.properties.schemaVersion.const = '1.11.0';
  const template =
    kind === 'figure-template' ? schema : schema.properties.templateSnapshot;
  template.properties.schemaVersion.const = '1.11.0';
  for (const plot of template.properties.panels.items.properties.plotSlots.items
    .anyOf) {
    if (!['xy', 'area', 'box', 'contour'].includes(plot.properties.kind.const))
      continue;
    Object.assign(plot.properties.lineStyle.properties, {
      cap: { type: 'string', enum: ['butt', 'round', 'square'] },
      join: { type: 'string', enum: ['miter', 'round', 'bevel'] },
      miterLimit: { type: 'number', minimum: 1, maximum: 100 },
      opacity: { type: 'number', minimum: 0, maximum: 1 },
      customDash: {
        type: 'object',
        additionalProperties: false,
        required: ['lengthsPt'],
        properties: {
          lengthsPt: {
            type: 'array',
            items: { type: 'number', minimum: 0.1, maximum: 1000 },
            anyOf: [2, 4, 6, 8, 10, 12, 14, 16].map((count) => ({
              minItems: count,
              maxItems: count,
            })),
          },
          offsetPt: { type: 'number', minimum: -10000, maximum: 10000 },
        },
      },
    });
  }
  return schema;
}

export const proposalValidators = Object.fromEntries(
  ['figure-template', 'figure-document'].map((kind) => [
    kind,
    ajv.compile(proposalSchema(kind as 'figure-template' | 'figure-document')),
  ]),
);
const currentValidators = Object.fromEntries(
  ['figure-template', 'figure-document'].map((kind) => [
    kind,
    ajv.compile(frozenSchema(kind)),
  ]),
);

export function migrateProposal(input: unknown) {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !currentValidators[next.kind](next)
  )
    throw new Error('1.10.0 图形结构无效');
  next.schemaVersion = '1.11.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.11.0';
  return next;
}
