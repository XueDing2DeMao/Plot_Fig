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
import type { ValidationIssue, ValidationResult } from './types.js';

function domainIssue(message: string): ValidationIssue {
  return {
    code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
    path: '/',
    message,
  };
}

function withDomain<T>(
  structuralResult: ValidationResult<T>,
  validateDomain: (value: T) => ValidationResult<T>['issues'],
): ValidationResult<T> {
  if (!structuralResult.ok) {
    return structuralResult;
  }

  let issues: ValidationResult<T>['issues'];
  try {
    issues = validateDomain(structuralResult.value);
  } catch {
    issues = [domainIssue('domain validation threw unexpectedly')];
  }
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
