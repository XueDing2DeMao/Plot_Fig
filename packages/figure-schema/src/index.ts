export { canonicalizeFigurePayload } from './canonicalize.js';
export type {
  DataBinding,
  DataSourceDescriptor,
  FigureDocument,
} from './schema/figure-document.js';
export type { FigureTemplate } from './schema/figure-template.js';
export type { ValidationIssue, ValidationResult } from './validation/types.js';
export {
  validateFigureDocument,
  validateFigureTemplate,
} from './validation/validate.js';
