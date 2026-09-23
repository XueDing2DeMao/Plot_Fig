import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { RenderDiagnostic } from './types.js';
import { createScale, type PlotScale } from './scales.js';
import { validateAxisAppearance } from './axis-appearance.js';
import { readAxisAppearance } from './axis-appearance-options.js';
import { panelRect } from './geometry.js';
import { pageViewport } from './page-size.js';

export function axisTickDiagnostic(
  panelId: string,
  axisId: string,
  cause: unknown,
): RenderDiagnostic {
  return {
    code: 'RENDER_TEMPLATE_INVALID',
    severity: 'error',
    sourcePath: `/panels/${panelId}/axes/${axisId}`,
    message: cause instanceof Error ? cause.message : String(cause),
  };
}

// 结构与领域校验由调用方执行；自动范围仍需绑定数据后由正常渲染校验。
// 保留既有入口名称，同时校验固定轴的网格预算、显示数值及外观几何。
export function validateFixedAxisTicks(
  template: FigureTemplate,
): RenderDiagnostic[] {
  const diagnostics: RenderDiagnostic[] = [];
  for (const panel of template.panels) {
    if (panel.visible === false) continue;
    const rect = panelRect(panel.frame, pageViewport(template.page));
    const scales = new Map<string, PlotScale>();
    for (const axis of panel.axes) {
      if (axis.range.mode !== 'fixed' || axis.scale === 'category') continue;
      const scale = createScale(axis, axis.range.min, axis.range.max);
      if (scale) scales.set(axis.axisId, scale);
    }
    for (const axis of panel.axes) {
      if (
        !axis.visible ||
        axis.range.mode !== 'fixed' ||
        axis.scale === 'category'
      )
        continue;
      try {
        const scale = scales.get(axis.axisId);
        if (!scale) throw new Error('坐标轴固定范围无法建立有效刻度比例尺');
        const options = readAxisAppearance(axis);
        const placement = options.placement;
        if (placement?.mode === 'cross') {
          const opposite = panel.axes.find(
            (candidate) => candidate.axisId === placement.axisId,
          );
          // 只延迟尚无数据的对侧自动范围映射，其他源轴草稿仍立即验证。
          if (opposite && opposite.range.mode !== 'fixed')
            options.placement = {
              mode: 'frame',
              ...(placement.offsetPt === undefined
                ? {}
                : { offsetPt: placement.offsetPt }),
            };
        }
        validateAxisAppearance(axis, rect, scale, options, {
          axes: panel.axes,
          scales,
        });
      } catch (cause) {
        diagnostics.push(axisTickDiagnostic(panel.panelId, axis.axisId, cause));
      }
    }
  }
  return diagnostics;
}
