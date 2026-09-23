import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { canonicalizeFigurePayload } from '../../packages/figure-schema/src/canonicalize.js';
import {
  validateFigureTemplateDomain,
  validateFigureDocumentDomain,
} from '../../packages/figure-schema/src/validation/domain.js';
import { prepareDataView, demoColumn } from './data-view-model.js';
const require = createRequire(
  new URL('../../packages/figure-schema/package.json', import.meta.url),
);
const Ajv = require('ajv/dist/2020.js').default,
  ajv = new Ajv({ strict: true, allErrors: true });
require('ajv-formats')(ajv);
const kinds = ['figure-template', 'figure-document'] as const;
type Kind = (typeof kinds)[number];
const baseline = (kind: Kind) =>
  JSON.parse(
    readFileSync(
      new URL(`./${kind}-v1.13.0.schema.json`, import.meta.url),
      'utf8',
    ),
  );
const integer = { type: 'integer', minimum: 1, maximum: 100000 };
const object = (properties: object, required: string[] = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const enumString = (values: string[]) => ({ type: 'string', enum: values });
export function proposalSchema(kind: Kind) {
  const schema = baseline(kind);
  schema.$id = schema.$id.replace('1.13.0', '1.14.0');
  schema.properties.schemaVersion.const = '1.14.0';
  const template =
    kind === 'figure-template' ? schema : schema.properties.templateSnapshot;
  template.properties.schemaVersion.const = '1.14.0';
  const xy =
    template.properties.panels.items.properties.plotSlots.items.anyOf.find(
      (p: any) => p.properties.kind.const === 'xy',
    );
  const keep = {
    keepFirst: { type: 'boolean' },
    keepLast: { type: 'boolean' },
  };
  xy.properties.dataView = object({
    rowRange: object({ from: integer, to: integer }, ['from', 'to']),
    missing: enumString(['connect', 'break']),
    sort: enumString(['none', 'x-ascending', 'x-descending']),
    duplicates: enumString(['keep', 'first', 'last']),
    sampling: {
      anyOf: [
        object({ mode: { const: 'every' }, step: integer, ...keep }, [
          'mode',
          'step',
        ]),
        object({ mode: { const: 'count' }, count: integer, ...keep }, [
          'mode',
          'count',
        ]),
      ],
    },
    sampleExport: { type: 'boolean' },
    calculationSource: enumString(['raw', 'selected']),
  });
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
    return issues.map((i) => `${i.path}: ${i.message}`);
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
      value.kind === 'figure-template' ? value : value.templateSnapshot,
    errors = domainErrors(value);
  for (const panel of template.panels)
    for (const plot of panel.plotSlots)
      if (plot.kind === 'xy' && plot.dataView) {
        try {
          prepareDataView(
            demoColumn('X', []),
            demoColumn('Y', []),
            plot.dataView,
          );
        } catch (e) {
          errors.push(`${plot.plotSlotId}: ${(e as Error).message}`);
        }
      }
  return errors;
}
export function migrateProposal(input: unknown): any {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !kinds.includes(next?.kind) ||
    !oldValidators[next.kind](next) ||
    domainErrors(next).length
  )
    throw new Error('1.13.0 图形结构或引用无效');
  next.schemaVersion = '1.14.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.14.0';
  return next;
}
