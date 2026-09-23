import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { defaultTemplate } from '../packages/web-editor/src/state/default-template.js';
import { importTables } from '../packages/web-editor/src/state/workspace-editor.js';
import { changeChartType } from '../packages/web-editor/src/state/chart-operations.js';
import { defaultShapeStyle } from '@plot-fig/figure-schema';

it.each(['bar', 'histogram', 'area', 'xy'] as const)(
  'renders shared paints for %s and its legend without dangling references',
  (kind) => {
    let m = importTables(
      { template: defaultTemplate(), workspace: emptyWorkspace() },
      [
        createDataTable({
          tableId: 'table',
          source: { kind: 'csv', name: 'data.csv' },
          rows: [
            ['X', 'Y'],
            ['0', '2'],
            ['1', '4'],
            ['2', '3'],
          ],
        }),
      ],
    );
    m = changeChartType(m, 'series-1', kind);
    const paint = {
      kind: 'pattern',
      pattern: 'cross',
      foreground: '#000000',
      background: 'none',
      spacingPt: 8,
      widthPt: 1,
    } as const;
    m.template.page.backgroundPaint = {
      kind: 'linear-gradient',
      angle: 90,
      startColor: '#ffffff',
      endColor: '#aaccee',
    };
    const p = m.template.panels[0]!.plotSlots[0]!;
    p.legendEntry.visible = true;
    if ('fillStyle' in p) p.fillStyle.paint = paint;
    if (p.kind === 'xy')
      p.transform = {
        fill: {
          target: 'baseline',
          baseline: 0,
          positiveColor: '#abcdef',
          negativeColor: '#abcdef',
          opacity: 0.7,
          positivePaint: paint,
          negativePaint: { kind: 'none' },
        },
      };
    m.template.annotations.push({
      kind: 'rectangle',
      annotationId: 'shape',
      coordinateSpace: 'page',
      start: { x: 0.3, y: 0.2 },
      end: { x: 0.5, y: 0.4 },
      shapeStyle: { ...defaultShapeStyle(), paint },
    });
    const r = renderFigureSvg(
      m.template,
      bindWorkspace(m.template, m.workspace),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toContain('<pattern');
    expect(r.svg).toContain('<linearGradient');
    for (const match of r.svg.matchAll(/url\(#([^)]*)\)/g))
      expect(r.svg).toContain(`id="${match[1]}"`);
    expect(r.svg).toMatch(
      /data-role="annotation-rectangle"[^>]+fill="url\(#pf-paint-/,
    );
    expect(r.svg).toMatch(
      new RegExp(
        `data-role="${kind === 'xy' ? 'curve-fill' : kind === 'area' ? 'area' : kind === 'histogram' ? 'histogram-bin' : 'bar'}"[^>]+fill="url\\(#pf-paint-`,
      ),
    );
  },
);
