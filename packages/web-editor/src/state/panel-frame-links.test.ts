import { expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import {
  resolvePanelFrames,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import { defaultTemplate } from './default-template.js';
import {
  duplicatePanel,
  removePanel,
  layoutPanels,
} from './panel-operations.js';
import { setPanelFrameLink } from './panel-frame-links.js';
import {
  readPropertyObjectSettings,
  updatePropertyObjectSettings,
} from './property-object-settings.js';
import { arrangePanels, alignPanels } from './panel-layout.js';
import {
  resizePageLayers,
  fitLayersToBounds,
  fitPageToBounds,
  pageRect,
} from './page-geometry.js';
function model() {
  let m = { template: defaultTemplate(), workspace: emptyWorkspace() };
  m = duplicatePanel(m, m.template.panels[0]!.panelId);
  const [p, c] = m.template.panels;
  p!.frame = { x: 0.1, y: 0.1, width: 0.4, height: 0.6 };
  c!.frame = { x: 0.55, y: 0.2, width: 0.3, height: 0.25 };
  return m;
}
it('建链、换父层、逐分量解链不跳动，完全解除后独立', () => {
  const m = model(),
    ids = m.template.panels.map((p) => p.panelId);
  const linked = setPanelFrameLink(m.template, ids[1]!, ids[0]!, [
    'x',
    'width',
  ]);
  expect(linked.panels[1]!.frameLink!.parentPanelId).toBe(ids[0]);
  expect(linked.panels[1]!.frameLink!.x).toBeCloseTo(1.125);
  expect(linked.panels[1]!.frameLink!.width).toBeCloseTo(0.75);
  expect(linked.panels[1]!.frame).toEqual(m.template.panels[1]!.frame);
  const partial = setPanelFrameLink(linked, ids[1]!, ids[0]!, ['width']);
  expect(partial.panels[1]!.frameLink).not.toHaveProperty('x');
  expect(partial.panels[1]!.frame).toEqual(linked.panels[1]!.frame);
  const unlinked = setPanelFrameLink(partial, ids[1]!, undefined);
  expect(unlinked.panels[1]!.frameLink).toBeUndefined();
  expect(unlinked.panels[1]!.frame).toEqual(linked.panels[1]!.frame);
  const third = duplicatePanel({ ...m, template: linked }, ids[0]!);
  const swapped = setPanelFrameLink(
    third.template,
    ids[1]!,
    third.template.panels[2]!.panelId,
    ['x', 'width'],
  );
  expect(swapped.panels[1]!.frame).toEqual(linked.panels[1]!.frame);
});
it('父层位置修改传递给子层，子层越界时整体拒绝', () => {
  const m = model(),
    [p, c] = m.template.panels;
  const t = setPanelFrameLink(m.template, c!.panelId, p!.panelId, [
    'x',
    'width',
  ]);
  const ref = { kind: 'panel' as const, panelId: p!.panelId };
  const value = readPropertyObjectSettings(t, ref);
  if (value.kind !== 'panel') throw Error();
  value.frame = { x: 0.2, y: 0.1, width: 0.3, height: 0.6 };
  const r = updatePropertyObjectSettings(t, ref, value);
  expect(r.panels[1]!.frame.x).toBeCloseTo(0.5375);
  expect(r.panels[1]!.frame.width).toBeCloseTo(0.225);
  expect(validateFigureTemplate(r).ok).toBe(true);
  value.frame.x = 0.7;
  expect(() => updatePropertyObjectSettings(t, ref, value)).toThrow();
  expect(t.panels[0]!.frame.x).toBe(0.1);
});
it('复制子层保留父链接，删除父层保留子层快照并清理链接', () => {
  const m = model(),
    [p, c] = m.template.panels;
  m.template = setPanelFrameLink(m.template, c!.panelId, p!.panelId);
  const copied = duplicatePanel(m, c!.panelId);
  expect(copied.template.panels[2]!.frameLink).toEqual(
    m.template.panels[1]!.frameLink,
  );
  const deleted = removePanel(copied, p!.panelId);
  expect(deleted.template.panels.every((p) => !p.frameLink)).toBe(true);
  expect(deleted.template.panels.map((p) => p.frame)).toEqual(
    copied.template.panels.slice(1).map((p) => p.frame),
  );
});
it('循环被拒绝，任何涉及父子层的批量排列都不移动未选后代', () => {
  const m = model(),
    ids = m.template.panels.map((p) => p.panelId);
  const t = setPanelFrameLink(m.template, ids[1]!, ids[0]!);
  expect(() => setPanelFrameLink(t, ids[0]!, ids[1]!, ['width'])).toThrow(
    /循环/,
  );
  expect(() =>
    arrangePanels(t, {
      panelIds: ids,
      columns: 2,
      gapX: 5,
      gapY: 5,
      unit: '%',
      reference: 'page',
    }),
  ).toThrow(/解除/);
  expect(() =>
    alignPanels(t, { panelIds: ids, anchorPanelId: ids[0]!, action: 'left' }),
  ).toThrow(/解除/);
  expect(() =>
    layoutPanels(t, { columns: 2, gap: 0.1, margin: 0.1, labels: false }),
  ).toThrow(/解除/);
});
it('图页大小换算保持比例与实际尺寸，所有层可见时内容适配允许统一变换', () => {
  const m = model(),
    [p, c] = m.template.panels;
  const t = setPanelFrameLink(m.template, c!.panelId, p!.panelId);
  const candidate = structuredClone(t);
  candidate.page.size.width.value *= 2;
  const resized = resizePageLayers(t, candidate, true);
  expect(resized.panels[1]!.frame.width).toBeCloseTo(
    t.panels[1]!.frame.width / 2,
  );
  expect(resized.panels[1]!.frameLink).toEqual(t.panels[1]!.frameLink);
  expect(validateFigureTemplate(resized).ok).toBe(true);
  const fitted = fitLayersToBounds(
    t,
    {
      x: 0,
      y: 0,
      width: pageRect(t.page).width,
      height: pageRect(t.page).height,
    },
    true,
  );
  expect(resolvePanelFrames(fitted).panels).toEqual(fitted.panels);
});
it('隐藏父层不参与适配时，无法保留关联比例就拒绝', () => {
  const m = model(),
    [p, c] = m.template.panels;
  p!.visible = false;
  const t = setPanelFrameLink(m.template, c!.panelId, p!.panelId);
  const rect = pageRect(t.page),
    f = c!.frame;
  const bounds = {
    x: f.x * rect.width,
    y: f.y * rect.height,
    width: f.width * rect.width,
    height: f.height * rect.height,
  };
  expect(() => fitLayersToBounds(t, bounds, false)).toThrow(/解除/);
  expect(() => fitPageToBounds(t, bounds)).toThrow(/解除/);
});
