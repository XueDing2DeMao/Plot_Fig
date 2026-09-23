import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {
  canonicalizeFigurePayload,
  validateV1170Structure,
} from '../../packages/figure-schema/src/index.js';
import {
  numericScaleCapability,
  createNumericScale,
} from '../../packages/svg-renderer/src/advanced-scale.js';
import { planNumericScaleTicks } from '../../packages/svg-renderer/src/advanced-scale-ticks.js';
const require = createRequire(
  new URL('../../packages/figure-schema/package.json', import.meta.url),
);
const Ajv = require('ajv/dist/2020.js').default,
  ajv = new Ajv({ strict: true, allErrors: true });
require('ajv-formats')(ajv);
type Kind = 'figure-template' | 'figure-document';
const kinds: Kind[] = ['figure-template', 'figure-document'];
export function proposalSchema(kind: Kind) {
  const schema = JSON.parse(
    readFileSync(
      new URL(`./${kind}-v1.17.0.schema.json`, import.meta.url),
      'utf8',
    ),
  );
  schema.$id += '?candidate=1.18.0-f51a';
  schema.properties.schemaVersion.const = '1.18.0';
  const template =
    kind === 'figure-template' ? schema : schema.properties.templateSnapshot;
  template.properties.schemaVersion.const = '1.18.0';
  for (const axis of template.properties.panels.items.properties.axes.items
    .anyOf) {
    axis.properties.scale.anyOf.push({ type: 'string', const: 'log2' });
    axis.properties.symLog = {
      type: 'object',
      additionalProperties: false,
      required: ['threshold', 'linearLength'],
      properties: {
        threshold: { type: 'number', exclusiveMinimum: 0 },
        linearLength: { type: 'number', exclusiveMinimum: 0, maximum: 100 },
      },
    };
    axis.properties.logTicks = {
      type: 'object',
      additionalProperties: false,
      required: ['mode'],
      properties: {
        mode: { type: 'string', enum: ['logarithmic', 'origin-log10'] },
      },
    };
  }
  return schema;
}
const validators = Object.fromEntries(
  kinds.map((kind) => [kind, ajv.compile(proposalSchema(kind))]),
);
/** 候选结构与单轴数值校验；正式跨图型/共享轴领域校验在确认后的接入批完成。 */
export function validateCandidate(input: unknown): string[] {
  const value = input as any;
  if (!value || !kinds.includes(value.kind)) return ['未知图形类型'];
  const validate = validators[value.kind];
  if (!validate(value))
    return validate.errors.map(
      (error: any) => error.instancePath + ': ' + error.message,
    );
  const template =
      value.kind === 'figure-template' ? value : value.templateSnapshot,
    errors: string[] = [];
  for (const panel of template.panels)
    for (const axis of panel.axes) {
      const advanced =
        axis.scale === 'log2' ||
        axis.symLog !== undefined ||
        axis.logTicks !== undefined;
      if (!advanced) continue;
      try {
        const spec = {
            kind: axis.scale,
            ...(axis.symLog ? { symLog: axis.symLog } : {}),
          },
          cap = numericScaleCapability(spec);
        if (
          axis.logTicks &&
          ((axis.scale !== 'log10' && axis.logTicks.mode === 'origin-log10') ||
            axis.symLog ||
            axis.scale === 'linear')
        )
          throw new Error('对数刻度策略与尺度不兼容');
        for (const endpoint of [axis.range.min, axis.range.max])
          if (endpoint !== undefined && !cap.accepts(endpoint))
            throw new Error('范围端点不在有效定义域');
        const generation = axis.majorTicks.generation;
        if (generation?.anchor !== undefined && !cap.accepts(generation.anchor))
          throw new Error('主刻度锚点不在尺度定义域内');
        if (axis.range.mode === 'fixed')
          planNumericScaleTicks(
            createNumericScale(
              spec,
              axis.range.min,
              axis.range.max,
              axis.reverse,
            ),
            {
              major: axis.majorTicks.generation,
              minorCount: axis.minorTicks.count,
              minorVisible: axis.minorTicks.visible,
              logPolicy: axis.logTicks?.mode ?? 'legacy',
            },
          );
      } catch (error) {
        errors.push(`${axis.axisId}: ${(error as Error).message}`);
      }
    }
  return errors;
}
export function migrateCandidate(input: unknown): any {
  const value = JSON.parse(canonicalizeFigurePayload(input));
  if (!['figure-template','figure-document'].includes(value.kind) || !validateV1170Structure(value,value.kind))
    throw new Error('候选迁移只接收合法的1.17模板或文档');
  value.schemaVersion = '1.18.0';
  if (value.kind === 'figure-document')
    value.templateSnapshot.schemaVersion = '1.18.0';
  const errors = validateCandidate(value);
  if (errors.length) throw new Error(errors.join('；'));
  return value;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  for (const kind of kinds)
    writeFileSync(
      new URL(`./${kind}-v1.18.0.candidate.schema.json`, import.meta.url),
      JSON.stringify(proposalSchema(kind), null, 2) + '\n',
    );
