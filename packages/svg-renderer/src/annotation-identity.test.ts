import { describe, expect, it } from 'vitest';
import type {
  Annotation,
  FigureTemplate,
  XyPlot,
} from '@plot-fig/figure-schema';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderFigureSvg } from './index.js';
import { renderSeriesLegend } from './legend.js';

const rect = { x: 20, y: 30, width: 200, height: 100 };

function pageText(annotationId: string): Annotation {
  return {
    kind: 'text',
    annotationId,
    coordinateSpace: 'page',
    position: { x: 0.5, y: 0.5 },
    text: 'Same label',
    format: 'plain',
  };
}

function annotationIds(svg: string) {
  return [...svg.matchAll(/\bdata-annotation-id="([^"]+)"/g)]
    .map((match) => match[1]!)
    .sort();
}

function legend(template: FigureTemplate, panel = template.panels[0]!) {
  return renderSeriesLegend(template, panel, {
    rect,
    renderedPlotIds: new Set(panel.plotSlots.map((plot) => plot.plotSlotId)),
  });
}

describe('canvas annotation identity', () => {
  it('preserves explicit page and panel text/legend IDs through reordered annotations and duplicate labels', () => {
    const template = chartTemplate('xy');
    const panel = template.panels[0]!;
    template.annotations = [
      pageText('page-text'),
      {
        ...pageText('panel-text'),
        coordinateSpace: 'panel',
        panelId: panel.panelId,
      },
      {
        kind: 'legend',
        annotationId: 'page-legend',
        coordinateSpace: 'page',
        visible: true,
        position: { x: 0.8, y: 0.8 },
      },
      {
        kind: 'legend',
        annotationId: 'panel-legend',
        coordinateSpace: 'panel',
        panelId: panel.panelId,
        visible: true,
        position: { x: 1, y: 1 },
      },
    ];
    const render = () => {
      const result = renderFigureSvg(
        template,
        chartData({ x: [1, 2], y: [2, 3] }),
      );
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      if (!result.ok) throw new Error('Expected valid figure');
      expect(result.svg).not.toContain('data-implicit-legend-panel-id');
      return annotationIds(result.svg);
    };
    expect(render()).toEqual([
      'page-legend',
      'page-text',
      'panel-legend',
      'panel-text',
    ]);
    template.annotations.reverse();
    panel.plotSlots[0]!.legendEntry.text = 'Same label';
    expect(render()).toEqual([
      'page-legend',
      'page-text',
      'panel-legend',
      'panel-text',
    ]);
  });

  it.each(['standard', 'sampled'] as const)(
    'marks the %s implicit legend root with its panel and preserves hidden entries',
    (layout) => {
      const template = chartTemplate('xy');
      const panel = template.panels[0]!;
      const plot = panel.plotSlots[0]! as XyPlot;
      panel.plotSlots.push({
        ...structuredClone(plot),
        plotSlotId: 'hidden-series',
        legendEntry: { visible: false, text: 'Hidden' },
      });
      const svg = renderSeriesLegend(template, panel, {
        rect,
        renderedPlotIds: new Set([plot.plotSlotId, 'hidden-series']),
        ...(layout === 'sampled'
          ? {
              samples: new Map([
                [
                  plot.plotSlotId,
                  [{ row: 1, style: plot.markerStyle!, label: 'Row 1' }],
                ],
              ]),
            }
          : {}),
      });
      const root = svg.match(/^<g\b[^>]*>/)?.[0];
      expect(root).toContain('data-role="legend"');
      expect(root).toContain('data-annotation-id="auto-panel-main"');
      expect(root).toContain('data-implicit-legend-panel-id="panel-main"');
      expect(svg).toContain('data-plot-slot-id="series-1"');
      expect(svg).not.toContain('data-plot-slot-id="hidden-series"');
      expect(template.annotations).toEqual([]);
    },
  );

  it('avoids explicit annotation IDs and IDs that would prevent materialization', () => {
    const template = chartTemplate('xy');
    template.annotations = [
      pageText('auto-panel-main'),
      pageText('auto-panel-main-2'),
    ];
    template.templateId = 'auto-panel-main-3';
    expect(annotationIds(legend(template))).toEqual(['auto-panel-main-4']);
    expect(
      template.annotations.map((annotation) => annotation.annotationId),
    ).toEqual(['auto-panel-main', 'auto-panel-main-2']);
  });

  it('reserves other panel default IDs without depending on panel order', () => {
    const template = chartTemplate('xy');
    const first = template.panels[0]!;
    const second = { ...structuredClone(first), panelId: 'panel-main-2' };
    template.panels.push(second);
    template.annotations = [pageText('auto-panel-main')];
    expect(annotationIds(legend(template, first))).toEqual([
      'auto-panel-main-3',
    ]);
    expect(annotationIds(legend(template, second))).toEqual([
      'auto-panel-main-2',
    ]);
    template.panels.reverse();
    expect(annotationIds(legend(template, first))).toEqual([
      'auto-panel-main-3',
    ]);
    expect(annotationIds(legend(template, second))).toEqual([
      'auto-panel-main-2',
    ]);
  });

  it('emits no interactive root when every implicit legend entry is hidden', () => {
    const template = chartTemplate('xy');
    template.panels[0]!.plotSlots[0]!.legendEntry.visible = false;
    expect(legend(template)).toBe('');
  });
});
