import type { Axis } from '../schema/axis.js';
import type { FigureTemplate, Panel } from '../schema/figure-template.js';
import type { PlotBindings, PlotSlot } from '../schema/plot-slot.js';
import type { ValidationIssue } from './types.js';

const BINDING_KEYS = [
  'x',
  'y',
  'xError',
  'xErrorLower',
  'xErrorUpper',
  'yError',
  'yErrorLower',
  'yErrorUpper',
  'group',
  'label',
  'color',
  'size',
] as const satisfies ReadonlyArray<keyof PlotBindings>;

function domainIssue(path: string, message: string): ValidationIssue {
  return {
    code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
    path,
    message,
  };
}

function validateAxisRange(axis: Axis, path: string): ValidationIssue[] {
  if (axis.range.mode !== 'fixed') {
    return [];
  }
  if (axis.range.min >= axis.range.max) {
    return [domainIssue(path, 'fixed axis ranges require min < max')];
  }
  if (axis.scale !== 'linear' && axis.range.min <= 0) {
    return [domainIssue(path, 'logarithmic axis ranges must stay positive')];
  }
  return [];
}

function validateAxisReferences(
  panel: Panel,
  plotSlot: PlotSlot,
  path: string,
): ValidationIssue[] {
  const xAxis = panel.axes.find((axis) => axis.axisId === plotSlot.xAxisId);
  const yAxis = panel.axes.find((axis) => axis.axisId === plotSlot.yAxisId);
  const issues: ValidationIssue[] = [];

  if (!xAxis || xAxis.dimension !== 'x') {
    issues.push(
      domainIssue(
        `${path}/xAxisId`,
        'xAxisId must reference an x axis in the same panel',
      ),
    );
  }
  if (!yAxis || yAxis.dimension !== 'y') {
    issues.push(
      domainIssue(
        `${path}/yAxisId`,
        'yAxisId must reference a y axis in the same panel',
      ),
    );
  }

  return issues;
}

function validateBindingReferences(
  bindings: PlotBindings,
  slots: Map<string, FigureTemplate['dataSlots'][number]>,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const key of BINDING_KEYS) {
    const slotId = bindings[key];
    if (slotId === undefined) {
      continue;
    }
    const slot = slots.get(slotId);
    if (!slot) {
      issues.push(
        domainIssue(`${path}/${key}`, `missing data slot "${slotId}"`),
      );
      continue;
    }
    if (slot.role !== key) {
      issues.push(
        domainIssue(`${path}/${key}`, `data slot role must be "${key}"`),
      );
    }
  }

  return issues;
}

function validateErrorPair(
  bindings: PlotBindings,
  prefix: 'x' | 'y',
  path: string,
): ValidationIssue[] {
  const symmetric = bindings[`${prefix}Error`];
  const lower = bindings[`${prefix}ErrorLower`];
  const upper = bindings[`${prefix}ErrorUpper`];

  if (symmetric && (lower || upper)) {
    return [
      domainIssue(
        `${path}/${prefix}Error`,
        'symmetric and asymmetric error bindings are mutually exclusive',
      ),
    ];
  }
  if (lower && !upper) {
    return [
      domainIssue(
        `${path}/${prefix}ErrorLower`,
        'asymmetric error bindings require both lower and upper slots',
      ),
    ];
  }
  if (!lower && upper) {
    return [
      domainIssue(
        `${path}/${prefix}ErrorUpper`,
        'asymmetric error bindings require both lower and upper slots',
      ),
    ];
  }
  return [];
}

function validatePlotSlot(
  panel: Panel,
  plotSlot: PlotSlot,
  panelIndex: number,
  plotSlotIndex: number,
  slots: Map<string, FigureTemplate['dataSlots'][number]>,
): ValidationIssue[] {
  const path = `/panels/${panelIndex}/plotSlots/${plotSlotIndex}`;

  return [
    ...validateAxisReferences(panel, plotSlot, path),
    ...validateBindingReferences(plotSlot.bindings, slots, `${path}/bindings`),
    ...validateErrorPair(plotSlot.bindings, 'x', `${path}/bindings`),
    ...validateErrorPair(plotSlot.bindings, 'y', `${path}/bindings`),
  ];
}

export function validatePanelDomain(
  panel: Panel,
  panelIndex: number,
  slots: Map<string, FigureTemplate['dataSlots'][number]>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const frame = panel.frame;

  if (frame.x + frame.width > 1 || frame.y + frame.height > 1) {
    issues.push(
      domainIssue(
        `/panels/${panelIndex}/frame`,
        'panel frames must stay within the page',
      ),
    );
  }

  panel.axes.forEach((axis, axisIndex) => {
    issues.push(
      ...validateAxisRange(
        axis,
        `/panels/${panelIndex}/axes/${axisIndex}/range`,
      ),
    );
  });
  panel.plotSlots.forEach((plotSlot, plotSlotIndex) => {
    issues.push(
      ...validatePlotSlot(panel, plotSlot, panelIndex, plotSlotIndex, slots),
    );
  });

  return issues;
}
