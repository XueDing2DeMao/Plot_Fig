import type { FigureDocument } from '../schema/figure-document.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import {
  validateFigureDocumentDomain,
  validateFigureTemplateDomain,
} from './domain.js';
import {
  validateFigureDocumentStructure,
  validateFigureTemplateStructure,
} from './structural.js';
import type { ValidationResult } from './types.js';

function withDomain<T>(
  structuralResult: ValidationResult<T>,
  validateDomain: (value: T) => ValidationResult<T>['issues'],
): ValidationResult<T> {
  if (!structuralResult.ok) {
    return structuralResult;
  }

  const issues = validateDomain(structuralResult.value);
  return issues.length === 0 ? structuralResult : { ok: false, issues };
}

export function validateFigureTemplate(
  input: unknown,
): ValidationResult<FigureTemplate> {
  return withDomain(
    validateFigureTemplateStructure(input),
    validateFigureTemplateDomain,
  );
}

export function validateFigureDocument(
  input: unknown,
): ValidationResult<FigureDocument> {
  return withDomain(
    validateFigureDocumentStructure(input),
    validateFigureDocumentDomain,
  );
}
