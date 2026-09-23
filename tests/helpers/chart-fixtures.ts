import type { DataBindingSet } from '@plot-fig/data-binding';
import {
  CURRENT_SCHEMA_VERSION,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { validTemplate } from '../../packages/figure-schema/src/schema/fixtures.js';

export const fill = {
  color: '#21918c',
  opacity: 0.7,
  borderColor: '#111111',
  borderWidthPt: 1,
};
export const line = {
  visible: true,
  color: '#111111',
  widthPt: 1,
  dash: 'solid',
};
export const colorScale = {
  colors: ['#440154', '#21918c', '#fde725'],
  reverse: false,
  range: { mode: 'auto' },
  colorbar: { visible: true, title: 'Z' },
};

export function chartTemplate(kind: string): FigureTemplate {
  const template: any = structuredClone(validTemplate);
  template.schemaVersion = CURRENT_SCHEMA_VERSION;
  const original = template.panels[0].plotSlots[0];
  const common = {
    plotSlotId: original.plotSlotId,
    kind,
    xAxisId: original.xAxisId,
    yAxisId: original.yAxisId,
    legendEntry: original.legendEntry,
  };
  const configs: Record<string, object> = {
    xy: original,
    bar: {
      layout: 'grouped',
      orientation: 'vertical',
      width: 0.8,
      gap: 0.1,
      fillStyle: fill,
    },
    histogram: {
      bins: { mode: 'auto' },
      normalization: 'count',
      fillStyle: fill,
    },
    box: {
      orientation: 'vertical',
      width: 0.6,
      quantileMethod: 'type7',
      whiskerFactor: 1.5,
      showOutliers: true,
      fillStyle: fill,
      lineStyle: line,
    },
    area: { baseline: 0, fillStyle: fill, lineStyle: line },
    heatmap: { colorScale },
    contour: {
      colorScale,
      mode: 'lines',
      levels: { mode: 'auto', count: 10 },
      lineStyle: line,
    },
  };
  const roles =
    kind === 'bar'
      ? ['category', 'value']
      : ['box', 'histogram'].includes(kind)
        ? ['values']
        : ['heatmap', 'contour'].includes(kind)
          ? ['x', 'y', 'z']
          : ['x', 'y'];
  template.dataSlots = roles.map((role) => ({
    dataSlotId: 'slot-' + role,
    name: role,
    role,
    valueType: role === 'category' ? 'category' : 'number',
    required: true,
  }));
  template.panels[0].plotSlots = [
    {
      ...common,
      ...structuredClone(configs[kind]),
      bindings: Object.fromEntries(roles.map((role) => [role, 'slot-' + role])),
    },
  ];
  if (['bar', 'box'].includes(kind))
    template.panels[0].axes[0].scale = 'category';
  return template;
}

export function chartData(
  columns: Record<string, Array<number | string | null>>,
): DataBindingSet {
  return {
    kind: 'data-binding-set',
    version: '1.0.0',
    source: { kind: 'session', name: 'fixture', rowCount: 3 },
    columns: Object.entries(columns).map(([role, values], index) => ({
      columnId: role,
      name: role,
      index,
      valueType: values.some((v) => typeof v === 'string')
        ? 'category'
        : 'number',
      values,
    })),
    bindings: Object.keys(columns).map((role) => ({
      dataSlotId: 'slot-' + role,
      columnId: role,
      status: 'valid',
    })),
    diagnostics: [],
  };
}
