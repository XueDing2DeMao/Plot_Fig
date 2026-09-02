import type { ErrorObject, ValidateFunction } from 'ajv';
import type { FormatsPlugin } from 'ajv-formats';
import type { FigureDocument } from '../schema/figure-document.js';
import { FigureDocumentSchema } from '../schema/figure-document.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import { FigureTemplateSchema } from '../schema/figure-template.js';
import type { ValidationIssue, ValidationResult } from './types.js';

type Ajv2020Constructor = typeof import('ajv/dist/2020.js').Ajv2020;

const Ajv2020 = (await import('ajv/dist/2020.js'))
  .Ajv2020 as Ajv2020Constructor;
const addFormats = (await import('ajv-formats'))
  .default as unknown as FormatsPlugin;

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
});

addFormats(ajv);

const templateValidator = ajv.compile<FigureTemplate>(FigureTemplateSchema);
const documentValidator = ajv.compile<FigureDocument>(FigureDocumentSchema);

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1');
}

function appendPath(path: string, segment: string): string {
  const normalizedPath = path === '' ? '/' : path;
  const escapedSegment = escapeJsonPointerSegment(segment);
  return normalizedPath === '/'
    ? `/${escapedSegment}`
    : `${normalizedPath}/${escapedSegment}`;
}

function getIssuePath(error: ErrorObject): string {
  if (error.keyword === 'required') {
    const missingProperty = (error.params as { missingProperty?: string })
      .missingProperty;
    if (missingProperty) {
      return appendPath(error.instancePath, missingProperty);
    }
  }

  if (error.keyword === 'additionalProperties') {
    const additionalProperty = (error.params as { additionalProperty?: string })
      .additionalProperty;
    if (additionalProperty) {
      return appendPath(error.instancePath, additionalProperty);
    }
  }

  return error.instancePath || '/';
}

function mapIssue(error: ErrorObject): ValidationIssue {
  return {
    code: 'FIGURE_SCHEMA_INVALID',
    path: getIssuePath(error),
    message: error.message ?? 'schema validation failed',
  };
}

function run<T>(
  validator: ValidateFunction<T>,
  input: unknown,
): ValidationResult<T> {
  if (validator(input)) {
    return {
      ok: true,
      value: input,
      issues: [],
    };
  }

  return {
    ok: false,
    issues: (validator.errors ?? []).map(mapIssue),
  };
}

export function validateFigureTemplateStructure(
  input: unknown,
): ValidationResult<FigureTemplate> {
  return run(templateValidator, input);
}

export function validateFigureDocumentStructure(
  input: unknown,
): ValidationResult<FigureDocument> {
  return run(documentValidator, input);
}
