import { expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderTemplateSvg } from './render.js';
import { prepareAxisScale } from './panel-scales.js';

function emptyTemplate() {
  const template = chartTemplate('xy');
  const panel = template.panels[0]!;
  panel.plotSlots = [];
  template.dataSlots = [];
  template.annotations = [
    {
      annotationId: 'panel-note',
      kind: 'text',
      coordinateSpace: 'panel',
      panelId: panel.panelId,
      position: { x: 0.5, y: 0.5 },
      text: 'Empty layer',
      format: 'plain',
    },
    {
      annotationId: 'data-note',
      kind: 'text',
      coordinateSpace: 'data',
      panelId: panel.panelId,
      xAxisId: panel.axes[0]!.axisId,
      yAxisId: panel.axes[1]!.axisId,
      position: { x: 0, y: 0 },
      text: 'Data origin',
      format: 'plain',
    },
  ];
  return template;
}

it('renders fixed numeric axes and annotations on an empty layer', () => {
  const template = emptyTemplate();
  for (const axis of template.panels[0]!.axes)
    axis.range = { mode: 'fixed', min: -0.5, max: 0.5 };

  const result = renderTemplateSvg(template, chartData({}));

  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) return;
  expect(result.svg).toContain('data-role="axis-x"');
  expect(result.svg).toContain('data-role="axis-y"');
  expect(result.svg).toContain('>-0.5</text>');
  expect(result.svg).toContain('data-annotation-id="panel-note"');
  expect(result.svg).toContain('data-annotation-id="data-note"');
  expect(result.svg).not.toContain('data-role="plot-slot"');
  expect(result.svg).not.toContain('data-role="legend"');
  expect(result.svg).not.toMatch(/NaN|Infinity/);
});

it.each([false, true])(
  'renders an empty automatic layer without inventing ranges (populated neighbor: %s)',
  (withNeighbor) => {
    const template = emptyTemplate();
    if (withNeighbor) {
      const populated = chartTemplate('xy');
      const panel = populated.panels[0]!;
      panel.panelId = 'populated';
      panel.axes.forEach((axis) => (axis.axisId += '-populated'));
      panel.plotSlots[0]!.xAxisId = panel.axes[0]!.axisId;
      panel.plotSlots[0]!.yAxisId = panel.axes[1]!.axisId;
      template.panels.push(panel);
      template.dataSlots = populated.dataSlots;
    }

    const result = renderTemplateSvg(
      template,
      chartData(withNeighbor ? { x: [10, 20], y: [30, 40] } : {}),
    );

    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok) return;
    expect(result.svg.match(/data-role="panel"/g)).toHaveLength(
      withNeighbor ? 2 : 1,
    );
    expect(result.svg.match(/data-role="axis-[xy]"/g) ?? []).toHaveLength(
      withNeighbor ? 2 : 0,
    );
    expect(result.svg).toContain('data-annotation-id="panel-note"');
    expect(result.svg).not.toContain('data-annotation-id="data-note"');
    expect(result.svg).not.toMatch(/NaN|Infinity/);
    if (withNeighbor)
      expect(result.svg).toContain('data-plot-slot-id="series-1"');
  },
);

it('renders only the fixed axis when the other empty-layer axis is automatic', () => {
  const template = emptyTemplate();
  template.panels[0]!.axes[0]!.range = {
    mode: 'fixed',
    min: -2,
    max: 2,
  };

  const result = renderTemplateSvg(template, chartData({}));

  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) return;
  expect(result.svg).toContain('data-role="axis-x"');
  expect(result.svg).not.toContain('data-role="axis-y"');
  expect(result.svg).toContain('data-annotation-id="panel-note"');
  expect(result.svg).not.toContain('data-annotation-id="data-note"');
});

it('does not synthesize automatic numeric or categorical domains without plots', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  expect(prepareAxisScale(axis, [])).toBeUndefined();
  expect(prepareAxisScale({ ...axis, scale: 'log10' }, [])).toBeUndefined();
  expect(prepareAxisScale({ ...axis, scale: 'category' }, [])).toBeUndefined();
  expect(
    prepareAxisScale(
      { ...axis, range: { mode: 'fixed', min: -0.5, max: 0.5 } },
      [],
    ),
  ).toMatchObject({ min: -0.5, max: 0.5 });
});

it.each(['preparation', 'drawing'])(
  'retains the error when every configured plot fails during %s',
  (stage) => {
    const template = chartTemplate('xy');
    if (stage === 'drawing') template.panels[0]!.axes[0]!.scale = 'log10';
    const result = renderTemplateSvg(
      template,
      chartData(stage === 'drawing' ? { x: [-2, -1], y: [1, 2] } : {}),
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        message: '没有可绘制的图表，请检查数据绑定和坐标范围',
      }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        sourcePath: '/panels/panel-main/plotSlots/series-1',
      }),
    );
  },
);
