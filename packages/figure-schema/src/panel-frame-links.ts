import type { FigureTemplate, Panel } from './schema/figure-template.js';
import type { ValidationIssue } from './validation/types.js';

const keys = ['x', 'y', 'width', 'height'] as const;
type Frame = Panel['frame'];
class FrameLinkError extends Error {
  constructor(
    public path: string,
    message: string,
  ) {
    super(message);
  }
}
function normalized(frame: Frame): Frame {
  const f = { ...frame };
  for (const key of keys) {
    if (Math.abs(f[key]) < 1e-12) f[key] = 0;
    if (Math.abs(f[key] - 1) < 1e-12) f[key] = 1;
  }
  if (Math.abs(f.x + f.width - 1) < 1e-12) f.width = 1 - f.x;
  if (Math.abs(f.y + f.height - 1) < 1e-12) f.height = 1 - f.y;
  return f;
}

/** 仅用于已具备结构的编辑候选或已验证输入；不替代导入时的原始快照校验。 */
export function resolvePanelFrames(template: FigureTemplate): FigureTemplate {
  if (!template.panels.some((p) => p.frameLink)) return template;
  const panels = new Map(
    template.panels.map((p, i) => [p.panelId, { panel: p, index: i }]),
  );
  if (panels.size !== template.panels.length)
    throw new FrameLinkError('/panels', '图层标识重复，无法解析链接');
  const frames = new Map<string, Frame>();
  for (const start of template.panels) {
    const chain: Panel[] = [],
      visiting = new Map<string, number>();
    let current: Panel | undefined = start;
    while (current && !frames.has(current.panelId)) {
      const path = `/panels/${panels.get(current.panelId)!.index}/frameLink`;
      const seen = visiting.get(current.panelId);
      if (seen !== undefined)
        throw new FrameLinkError(
          path,
          `图层链接形成循环：${[...chain.slice(seen).map((p) => p.panelId), current.panelId].join(' → ')}`,
        );
      visiting.set(current.panelId, chain.length);
      chain.push(current);
      const link: Panel['frameLink'] = current.frameLink;
      if (!link) break;
      if (
        !keys.some((k) => link[k] !== undefined) ||
        Object.keys(link).some(
          (k) =>
            k !== 'parentPanelId' && !keys.includes(k as (typeof keys)[number]),
        )
      )
        throw new FrameLinkError(
          path,
          '链接至少包含一个位置或尺寸，且不能包含未知字段',
        );
      for (const key of keys)
        if (
          link[key] !== undefined &&
          (!Number.isFinite(link[key]) ||
            ((key === 'width' || key === 'height') && link[key]! <= 0))
        )
          throw new FrameLinkError(
            `${path}/${key}`,
            '链接比例必须是有效数字，宽高比例必须大于 0',
          );
      const parent: Panel | undefined = panels.get(link.parentPanelId)?.panel;
      if (!parent)
        throw new FrameLinkError(
          `${path}/parentPanelId`,
          `找不到父图层 ${link.parentPanelId}`,
        );
      current = parent;
    }
    for (const panel of chain.reverse()) {
      const link = panel.frameLink;
      let frame = panel.frame;
      if (link) {
        const parent = frames.get(link.parentPanelId)!;
        frame = { ...frame };
        if (link.x !== undefined) frame.x = parent.x + link.x * parent.width;
        if (link.y !== undefined) frame.y = parent.y + link.y * parent.height;
        if (link.width !== undefined) frame.width = link.width * parent.width;
        if (link.height !== undefined)
          frame.height = link.height * parent.height;
        frame = normalized(frame);
      }
      if (
        !keys.every((k) => Number.isFinite(frame[k])) ||
        frame.x < 0 ||
        frame.y < 0 ||
        frame.width <= 0 ||
        frame.height <= 0 ||
        frame.x + frame.width > 1 ||
        frame.y + frame.height > 1
      )
        throw new FrameLinkError(
          `/panels/${panels.get(panel.panelId)!.index}/frameLink`,
          `图层 ${panel.name ?? panel.panelId} 链接后的尺寸无效或超出图页`,
        );
      frames.set(panel.panelId, frame);
    }
  }
  return {
    ...template,
    panels: template.panels.map((panel) => ({
      ...panel,
      frame: { ...frames.get(panel.panelId)! },
    })),
  };
}

export function validatePanelFrameLinks(
  template: FigureTemplate,
): ValidationIssue[] {
  try {
    const resolved = resolvePanelFrames(template);
    return template.panels.flatMap((panel, i) =>
      keys.flatMap((key) =>
        panel.frameLink?.[key] !== undefined &&
        Math.abs(panel.frame[key] - resolved.panels[i]!.frame[key]) > 1e-9
          ? [
              {
                code: 'FIGURE_DOMAIN_INVARIANT_FAILED' as const,
                path: `/panels/${i}/frameLink/${key}`,
                message: `图层 ${panel.panelId} 的位置快照与链接计算不一致`,
              },
            ]
          : [],
      ),
    );
  } catch (cause) {
    return [
      {
        code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
        path: cause instanceof FrameLinkError ? cause.path : '/panels',
        message: cause instanceof Error ? cause.message : '图层链接无效',
      },
    ];
  }
}
