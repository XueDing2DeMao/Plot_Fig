import type { Axis } from '../schema/axis.js';
import type { ValidationIssue } from './types.js';
import { isPositiveLogAxis } from '../axis-scale.js';
import { compileAxisFormula } from '../restricted-formula.js';

function domainIssue(path: string, message: string): ValidationIssue {
  return { code: 'FIGURE_DOMAIN_INVARIANT_FAILED', path, message };
}

export function validateAxisAppearance(
  axis: Axis,
  axes: readonly Axis[],
  path: string,
  panelVisible = true,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (axis.scale === 'category') {
    if (axis.tickLabels.notation === 'engineering')
      issues.push(
        domainIssue(
          path + '/tickLabels/notation',
          'category axes do not support engineering notation',
        ),
      );
    if (axis.tickLabels.divisor !== undefined && axis.tickLabels.divisor !== 1)
      issues.push(
        domainIssue(
          path + '/tickLabels/divisor',
          'category axis divisors must equal 1',
        ),
      );
    if (axis.tickLabels.formula !== undefined)
      issues.push(
        domainIssue(
          path + '/tickLabels/formula',
          'category axes do not support numeric tick label formulas',
        ),
      );
  } else if (axis.tickLabels.formula !== undefined) {
    try {
      compileAxisFormula(axis.tickLabels.formula);
    } catch (cause) {
      issues.push(
        domainIssue(path + '/tickLabels/formula', (cause as Error).message),
      );
    }
  }
  const placement = axis.placement;
  if (!placement || placement.mode !== 'cross') return issues;
  const target = axes.find(
    (candidate) => candidate.axisId === placement.axisId,
  );
  if (
    !target ||
    target.dimension === axis.dimension ||
    target.scale === 'category'
  ) {
    issues.push(
      domainIssue(
        path + '/placement/axisId',
        'cross placement requires a numeric orthogonal axis in the same panel',
      ),
    );
    return issues;
  }
  if (isPositiveLogAxis(target) && placement.value <= 0)
    issues.push(
      domainIssue(
        path + '/placement/value',
        'logarithmic crossing values must stay positive',
      ),
    );
  else if (
    panelVisible &&
    (('min' in target.range && placement.value < target.range.min) ||
      ('max' in target.range && placement.value > target.range.max))
  )
    issues.push(
      domainIssue(
        path + '/placement/value',
        'crossing value must stay within the target axis range',
      ),
    );
  return issues;
}
