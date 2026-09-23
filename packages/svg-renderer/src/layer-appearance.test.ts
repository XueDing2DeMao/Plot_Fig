import { expect, it } from 'vitest';
import { defaultTemplate } from '../../web-editor/src/state/default-template.js';
import { chartData } from '../../../tests/helpers/chart-fixtures.js';
import { renderFigureSvg } from './index.js';
import { figureCoordinates } from './figure-coordinates.js';
import { preparePanel } from './panel.js';

const data = chartData({ x: [0, 1], y: [1, 2] });
function svg(template = defaultTemplate()) {
  const result = renderFigureSvg(template, data);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.svg;
}
it('隐藏图层不绘制图层、图例、命中坐标及数据', () => {
  const t = defaultTemplate(),
    p = t.panels[0]!;
  p.visible = false;
  expect(svg(t)).not.toContain('data-role="panel"');
  expect(svg(t)).not.toContain('Series 1');
  expect(figureCoordinates(t, data).panels.size).toBe(0);
  expect(preparePanel(p, data, [])).toHaveLength(0);
});
it('隐藏整条曲线仍保留轴窗口，连接线开关不代表整条隐藏', () => {
  const t = defaultTemplate(),
    p = t.panels[0]!;
  p.axes.forEach((axis) => {
    axis.range = { mode: 'fixed', min: 0, max: 3 };
  });
  const plot = p.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('xy fixture');
  plot.lineStyle = {
    visible: false,
    color: '#000000',
    widthPt: 1,
    dash: 'solid',
  };
  expect(preparePanel(p, data, [])).toHaveLength(1);
  plot.visible = false;
  expect(preparePanel(p, data, [])).toHaveLength(0);
  expect(svg(t)).toContain('data-role="axes"');
  expect(svg(t)).not.toContain('data-role="plot-slot"');
  expect(svg(t)).not.toContain('Series 1');
});
it('背景、阴影、边框和正负裁剪量不改变轴映射', () => {
  const t = defaultTemplate(),
    p = t.panels[0]!;
  const rect = figureCoordinates(t, data).panels.get(p.panelId)!.rect;
  p.appearance = {
    background: { color: '#ffeecc', opacity: 0.5 },
    border: { visible: true, color: '#111111', widthPt: 1.5, dash: 'dashed' },
    shadow: {
      visible: true,
      color: '#333333',
      opacity: 0.3,
      offsetXPt: -2.5,
      offsetYPt: 3,
    },
  };
  p.clipMargins = { horizontalPct: -10, verticalPct: 10 };
  const result = svg(t);
  expect(result).toContain('data-role="layer-background"');
  expect(result).toContain('data-role="layer-border"');
  expect(result).toContain('data-role="layer-shadow"');
  expect(result).toContain('fill-opacity="0.5"');
  const clip = result.match(
    /data-role="panel-clip" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/,
  )!;
  expect(Number(clip[1])).toBeCloseTo(rect.x - rect.width * 0.1, 5);
  expect(Number(clip[4])).toBeCloseTo(rect.height * 0.8, 5);
  expect(figureCoordinates(t, data).panels.get(p.panelId)!.rect).toEqual(rect);
});
it.each([true, false])('显式轴数据顺序 %s 生效', (dataOnTopOfAxes) => {
  const t = defaultTemplate();
  t.panels[0]!.appearance = { dataOnTopOfAxes };
  const result = svg(t);
  expect(
    result.indexOf('data-role="axes"') < result.indexOf('data-role="plots"'),
  ).toBe(dataOnTopOfAxes);
});
