import { expect, it } from 'vitest';
import { validateFigureTemplate } from './validate.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import { validTemplate } from '../schema/fixtures.js';
import { resolvePanelFrames } from '../panel-frame-links.js';

export function linkedTemplate(): FigureTemplate {
  const t: FigureTemplate = structuredClone(validTemplate);
  const parent = t.panels[0]!;
  parent.frame = { x: 0.1, y: 0.1, width: 0.4, height: 0.6 };
  const child = structuredClone(parent);
  child.panelId = 'child';
  child.plotSlots = [];
  child.axes.forEach((a) => {
    a.axisId += '-child';
  });
  child.frame = { x: 0.55, y: 0.2, width: 0.3, height: 0.25 };
  Object.assign(child, {
    frameLink: { parentPanelId: parent.panelId, x: 1.125, width: 0.75 },
  });
  t.panels.push(child);
  return t;
}
it('接纳链接、负位置比例和独立几何分量', () => {
  const t = linkedTemplate();
  expect(validateFigureTemplate(t).issues).toEqual([]);
  Object.assign(t.panels[1]!, {
    frame: { x: 0, y: 0.2, width: 0.3, height: 0.25 },
    frameLink: { parentPanelId: 'panel-main', x: -0.25, width: 0.75 },
  });
  expect(validateFigureTemplate(t).ok).toBe(true);
});
it.each([
  { parentPanelId: 'panel-main' },
  { parentPanelId: 'panel-main', width: 0 },
  { parentPanelId: 'panel-main', height: -0.5 },
  { parentPanelId: 'panel-main', x: Infinity },
  { parentPanelId: 'panel-main', x: NaN },
  { parentPanelId: 'panel-main', z: 0.5 },
  { parentPanelId: '', x: 0 },
  { parentPanelId: 'missing', x: 0 },
  { parentPanelId: 'child', width: 1 },
])('拒绝无效链接 %j', (frameLink) => {
  const t = linkedTemplate();
  Object.assign(t.panels[1]!, { frameLink });
  const r = validateFigureTemplate(t);
  expect(r.ok).toBe(false);
  expect(r.issues.some((i) => i.path.includes('frameLink'))).toBe(true);
});
it('原始快照不一致时拒绝，而不是替导入者覆盖', () => {
  const t = linkedTemplate();
  t.panels[1]!.frame.x = 0.4;
  expect(validateFigureTemplate(t)).toMatchObject({
    ok: false,
    issues: [
      expect.objectContaining({ message: expect.stringMatching(/快照/) }),
    ],
  });
  expect(t.panels[1]!.frame.x).toBe(0.4);
});
it('多层循环提供闭合路径，即使只链接一个尺寸', () => {
  const t = linkedTemplate();
  Object.assign(t.panels[0]!, {
    frameLink: { parentPanelId: 'child', height: 1 },
  });
  expect(validateFigureTemplate(t)).toMatchObject({
    ok: false,
    issues: [
      expect.objectContaining({
        message: expect.stringMatching(/循环.*panel-main.*child.*panel-main/),
      }),
    ],
  });
});
it('父层变动仅驱动指定分量，隐藏父层仍生效，解析不改变输入', () => {
  const t = linkedTemplate();
  t.panels[0]!.visible = false;
  t.panels[0]!.frame = { x: 0.2, y: 0.1, width: 0.3, height: 0.6 };
  const before = structuredClone(t),
    r = resolvePanelFrames(t);
  expect(r.panels[1]!.frame.x).toBeCloseTo(0.5375);
  expect(r.panels[1]!.frame.width).toBeCloseTo(0.225);
  expect(r.panels[1]!.frame.y).toBe(0.2);
  expect(r.panels[1]!.frame.height).toBe(0.25);
  expect(t).toEqual(before);
  expect(validateFigureTemplate(r).ok).toBe(true);
});
it('无关数组顺序与多级链得到同样几何', () => {
  const t = linkedTemplate(),
    child = t.panels[1]!,
    grand = structuredClone(child);
  grand.panelId = 'grand';
  grand.axes.forEach((a) => (a.axisId += '-grand'));
  grand.frameLink = {
    parentPanelId: 'child',
    x: 0,
    y: 0,
    width: 0.5,
    height: 0.5,
  };
  t.panels.push(grand);
  t.panels[0]!.frame.x = 0.15;
  const r = resolvePanelFrames(t);
  const reverse = resolvePanelFrames({ ...t, panels: [...t.panels].reverse() });
  expect(reverse.panels.reverse()).toEqual(r.panels);
  for (const [key, value] of Object.entries({
    x: 0.6,
    y: 0.2,
    width: 0.15,
    height: 0.125,
  }))
    expect(
      r.panels[2]!.frame[key as keyof (typeof r.panels)[2]['frame']],
    ).toBeCloseTo(value, 12);
});
it.each([4, Number.MAX_VALUE])('链接后越界或溢出 %s 不能提交', (ratio) => {
  const t = linkedTemplate();
  t.panels[1]!.frameLink!.width = ratio;
  expect(() => resolvePanelFrames(t)).toThrow(/超出/);
});
