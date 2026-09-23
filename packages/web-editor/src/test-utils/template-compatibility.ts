import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { defaultTemplate } from '../state/default-template.js';
import { applyMultiAxisPreset } from '../state/multi-axis-presets.js';
import {
  changeSeries,
  type WorkspaceEditor,
} from '../state/workspace-editor.js';

export const templateCases = [
  'double-y',
  'triple-y',
  'quad-y',
  'stacked-shared-x',
  'bar',
  'histogram',
  'box',
  'area',
  'heatmap',
  'contour',
] as const;
export type TemplateCase = (typeof templateCases)[number];

export function compatibilityTemplate(kind: TemplateCase): FigureTemplate {
  if (kind.endsWith('-y') || kind === 'stacked-shared-x') {
    let model: WorkspaceEditor = {
      template: defaultTemplate(),
      workspace: emptyWorkspace(),
    };
    for (let i = 1; i < 4; i++) model = changeSeries(model, 'add');
    return applyMultiAxisPreset(
      model,
      kind as 'double-y' | 'triple-y' | 'quad-y' | 'stacked-shared-x',
    ).template;
  }
  const template = chartTemplate(kind);
  const plot = template.panels[0]!.plotSlots[0]!;
  if (plot.kind === 'bar')
    plot.options = { baseline: 1, percentage: false, missing: 'gap' };
  if (plot.kind === 'histogram') {
    plot.bins = { mode: 'width', width: 1, start: 0, end: 6, scale: 'linear' };
    plot.boundary = 'right';
    plot.gap = 0.15;
    plot.showStatistics = true;
    plot.distribution = {
      visible: true,
      kind: 'normal',
      samples: 64,
      parameters: { mu: 2, sigma: 1 },
      extendPercent: 100,
      normalize: 'density',
      symmetric: false,
    };
  }
  if (plot.kind === 'box') {
    plot.quantileMethod = 'type2';
    plot.showMean = true;
    plot.rawPoints = 'spread';
    plot.confidence = {
      visible: true,
      target: 'mean',
      method: 'normal',
      level: 0.95,
    };
    plot.bindings.split = 'slot-split';
    template.dataSlots.push({
      dataSlotId: 'slot-split',
      name: 'split',
      role: 'split',
      valueType: 'category',
      required: false,
    });
    plot.distribution = {
      visible: true,
      kind: 'normal',
      samples: 64,
      parameters: { mu: 2, sigma: 1 },
      extendPercent: 100,
      normalize: 'density',
      symmetric: false,
      side: 'split',
    };
  }
  if (plot.kind === 'area') plot.baseline = -2;
  if (plot.kind === 'heatmap' || plot.kind === 'contour') {
    plot.colorScale.transform = 'linear';
    plot.colorScale.interpolation = 'discrete';
    plot.colorScale.colorbar = {
      visible: true,
      title: 'Measured Z',
      mode: 'independent',
      range: { min: 0, max: 6 },
      orientation: 'horizontal',
      side: 'bottom',
      length: 0.8,
      widthPt: 12,
      majorTicks: 4,
      minorTicks: 2,
      notation: 'fixed',
      precision: 2,
      endpoints: 'triangles',
    };
    if (plot.kind === 'heatmap')
      plot.heatmap = {
        missingColor: '#eeeeee',
        labels: true,
        interpolation: 'bilinear',
        dataRegion: 'matrix',
      };
    if (plot.kind === 'contour') {
      plot.levels = { mode: 'values', values: [1, 2, 3] };
    }
  }
  return template;
}

export function compatibilityWorkspace(
  template: FigureTemplate,
  prefix = 'target',
) {
  const workspace = emptyWorkspace();
  const grid = template.panels.some((p) =>
    p.plotSlots.some((s) => s.kind === 'heatmap' || s.kind === 'contour'),
  );
  // 两张同名列表故意制造歧义；显式映射使用第二张表及逆序列。
  for (const suffix of ['decoy', 'actual']) {
    const slots = [...template.dataSlots].reverse();
    const table = createDataTable({
      tableId: `${prefix}-${suffix}`,
      source: { kind: 'csv', name: `${prefix}-${suffix}.csv` },
      rows: [
        slots.map((s) => s.name),
        ...Array.from({ length: 9 }, (_, i) =>
          slots.map((s, j) => {
            if (s.role === 'category') return `Category ${i}`;
            if (s.valueType === 'category') return i % 2 ? 'B' : 'A';
            if (s.role === 'x') return String(grid ? i % 3 : i);
            if (s.role === 'y')
              return String(grid ? Math.floor(i / 3) : i + j + 1);
            return String(((i + j) % 5) + 1);
          }),
        ),
      ],
    });
    workspace.tables.push(table);
    if (suffix === 'actual') {
      for (const [i, slot] of slots.entries())
        workspace.slotBindings[slot.dataSlotId] = {
          tableId: table.tableId,
          columnId: table.columns[i]!.columnId,
        };
      workspace.activeTableId = table.tableId;
    }
  }
  return workspace;
}
