import type { FigureTemplate } from '@plot-fig/figure-schema';
import { assertTemplate } from './publication-utils.js';
import { assertIndependentLayout } from './panel-frame-links.js';
import {
  contentRect,
  pageRect,
  normalizeFrame,
  unionBounds,
  convertLength,
  type GeometryRect,
  type GeometryUnit,
} from './page-geometry.js';

export type LayoutReference = 'selection' | 'page' | 'content';
export type GridOptions = {
  panelIds: string[];
  columns: number;
  gapX: number;
  gapY: number;
  unit: GeometryUnit;
  reference: LayoutReference;
};
export type AlignmentAction =
  | 'left'
  | 'centerX'
  | 'right'
  | 'top'
  | 'centerY'
  | 'bottom'
  | 'width'
  | 'height'
  | 'size';
export type AlignmentOptions = {
  panelIds: string[];
  anchorPanelId: string;
  action: AlignmentAction;
};

function selectedPanels(template: FigureTemplate, panelIds: string[]) {
  const ids = new Set(panelIds);
  const panels = template.panels.filter((p) => ids.has(p.panelId));
  if (panels.length !== ids.size) throw new Error('所选图层不存在，请重新选择');
  if (panels.length < 2) throw new Error('请至少选择两个图层');
  assertIndependentLayout(template, panelIds);
  return panels;
}

function layoutRect(
  template: FigureTemplate,
  panels: FigureTemplate['panels'],
  reference: LayoutReference,
) {
  const page = pageRect(template.page);
  return reference === 'page'
    ? page
    : reference === 'content'
      ? contentRect(template.page)
      : unionBounds(
          panels.map(({ frame: f }) => ({
            x: f.x * page.width,
            y: f.y * page.height,
            width: f.width * page.width,
            height: f.height * page.height,
          })),
        );
}
function unitPoints(unit: GeometryUnit, length: number) {
  return unit === '%'
    ? length / 100
    : convertLength({ value: 1, unit }, 'in').value * 72;
}
export function convertLayoutGaps(
  template: FigureTemplate,
  options: Pick<
    GridOptions,
    'panelIds' | 'reference' | 'unit' | 'gapX' | 'gapY'
  >,
  to: GeometryUnit,
) {
  const rect = layoutRect(
    template,
    selectedPanels(template, options.panelIds),
    options.reference,
  );
  if (![options.gapX, options.gapY].every((n) => Number.isFinite(n) && n >= 0))
    throw new Error('请先填写完整的非负间距，再切换单位');
  return {
    gapX:
      (options.gapX * unitPoints(options.unit, rect.width)) /
      unitPoints(to, rect.width),
    gapY:
      (options.gapY * unitPoints(options.unit, rect.height)) /
      unitPoints(to, rect.height),
  };
}

function applyFrames(
  template: FigureTemplate,
  frames: Map<string, GeometryRect>,
): FigureTemplate {
  const next = structuredClone(template);
  for (const panel of next.panels) {
    const frame = frames.get(panel.panelId);
    if (!frame) continue;
    const f = normalizeFrame(frame);
    if (
      !Object.values(f).every(Number.isFinite) ||
      f.x < 0 ||
      f.y < 0 ||
      f.width <= 0 ||
      f.height <= 0 ||
      f.x + f.width > 1 ||
      f.y + f.height > 1
    )
      throw new Error('操作会使图层超出图页或尺寸无效，请调整参数或基准图层');
    panel.frame = f;
  }
  return assertTemplate(next);
}

export function arrangePanels(
  template: FigureTemplate,
  options: GridOptions,
): FigureTemplate {
  const panels = selectedPanels(template, options.panelIds);
  const { columns, gapX, gapY, unit, reference } = options;
  if (!Number.isInteger(columns) || columns < 1 || columns > panels.length)
    throw new Error(`列数应为 1 至 ${panels.length} 的整数`);
  if (![gapX, gapY].every((v) => Number.isFinite(v) && v >= 0))
    throw new Error('横向和纵向间距必须为非负数');
  const page = pageRect(template.page);
  const rect = layoutRect(template, panels, reference);
  const dx = gapX * unitPoints(unit, rect.width),
    dy = gapY * unitPoints(unit, rect.height);
  const rows = Math.ceil(panels.length / columns);
  const width = (rect.width - (columns - 1) * dx) / columns;
  const height = (rect.height - (rows - 1) * dy) / rows;
  if (width <= rect.width * 1e-12 || height <= rect.height * 1e-12)
    throw new Error('间距过大，排列区域没有剩余的图层空间');
  return applyFrames(
    template,
    new Map(
      panels.map((p, i) => [
        p.panelId,
        {
          x: (rect.x + (i % columns) * (width + dx)) / page.width,
          y: (rect.y + Math.floor(i / columns) * (height + dy)) / page.height,
          width: width / page.width,
          height: height / page.height,
        },
      ]),
    ),
  );
}

export function alignPanels(
  template: FigureTemplate,
  options: AlignmentOptions,
): FigureTemplate {
  const panels = selectedPanels(template, options.panelIds);
  const anchor = panels.find((p) => p.panelId === options.anchorPanelId);
  if (!anchor) throw new Error('请从参与对齐的图层中选择基准图层');
  const a = anchor.frame;
  const frames = new Map<string, GeometryRect>();
  for (const panel of panels) {
    if (panel === anchor) continue;
    const f = { ...panel.frame };
    switch (options.action) {
      case 'left':
        f.x = a.x;
        break;
      case 'centerX':
        f.x = a.x + (a.width - f.width) / 2;
        break;
      case 'right':
        f.x = a.x + a.width - f.width;
        break;
      case 'top':
        f.y = a.y;
        break;
      case 'centerY':
        f.y = a.y + (a.height - f.height) / 2;
        break;
      case 'bottom':
        f.y = a.y + a.height - f.height;
        break;
      case 'width':
        f.width = a.width;
        break;
      case 'height':
        f.height = a.height;
        break;
      case 'size':
        f.width = a.width;
        f.height = a.height;
        break;
    }
    frames.set(panel.panelId, f);
  }
  return applyFrames(template, frames);
}
