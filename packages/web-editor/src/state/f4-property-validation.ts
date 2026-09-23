import {
  validateLineMapping,
  validateDataLabels,
  validateLabelOverrides,
  validateErrorDetails,
  validateCurveSubset,
  validateCurveTransform,
  validateCurveGroupsStructure,
  validatePanelStack,
} from '@plot-fig/figure-schema';
export function validateF4Property(key: string, value: unknown): void {
  const validators: Record<string, (value: never) => void> = {
    lineMapping: validateLineMapping,
    dataLabels: validateDataLabels,
    labelOverrides: validateLabelOverrides,
    errorDetails: validateErrorDetails,
    subset: validateCurveSubset,
    transform: validateCurveTransform,
    groups: validateCurveGroupsStructure,
    stack: validatePanelStack,
  };
  const validate = validators[key];
  if (!validate) throw new Error('不支持此 F4 属性');
  validate(value as never);
}
