import {
  axisScaleSpec,
  numericScaleCapability,
  type Axis,
  type FigureTemplate,
  type PlotSlot,
} from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';

export type TemplateEntry = {
  id: string;
  name: string;
  tags: string[];
  template: FigureTemplate;
  builtIn: boolean;
};
export function builtInTemplates(): TemplateEntry[] {
  return [];
}

type SampleAxis = Pick<Axis, 'scale' | 'range' | 'symLog' | 'scaleOptions'>;
type SampleContext = {
  axis?: SampleAxis;
  grid?: 'x' | 'y';
  error?: boolean;
};

function bindingDimension(plot: PlotSlot, role: string): 'x' | 'y' | undefined {
  if (role === 'x' || role.startsWith('xError')) return 'x';
  if (role === 'y' || role.startsWith('yError')) return 'y';
  if (plot.kind === 'histogram' && role === 'values') return 'x';
  if (
    (plot.kind === 'bar' &&
      (role === 'value' || role.startsWith('valueError'))) ||
    (plot.kind === 'box' && role === 'values')
  )
    return plot.orientation === 'horizontal' ? 'x' : 'y';
  return undefined;
}

function sampleContexts(template: FigureTemplate) {
  const contexts = new Map<string, SampleContext>();
  for (const panel of template.panels) {
    if (panel.visible === false) continue;
    for (const plot of panel.plotSlots) {
      if (plot.visible === false) continue;
      for (const [role, id] of Object.entries(plot.bindings)) {
        if (contexts.has(id)) continue;
        const dimension = bindingDimension(plot, role),
          grid = plot.kind === 'heatmap' || plot.kind === 'contour',
          axis =
            dimension &&
            panel.axes.find(
              (item) =>
                item.axisId ===
                (dimension === 'x' ? plot.xAxisId : plot.yAxisId),
            );
        contexts.set(id, {
          ...(axis ? { axis } : {}),
          ...(grid && dimension ? { grid: dimension } : {}),
          ...(role.includes('Error') ? { error: true } : {}),
          ...(grid && role === 'z'
            ? {
                axis: {
                  scale: plot.colorScale.transform ?? 'linear',
                  range: plot.colorScale.range,
                },
              }
            : {}),
        });
      }
    }
  }
  return contexts;
}

function defaultBounds(axis: SampleAxis): [number, number] {
  if (axis.scale === 'custom' && axis.scaleOptions?.formula)
    return [axis.scaleOptions.formula.min, axis.scaleOptions.formula.max];
  if (axis.scale === 'weibull') return [0.05, 0.95];
  if (['probability', 'probit', 'logit'].includes(axis.scale)) return [5, 95];
  if (axis.scale === 'reciprocal') return [1, 10];
  if (axis.scale === 'offset-reciprocal') {
    const pole = -(axis.scaleOptions?.offset ?? 273.14);
    return [pole + 1, pole + 10];
  }
  if (axis.symLog)
    return [-10 * axis.symLog.threshold, 10 * axis.symLog.threshold];
  return ['log10', 'ln', 'log2'].includes(axis.scale) ? [1, 100] : [0, 8];
}

function numericSamples(context?: SampleContext): number[] {
  const axis =
      context?.axis?.scale !== 'category' && context?.axis
        ? context.axis
        : { scale: 'linear' as const, range: { mode: 'auto' as const } },
    capability = numericScaleCapability(axisScaleSpec(axis));
  let [min, max] = defaultBounds(axis);
  if ('min' in axis.range) min = axis.range.min;
  if ('max' in axis.range) max = axis.range.max;
  // 单侧固定范围从固定端点向有效定义域内延伸，避免零进入对数轴。
  if (axis.range.mode === 'min-only' || axis.range.mode === 'max-only') {
    const direction = axis.range.mode === 'min-only' ? 1 : -1,
      endpoint = direction === 1 ? min : max;
    let step = (Math.abs(endpoint) || 1) / 2;
    for (let attempt = 0; attempt < 64; attempt++, step /= 2) {
      const other = endpoint + step * direction;
      if (
        Number.isFinite(other) &&
        capability.accepts(other) &&
        Number.isFinite(capability.forward(other))
      ) {
        if (direction === 1) max = other;
        else min = other;
        break;
      }
    }
  }
  const low = capability.forward(min),
    high = capability.forward(max);
  const samples = Array.from({ length: 9 }, (_, index) => {
    const position =
      context?.grid === 'x'
        ? (index % 3) / 2
        : context?.grid === 'y'
          ? Math.floor(index / 3) / 2
          : index / 8;
    const ratio = 0.1 + position * 0.8;
    return capability.inverse(low * (1 - ratio) + high * ratio);
  });
  if (context?.error) {
    const span = Math.abs(samples.at(-1)! - samples[0]!);
    const distance = Math.min(
      ...samples.map((value) => Math.abs(value)).filter((value) => value > 0),
    );
    return samples.map(() => Math.min(span / 20, distance / 20));
  }
  return samples;
}

export function templateThumbnail(template: FigureTemplate): string {
  const data: DataBindingSet = {
    kind: 'data-binding-set',
    version: '1.0.0',
    source: { kind: 'session', name: '模板示例', rowCount: 9 },
    bindings: [],
    columns: [],
    diagnostics: [],
  };
  const contexts = sampleContexts(template);
  template.dataSlots.forEach((s, index) => {
    const values =
      s.valueType === 'number'
        ? numericSamples(contexts.get(s.dataSlotId))
        : Array.from({ length: 9 }, (_, i) =>
            String.fromCharCode(
              65 +
                (s.role === 'group' || s.role === 'split'
                  ? Math.floor(i / 3)
                  : i),
            ),
          );
    data.columns.push({
      columnId: s.dataSlotId,
      name: s.name,
      index,
      valueType: s.valueType,
      values,
    });
    data.bindings.push({
      dataSlotId: s.dataSlotId,
      columnId: s.dataSlotId,
      status: 'valid',
    });
  });
  const r = renderFigureSvg(template, data);
  return r.ok ? r.svg : '';
}
