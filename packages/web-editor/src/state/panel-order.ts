import type { FigureTemplate } from '@plot-fig/figure-schema';

export type PanelOrderAction = 'front' | 'forward' | 'backward' | 'back';

// SVG 按数组顺序绘制，末尾图层覆盖前面的图层；身份和绑定不随顺序改变。
export function reorderPanel(
  template: FigureTemplate,
  panelId: string,
  action: PanelOrderAction,
): FigureTemplate {
  const index = template.panels.findIndex((panel) => panel.panelId === panelId);
  if (index < 0) throw new Error('找不到图层');
  const last = template.panels.length - 1;
  const target =
    action === 'front'
      ? last
      : action === 'back'
        ? 0
        : Math.max(0, Math.min(last, index + (action === 'forward' ? 1 : -1)));
  if (index === target) return template;
  const next = structuredClone(template);
  const [panel] = next.panels.splice(index, 1);
  next.panels.splice(target, 0, panel!);
  return next;
}
