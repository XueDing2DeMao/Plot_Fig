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
import {
  templateV1170Schema,
  documentV1170Schema,
} from './history/v1170-schema.js';
import {
  templateV1180Schema,
  documentV1180Schema,
} from './history/v1180-schema.js';
import {
  templateV1190Schema,
  documentV1190Schema,
} from './history/v1190-schema.js';
let v1190:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV1190Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v1190 ??= {
    template: ajv.compile(templateV1190Schema),
    document: ajv.compile(documentV1190Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v1190.template : v1190.document)(input),
  );
}
let v1180:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV1180Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v1180 ??= {
    template: ajv.compile(templateV1180Schema),
    document: ajv.compile(documentV1180Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v1180.template : v1180.document)(input),
  );
}
let v1170:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV1170Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v1170 ??= {
    template: ajv.compile(templateV1170Schema),
    document: ajv.compile(documentV1170Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v1170.template : v1170.document)(input),
  );
}
import {
  templateV1160Schema,
  documentV1160Schema,
} from './history/v1160-schema.js';
let v1160:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV1160Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v1160 ??= {
    template: ajv.compile(templateV1160Schema),
    document: ajv.compile(documentV1160Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v1160.template : v1160.document)(input),
  );
}
import {
  templateV1150Schema,
  documentV1150Schema,
} from './history/v1150-schema.js';
let v1150:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV1150Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v1150 ??= {
    template: ajv.compile(templateV1150Schema),
    document: ajv.compile(documentV1150Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v1150.template : v1150.document)(input),
  );
}
import {
  templateV1140Schema,
  documentV1140Schema,
} from './history/v1140-schema.js';
let v1140:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV1140Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v1140 ??= {
    template: ajv.compile(templateV1140Schema),
    document: ajv.compile(documentV1140Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v1140.template : v1140.document)(input),
  );
}
import {
  templateV180Schema,
  documentV180Schema,
} from './history/v180-schema.js';
let v180:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV180Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v180 ??= {
    template: ajv.compile(templateV180Schema),
    document: ajv.compile(documentV180Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v180.template : v180.document)(input),
  );
}
import {
  templateV160Schema,
  documentV160Schema,
} from './history/v160-schema.js';
import {
  templateV170Schema,
  documentV170Schema,
} from './history/v170-schema.js';
let v170:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV170Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v170 ??= {
    template: ajv.compile(templateV170Schema),
    document: ajv.compile(documentV170Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v170.template : v170.document)(input),
  );
}
let v160:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV160Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v160 ??= {
    template: ajv.compile(templateV160Schema),
    document: ajv.compile(documentV160Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v160.template : v160.document)(input),
  );
}

let historical:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
import {
  templateV150Schema,
  documentV150Schema,
} from './history/v150-schema.js';
/** 迁移入口只做冻结的旧版结构检查；迁移后继续经过当前领域验证。 */
export function validateV150Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  historical ??= {
    template: ajv.compile(templateV150Schema),
    document: ajv.compile(documentV150Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? historical.template : historical.document)(
      input,
    ),
  );
}

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

import {
  templateV190Schema,
  documentV190Schema,
} from './history/v190-schema.js';
let v190:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV190Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v190 ??= {
    template: ajv.compile(templateV190Schema),
    document: ajv.compile(documentV190Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v190.template : v190.document)(input),
  );
}

import {
  templateV1100Schema,
  documentV1100Schema,
} from './history/v1100-schema.js';
let v1100:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV1100Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v1100 ??= {
    template: ajv.compile(templateV1100Schema),
    document: ajv.compile(documentV1100Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v1100.template : v1100.document)(input),
  );
}

import {
  templateV1110Schema,
  documentV1110Schema,
} from './history/v1110-schema.js';
let v1110:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV1110Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v1110 ??= {
    template: ajv.compile(templateV1110Schema),
    document: ajv.compile(documentV1110Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v1110.template : v1110.document)(input),
  );
}

import {
  templateV1120Schema,
  documentV1120Schema,
} from './history/v1120-schema.js';
let v1120:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV1120Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v1120 ??= {
    template: ajv.compile(templateV1120Schema),
    document: ajv.compile(documentV1120Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v1120.template : v1120.document)(input),
  );
}

import {
  templateV1130Schema,
  documentV1130Schema,
} from './history/v1130-schema.js';
let v1130:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV1130Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v1130 ??= {
    template: ajv.compile(templateV1130Schema),
    document: ajv.compile(documentV1130Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v1130.template : v1130.document)(input),
  );
}

import {
  templateV1210Schema,
  documentV1210Schema,
} from './history/v1210-schema.js';
let v1210:
  { template: ValidateFunction; document: ValidateFunction } | undefined;
export function validateV1210Structure(
  input: unknown,
  kind: 'figure-template' | 'figure-document',
): boolean {
  v1210 ??= {
    template: ajv.compile(templateV1210Schema),
    document: ajv.compile(documentV1210Schema),
  };
  return Boolean(
    (kind === 'figure-template' ? v1210.template : v1210.document)(input),
  );
}
