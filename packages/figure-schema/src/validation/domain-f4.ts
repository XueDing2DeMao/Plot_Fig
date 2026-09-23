import type { PlotSlot } from '../schema/plot-slot.js';
import { validateLineMapping } from '../schema/line-mapping.js';
import { validateDataLabels, validateLabelOverrides } from '../schema/data-labels.js';
import { validateErrorDetails } from '../schema/error-details.js';
import { validateCurveSubset } from '../schema/curve-groups.js';
import { validateCurveTransform } from '../schema/curve-transforms.js';

export function f4ParameterIssues(plot: PlotSlot): Array<[string,string]> {
  const issues: Array<[string,string]> = [];
  const checks = {lineMapping:validateLineMapping,dataLabels:validateDataLabels,labelOverrides:validateLabelOverrides,errorDetails:validateErrorDetails,subset:validateCurveSubset,transform:validateCurveTransform};
  for (const [key,check] of Object.entries(checks)) {
    const value = (plot as unknown as Record<string,unknown>)[key];
    if (value === undefined) continue;
    try { check(value); } catch(error) { issues.push([key,(error as Error).message]); }
  }
  if(plot.kind==='xy' && plot.lineMapping && !plot.lineStyle) issues.push(['lineMapping','线条颜色映射需要基础线条样式']);
  return issues;
}
