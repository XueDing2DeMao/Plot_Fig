import { expect, it } from 'vitest';
import {
  layerGeometry,
  colorbarGeometry,
  colorbarLayout,
} from './layout-geometry.js';
import { pageGeometry } from './layout-geometry.js';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { figureCoordinates, renderFigureSvg } from './index.js';
it('非零边距不隐式移动旧图层，物理尺寸与内容区域分离', () => {
  const t = chartTemplate('xy');
  t.page.size = {
    width: { value: 200, unit: 'px' },
    height: { value: 100, unit: 'px' },
  };
  t.page.margins = { left: 10, right: 20, top: 5, bottom: 10 };
  const layout = pageGeometry(t.page);
  expect(layout).toEqual({
    page: { x: 0, y: 0, width: 150, height: 75 },
    content: { x: 10, y: 5, width: 120, height: 60 },
  });
  expect(layerGeometry(t.panels[0]!.frame, layout.page, 0).layer.x).toBeCloseTo(
    18,
  );
});
it('双颜色条热图的绘图区、导出剪裁和交互坐标一致', () => {
  const t = chartTemplate('heatmap');
  t.page.size = {
    width: { value: 180, unit: 'mm' },
    height: { value: 120, unit: 'mm' },
  };
  const plot = structuredClone(t.panels[0]!.plotSlots[0]!);
  plot.plotSlotId += '-second';
  t.panels[0]!.plotSlots.push(plot);
  const data = chartData({ x: [0, 1, 0, 1], y: [0, 0, 1, 1], z: [1, 3, 6, 9] });
  const expected = layerGeometry(
    t.panels[0]!.frame,
    pageGeometry(t.page).page,
    2,
  ).plot;
  const actual = figureCoordinates(t, data).panels.get(
    t.panels[0]!.panelId,
  )!.rect;
  expect(actual).toEqual(expected);
  const rendered = renderFigureSvg(t, data);
  expect(rendered.ok).toBe(true);
  if (!rendered.ok) throw new Error('render failed');
  const clip = rendered.svg.match(
    /data-role="panel-clip"[^>]*width="([^"]+)"/,
  )!;
  expect(Number(clip[1])).toBeCloseTo(expected.width, 5);
  const prior = rendered.svg;
  t.page.margins.left += 10;
  expect(renderFigureSvg(t, data)).toMatchObject({ ok: true, svg: prior });
});
it('统一图层、绘图区与色标位置，保留既有 60 pt 槽宽', () => {
  const layout = layerGeometry(
    { x: 0.1, y: 0.2, width: 0.8, height: 0.6 },
    { x: 0, y: 0, width: 1000, height: 500 },
    2,
  );
  expect(layout.layer).toEqual({ x: 100, y: 100, width: 800, height: 300 });
  expect(layout.plot).toEqual({ x: 100, y: 100, width: 680, height: 300 });
  expect(colorbarGeometry(layout.plot, 1)).toEqual({
    x: 858,
    y: 118,
    width: 10,
    height: 264,
  });
});

it('reserves the selected side for vertical and horizontal colorbars', () => {
  const t = chartTemplate('heatmap'),
    first: any = t.panels[0]!.plotSlots[0]!,
    second: any = structuredClone(first);
  Object.assign(first.colorScale.colorbar, {
    orientation: 'vertical',
    side: 'left',
    widthPt: 72,
  });
  Object.assign(second.colorScale.colorbar, {
    orientation: 'horizontal',
    side: 'top',
    widthPt: 72,
  });
  const layout = colorbarLayout([first, second]),
    geometry = layerGeometry(
      { x: 0, y: 0, width: 1, height: 1 },
      { x: 0, y: 0, width: 400, height: 300 },
      layout,
    );
  expect(layout).toEqual({ left: 122, right: 0, top: 130, bottom: 0 });
  expect(geometry.plot).toEqual({ x: 122, y: 130, width: 278, height: 170 });
});
