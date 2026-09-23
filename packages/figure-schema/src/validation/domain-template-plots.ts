import type { Axis } from '../schema/axis.js';
import type { FigureTemplate, Panel } from '../schema/figure-template.js';
import type { PlotSlot } from '../schema/plot-slot.js';
import type { ValidationIssue } from './types.js';

import { plotBindingEntries } from '../plot-contract.js';
import { validateChartDomain } from './domain-charts.js';
import { validateAxisAppearance } from './domain-axis-appearance.js';
import { validateF4PanelRelations } from '../schema/curve-relations.js';
import {
  axisScaleSpec,
  isPositiveLogAxis,
  validateAxisScaleSettings,
} from '../axis-scale.js';
import {
  numericScaleCapability,
  createNumericScale,
} from '../numeric-scale.js';

type PlotValidationContext = {
  panel: Panel;
  panelIndex: number;
  plotSlot: PlotSlot;
  plotSlotIndex: number;
  slots: Map<string, FigureTemplate['dataSlots'][number]>;
};

function domainIssue(path: string, message: string): ValidationIssue {
  return {
    code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
    path,
    message,
  };
}

function validateAxisRange(axis: Axis, path: string): ValidationIssue[] {
  try {
    validateAxisScaleSettings(axis);
  } catch (error) {
    return [domainIssue(path, (error as Error).message)];
  }
  if (axis.scale === 'category') {
    return axis.range.mode !== 'auto' ||
      axis.rescale !== undefined ||
      axis.minorTicks.visible ||
      axis.minorTicks.count !== 0
      ? [
          domainIssue(
            path,
            'category axes require auto range and no minor ticks',
          ),
        ]
      : [];
  }
  const mode = axis.rescale?.mode;
  if (
    (mode === 'fixed' && axis.range.mode !== 'fixed') ||
    (mode?.startsWith('fixed-min-') && !('min' in axis.range)) ||
    (mode?.startsWith('fixed-max-') && !('max' in axis.range)) ||
    (axis.range.mode === 'min-only' && !mode?.startsWith('fixed-min-')) ||
    (axis.range.mode === 'max-only' && !mode?.startsWith('fixed-max-'))
  )
    return [domainIssue(path, '范围端点与重缩放策略不匹配')];
  for (const value of ['min', 'max'].flatMap((key) =>
    key in axis.range
      ? [(axis.range as unknown as Record<string, number>)[key]!]
      : [],
  ))
    if (
      !Number.isFinite(value) ||
      !numericScaleCapability(axisScaleSpec(axis)).accepts(value)
    )
      return [domainIssue(path, '范围端点必须有限，对数轴端点必须为正数')];
  if (axis.range.mode !== 'fixed') {
    return [];
  }
  if (axis.range.min >= axis.range.max) {
    return [domainIssue(path, 'fixed axis ranges require min < max')];
  }
  if (isPositiveLogAxis(axis) && axis.range.min <= 0) {
    return [domainIssue(path, 'logarithmic axis ranges must stay positive')];
  }
  try {
    createNumericScale(axisScaleSpec(axis), axis.range.min, axis.range.max);
  } catch (cause) {
    return [domainIssue(path, (cause as Error).message)];
  }
  return [];
}

function validateAxisGeneration(axis: Axis, path: string): ValidationIssue[] {
  const generation = axis.majorTicks.generation;
  if (!generation || generation.mode === 'auto') return [];
  if (axis.scale === 'category')
    return [domainIssue(path, 'category axes require automatic major ticks')];
  if (
    isPositiveLogAxis(axis) &&
    (generation.mode === 'increment' || generation.mode === 'count') &&
    generation.anchor !== undefined &&
    generation.anchor <= 0
  )
    return [
      domainIssue(
        `${path}/anchor`,
        'logarithmic tick anchors must stay positive',
      ),
    ];
  return [];
}

function validateAxisReferences(
  context: PlotValidationContext,
  path: string,
): ValidationIssue[] {
  const xAxis = context.panel.axes.find(
    (axis) => axis.axisId === context.plotSlot.xAxisId,
  );
  const yAxis = context.panel.axes.find(
    (axis) => axis.axisId === context.plotSlot.yAxisId,
  );
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
  context: PlotValidationContext,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const { role: key, slotId } of plotBindingEntries(context.plotSlot)) {
    if (slotId === undefined) {
      continue;
    }
    const slot = context.slots.get(slotId);
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
  const plot = context.plotSlot;
  const required: Array<['lineColor' | 'label' | 'group', boolean]> = [];
  if (plot.kind === 'xy') {
    if (plot.lineMapping && plot.lineMapping.mode !== 'increment')
      required.push(['lineColor', plot.lineMapping.mode === 'continuous']);
    if (plot.subset?.mode === 'group') required.push(['group', false]);
  }
  if (
    'dataLabels' in plot &&
    plot.dataLabels &&
    (plot.dataLabels.source === 'column' ||
      (plot.dataLabels.source === 'custom' &&
        plot.dataLabels.template?.includes('{label}')))
  )
    required.push(['label', false]);
  for (const [role, numeric] of required) {
    const id = (plot.bindings as Record<string, string | undefined>)[role],
      slot = id ? context.slots.get(id) : undefined;
    if (!slot)
      issues.push(
        domainIssue(
          `${path}/${role}`,
          `请先选择${role === 'label' ? '标签' : role === 'group' ? '分组' : '线条颜色'}数据列`,
        ),
      );
    else if (numeric && slot.valueType !== 'number')
      issues.push(domainIssue(`${path}/${role}`, '连续线色映射需要数值列'));
  }
  if (plot.kind === 'xy')
    for (const role of ['color', 'size', 'shape'] as const)
      if (plot.markerMapping?.[role]) {
        const slotId = plot.bindings[role],
          slot = slotId ? context.slots.get(slotId) : undefined;
        if (!slot)
          issues.push(
            domainIssue(
              `${path}/${role}`,
              '请先选择' +
                { color: '颜色', size: '大小', shape: '形状' }[role] +
                '映射数据列',
            ),
          );
        else if (
          (role === 'size' ||
            (role === 'color' &&
              plot.markerMapping.color?.mode === 'continuous')) &&
          slot.valueType !== 'number'
        )
          issues.push(domainIssue(`${path}/${role}`, '连续映射需要数值列'));
      }

  return issues;
}

function validateErrorPair(
  context: PlotValidationContext,
  prefix: 'x' | 'y' | 'value',
): ValidationIssue[] {
  const plot = context.plotSlot;
  if (plot.kind !== 'xy' && plot.kind !== 'bar') return [];
  const bindings = plot.bindings as Record<string, string | undefined>;
  const path = `/panels/${context.panelIndex}/plotSlots/${context.plotSlotIndex}/bindings`;
  const symmetric = bindings[`${prefix}Error`];
  const lower = bindings[`${prefix}ErrorLower`];
  const upper = bindings[`${prefix}ErrorUpper`];
  if (
    plot.kind === 'bar' &&
    plot.layout === 'stacked' &&
    (symmetric || lower || upper || plot.errorBarStyle || plot.errorDetails)
  )
    return [domainIssue(path, '堆叠柱不支持值误差棒')];

  if (symmetric && (lower || upper)) {
    return [
      domainIssue(
        `${path}/${prefix}Error`,
        'symmetric and asymmetric error bindings are mutually exclusive',
      ),
    ];
  }
  const detail = plot.errorDetails?.[prefix];
  if (symmetric && detail?.source === 'endpoints')
    return [
      domainIssue(
        `${path}/${prefix}Error`,
        '绝对端点需要上下端点绑定，不能使用对称幅值槽',
      ),
    ];
  const direction = detail?.direction ?? 'both';
  if (detail && (symmetric || lower || upper)) {
    if (direction === 'positive')
      return symmetric || upper
        ? []
        : [
            domainIssue(
              `${path}/${prefix}ErrorUpper`,
              '正方向误差需要上侧数据槽',
            ),
          ];
    if (direction === 'negative')
      return symmetric || lower
        ? []
        : [
            domainIssue(
              `${path}/${prefix}ErrorLower`,
              '负方向误差需要下侧数据槽',
            ),
          ];
    // 基线方向逐行确定；只绑定一侧时，使用另一侧的行给出数据提示并跳过。
    if (direction === 'away-baseline' || direction === 'toward-baseline')
      return [];
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

function validatePlotSlot(context: PlotValidationContext): ValidationIssue[] {
  const path = `/panels/${context.panelIndex}/plotSlots/${context.plotSlotIndex}`;

  return [
    ...validateAxisReferences(context, path),
    ...validateChartDomain(context.panel, context.plotSlot, path),
    ...validateBindingReferences(context, `${path}/bindings`),
    ...validateErrorPair(context, 'x'),
    ...validateErrorPair(context, 'y'),
    ...validateErrorPair(context, 'value'),
  ];
}

export function validatePanelDomain(
  panel: Panel,
  panelIndex: number,
  slots: Map<string, FigureTemplate['dataSlots'][number]>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const frame = panel.frame;
  try {
    validateF4PanelRelations(panel);
  } catch (error) {
    issues.push(domainIssue(`/panels/${panelIndex}`, (error as Error).message));
  }

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
      ...validateAxisAppearance(
        axis,
        panel.axes,
        '/panels/' + panelIndex + '/axes/' + axisIndex,
        panel.visible !== false,
      ),
      ...validateAxisRange(
        axis,
        `/panels/${panelIndex}/axes/${axisIndex}/range`,
      ),
      ...validateAxisGeneration(
        axis,
        `/panels/${panelIndex}/axes/${axisIndex}/majorTicks/generation`,
      ),
    );
  });
  panel.plotSlots.forEach((plotSlot, plotSlotIndex) => {
    issues.push(
      ...validatePlotSlot({
        panel,
        panelIndex,
        plotSlot,
        plotSlotIndex,
        slots,
      }),
    );
  });

  return issues;
}
