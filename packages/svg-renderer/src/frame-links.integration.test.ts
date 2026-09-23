import { expect, it } from 'vitest';
import { resolvePanelFrames } from '@plot-fig/figure-schema';
import { frameLinkTemplate } from '../../../tests/helpers/frame-link-fixtures.js';
import { chartData } from '../../../tests/helpers/chart-fixtures.js';
import { renderFigureSvg, figureCoordinates } from './index.js';
const data = chartData({ x: [-1, 0, 1], y: [1, 3, 2] });
it.each([false, true])(
  '父层隐藏=%s 时预览/命中和解除链接后的相同几何一致',
  (hidden) => {
    const t = frameLinkTemplate();
    t.panels[0]!.visible = !hidden;
    t.panels[0]!.frame = { x: 0.12, y: 0.14, width: 0.3, height: 0.3 };
    const resolved = resolvePanelFrames(t),
      baked = structuredClone(resolved);
    baked.panels.forEach((p) => delete p.frameLink);
    const result = renderFigureSvg(resolved, data);
    expect(result.ok).toBe(true);
    expect(renderFigureSvg(baked, data)).toEqual(result);
    const coordinates = figureCoordinates(resolved, data);
    expect(coordinates.panels.has('panel-main')).toBe(!hidden);
    for (const p of resolved.panels.filter((p) => p.visible !== false)) {
      const rect = coordinates.panels.get(p.panelId)!.rect;
      expect(rect.x).toBeCloseTo((p.frame.x * 180 * 72) / 25.4);
      expect(rect.y).toBeCloseTo((p.frame.y * 120 * 72) / 25.4);
      expect(rect.width).toBeCloseTo((p.frame.width * 180 * 72) / 25.4);
      expect(rect.height).toBeCloseTo((p.frame.height * 120 * 72) / 25.4);
    }
  },
);
it('渲染入口拒绝原始快照不一致，未自行改写传入对象', () => {
  const t = frameLinkTemplate(),
    before = structuredClone(t);
  t.panels[0]!.frame.x = 0.11;
  expect(renderFigureSvg(t, data).ok).toBe(false);
  expect(t.panels[1]!.frame).toEqual(before.panels[1]!.frame);
});
