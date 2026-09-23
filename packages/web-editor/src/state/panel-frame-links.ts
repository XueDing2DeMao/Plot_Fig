import {
  resolvePanelFrames,
  type FigureTemplate,
  type Panel,
  type PanelFrameLink,
} from '@plot-fig/figure-schema';
import { assertTemplate } from './publication-utils.js';
export type FrameComponent = keyof Panel['frame'];
export const frameComponents: FrameComponent[] = ['x', 'y', 'width', 'height'];
export function setPanelFrameLink(
  template: FigureTemplate,
  panelId: string,
  parentPanelId: string | undefined,
  components: FrameComponent[] = frameComponents,
): FigureTemplate {
  const next = structuredClone(resolvePanelFrames(template)),
    panel = next.panels.find((p) => p.panelId === panelId);
  if (!panel) throw new Error('找不到图层');
  if (!parentPanelId || !components.length) delete panel.frameLink;
  else {
    const parent = next.panels.find((p) => p.panelId === parentPanelId);
    if (!parent) throw new Error('找不到父图层');
    const f = panel.frame,
      p = parent.frame,
      link: PanelFrameLink = { parentPanelId };
    for (const key of components) {
      if (key === 'x') link.x = (f.x - p.x) / p.width;
      if (key === 'y') link.y = (f.y - p.y) / p.height;
      if (key === 'width') link.width = f.width / p.width;
      if (key === 'height') link.height = f.height / p.height;
    }
    panel.frameLink = link;
  }
  return assertTemplate(resolvePanelFrames(next));
}
export function assertIndependentLayout(
  template: FigureTemplate,
  panelIds: string[],
): void {
  const ids = new Set(panelIds),
    names = new Map(
      template.panels.map((p) => [p.panelId, p.name ?? p.panelId]),
    );
  const links = template.panels.filter(
    (p) =>
      p.frameLink && (ids.has(p.panelId) || ids.has(p.frameLink.parentPanelId)),
  );
  if (links.length)
    throw new Error(
      `请先解除相关位置／尺寸链接再排列：${links.map((p) => `${names.get(p.frameLink!.parentPanelId)} → ${names.get(p.panelId)}`).join('；')}`,
    );
}
export function assertEditableFrame(panel: Panel, frame: Panel['frame']): void {
  if (
    frameComponents.some(
      (key) =>
        panel.frameLink?.[key] !== undefined &&
        (!Number.isFinite(frame[key]) ||
          Math.abs(frame[key] - panel.frame[key]) > 1e-9),
    )
  )
    throw new Error('已链接的分量请使用相对父图层的比例修改，或先解除链接');
}
export function preserveFrameLinkGeometry(
  template: FigureTemplate,
): FigureTemplate {
  try {
    const resolved = resolvePanelFrames(template);
    if (
      template.panels.some((p, i) =>
        frameComponents.some(
          (k) => Math.abs(p.frame[k] - resolved.panels[i]!.frame[k]) > 1e-9,
        ),
      )
    )
      throw new Error('适配目标与现有链接比例冲突');
    return resolved;
  } catch (cause) {
    throw new Error(
      `请先解除相关链接再适配：${cause instanceof Error ? cause.message : '图层链接无效'}`,
    );
  }
}
