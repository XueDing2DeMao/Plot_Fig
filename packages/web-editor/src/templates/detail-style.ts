import type { Axis, FigureTemplate } from '@plot-fig/figure-schema';
import type { PlotSlot } from '@plot-fig/figure-schema';
function copyPlotStyle(plot: PlotSlot, source: PlotSlot) {
  if (plot.kind !== source.kind) return;
  const target = plot as unknown as Record<string, unknown>,
    sample = source as unknown as Record<string, unknown>;
  for (const key of [
    'lineStyle',
    'markerStyle',
    'fillStyle',
    'outlierStyle',
    'errorBarStyle',
  ]) {
    if (
      key === 'errorBarStyle' &&
      plot.kind === 'bar' &&
      plot.layout === 'stacked'
    )
      continue;
    if (sample[key] !== undefined) target[key] = structuredClone(sample[key]);
  }
}
export function copyDetailedStyle(
  target: FigureTemplate,
  source: FigureTemplate,
) {
  for (const [index, panel] of target.panels.entries()) {
    const from = source.panels[index % source.panels.length]!;
    for (const axis of panel.axes) {
      const sample =
        from.axes.find(
          (a) => a.dimension === axis.dimension && a.position === axis.position,
        ) ?? from.axes.find((a) => a.dimension === axis.dimension);
      if (!sample) continue;
      copyAxisStyle(axis, sample);
      if (axis.title && sample.title)
        axis.title = {
          ...structuredClone(sample.title),
          text: axis.title.text,
          format: axis.title.format,
        };
    }
    for (const [i, plot] of panel.plotSlots.entries()) {
      const plots = from.plotSlots.filter((p) => p.kind === plot.kind),
        sample = plots[i % plots.length];
      if (sample) copyPlotStyle(plot, sample);
    }
  }
  for (const a of target.annotations) {
    const sample = source.annotations.find((s) => s.kind === a.kind);
    if (!sample) continue;
    if ('textStyle' in a && 'textStyle' in sample && sample.textStyle)
      a.textStyle = structuredClone(sample.textStyle);
    if ('shapeStyle' in a && 'shapeStyle' in sample && sample.shapeStyle)
      a.shapeStyle = structuredClone(sample.shapeStyle);
  }
}

function copyAxisStyle(axis: Axis, sample: Axis) {
  // 显隐决定多轴结构，刻度生成与公式决定数据含义，均不从样式模板复制。
  const { visible: _lineVisible, ...line } = sample.line;
  axis.line = {
    ...structuredClone(line),
    ...(axis.line.visible === undefined ? {} : { visible: axis.line.visible }),
  };
  const {
    visible: _majorVisible,
    generation: _generation,
    ...major
  } = sample.majorTicks;
  axis.majorTicks = {
    ...structuredClone(major),
    visible: axis.majorTicks.visible,
    ...(axis.majorTicks.generation
      ? { generation: axis.majorTicks.generation }
      : {}),
  };
  const { visible: _minorVisible, count: _count, ...minor } = sample.minorTicks;
  axis.minorTicks = {
    ...structuredClone(minor),
    visible: axis.minorTicks.visible,
    count: axis.minorTicks.count,
  };
  const {
    visible: _visible,
    formula: _formula,
    prefix: _prefix,
    suffix: _suffix,
    divisor: _divisor,
    position: _position,
    ...appearance
  } = sample.tickLabels;
  const semantics = Object.fromEntries(
    (['formula', 'prefix', 'suffix', 'divisor', 'position'] as const)
      .filter((key) => axis.tickLabels[key] !== undefined)
      .map((key) => [key, axis.tickLabels[key]]),
  );
  axis.tickLabels = {
    ...structuredClone(appearance),
    ...semantics,
    visible: axis.tickLabels.visible,
    ...(axis.scale === 'category'
      ? { notation: axis.tickLabels.notation }
      : {}),
  };
}
