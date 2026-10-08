import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  copyLayerFormat,
  pasteLayerFormat,
  layerFormatOptions,
  type LayerFormatScope,
} from '../state/layer-format.js';

export function applyBatchFormats(
  target: FigureTemplate,
  source: FigureTemplate,
  requested: LayerFormatScope[],
): FigureTemplate {
  const selected = new Set(requested);
  const scopes: LayerFormatScope[] = selected.has('all')
    ? ['all']
    : layerFormatOptions
        .map((option) => option.id)
        .filter(
          (scope) =>
            selected.has(scope) &&
            (!selected.has('styles') ||
              !['legend', 'background', 'colors', 'fonts'].includes(scope)),
        );
  let next = structuredClone(target);
  if (!scopes.length) return next;
  if (!source.panels.length) throw new Error('模板中没有可复用格式的图层');
  for (const [index, panel] of target.panels.entries()) {
    // 与样式模板相同：按图层顺序匹配，来源不足时循环复用。
    const sample = source.panels[index % source.panels.length]!;
    const snapshot = copyLayerFormat(source, sample.panelId, 'all');
    for (const scope of scopes)
      next = pasteLayerFormat(next, snapshot, panel.panelId, scope);
  }
  return next;
}
