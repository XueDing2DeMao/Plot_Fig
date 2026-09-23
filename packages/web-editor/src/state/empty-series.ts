import {
  plotRoles,
  validateFigureTemplate,
  type FigureTemplate,
  type PlotSlot,
} from '@plot-fig/figure-schema';
import { defaultTemplate } from './default-template.js';
import { chartDefaults } from './chart-defaults.js';

export function createEmptySeries(
  template: FigureTemplate,
  options: {
    panelId: string;
    number: number;
    overrides: Record<string, string>;
  },
) {
  const next = structuredClone(template),
    panel = next.panels.find((p) => p.panelId === options.panelId)!;
  const x = panel.axes.find((axis) => axis.dimension === 'x'),
    y = panel.axes.find((axis) => axis.dimension === 'y');
  if (!x || !y || (x.scale === 'category' && y.scale === 'category'))
    throw new Error('空图层需要兼容的 X/Y 轴');
  let plot: PlotSlot = defaultTemplate().panels[0]!.plotSlots[0]!;
  plot.plotSlotId = 'series-' + options.number;
  plot.xAxisId = x.axisId;
  plot.yAxisId = y.axisId;
  plot.legendEntry.text = 'Series ' + options.number;
  if (x.scale === 'category' || y.scale === 'category') {
    const numeric = x.scale === 'category' ? y : x;
    plot = chartDefaults(numeric.scale === 'linear' ? 'bar' : 'box', plot);
    if (plot.kind === 'bar' || plot.kind === 'box')
      plot.orientation = x.scale === 'category' ? 'vertical' : 'horizontal';
  }
  plot.bindings = Object.fromEntries(
    plotRoles(plot.kind).map((role) => {
      const id = plot.plotSlotId + '-' + role.role;
      next.dataSlots.push({
        dataSlotId: id,
        role: role.role,
        name: role.label,
        required: role.required,
        valueType: ['category', 'group', 'split'].includes(role.role)
          ? 'category'
          : 'number',
      });
      return [role.role, id];
    }),
  ) as PlotSlot['bindings'];
  panel.plotSlots.push(plot);
  const checked = validateFigureTemplate(next);
  if (!checked.ok)
    throw new Error('空图层的坐标轴不支持此图表，请先调整轴类型');
  return {
    template: next,
    overrides: { ...options.overrides },
    selectedPlotSlotId: plot.plotSlotId,
  };
}
