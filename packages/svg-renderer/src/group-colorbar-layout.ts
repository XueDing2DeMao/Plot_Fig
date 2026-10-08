import type { FigureTemplate, Panel } from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { PreparedPlot } from './charts/prepared.js';
import { makeColorScale } from './charts/color-scale.js';
import {
  colorbarLayout,
  colorbarSlotSize,
  layerGeometry,
  pageGeometry,
} from './layout-geometry.js';
import { alignYAxisScales } from './axis-alignment.js';
import { constrainAxisLengths } from './axis-length-ratio.js';
import { prepareAxisScale } from './panel-scales.js';
import type { PlotScale } from './scales.js';
import { createScale } from './scales.js';
import { renderAxisAppearance } from './axis-appearance.js';
import { readAxisAppearance } from './axis-appearance-options.js';
import { groupColorbars, type GroupColorbar } from './group-colorbars.js';
import { formatNumber, type Rect } from './geometry.js';
import { layoutText } from './text/layout.js';

export const GROUP_COLORBAR_LAYOUT_ERROR =
  '图层尺寸不足以排列颜色条，请扩大图层、缩短标题或关闭部分色标';
export type GroupColorbarPanelLayout = {
  available: ReturnType<typeof layerGeometry>;
  bars: { bar: GroupColorbar; rect: Rect }[];
  heatmaps: Map<string, Rect>;
};

function panelScales(
  template: FigureTemplate,
  panel: Panel,
  plots: PreparedPlot[],
  shared: Map<string, PlotScale>,
  data?: DataBindingSet,
) {
  const sharedIds = new Set(
    template.sharedAxisGroups?.flatMap((g) => g.members.map((m) => m.axisId)),
  );
  const scales = new Map<string, PlotScale>();
  for (const axis of panel.axes) {
    const scale =
      shared.has(axis.axisId) || sharedIds.has(axis.axisId)
        ? shared.get(axis.axisId)
        : prepareAxisScale(axis, plots, data);
    if (scale) scales.set(axis.axisId, scale);
  }
  const aligned = alignYAxisScales(panel, scales);
  if (!aligned.ok) throw new Error(aligned.message);
  return aligned.scales;
}

function axisRightEdge(
  panel: Panel,
  rect: Rect,
  scales: Map<string, PlotScale>,
) {
  let right = rect.x + rect.width;
  for (const axis of panel.axes) {
    if (!axis.visible) continue;
    let rendered = axis;
    let scale = scales.get(axis.axisId);
    if (!scale) {
      if (axis.placement?.mode === 'cross') continue;
      rendered = structuredClone(axis);
      rendered.scale = 'linear';
      rendered.range = { mode: 'auto' };
      rendered.majorTicks.visible = false;
      rendered.minorTicks.visible = false;
      rendered.tickLabels.visible = false;
      delete rendered.title;
      delete rendered.grid;
      scale = createScale(rendered, 0, 1);
    }
    if (!scale) continue;
    renderAxisAppearance(rendered, rect, scale, readAxisAppearance(rendered), {
      axes: panel.axes,
      scales: new Map(scales).set(axis.axisId, scale),
      onBounds: (b) => {
        right = Math.max(right, b.x + b.width);
      },
    });
  }
  return right;
}

function heatmapWidth(item: PreparedPlot, fontFamily: string) {
  const plot = item.plot;
  if (plot.kind !== 'heatmap' && plot.kind !== 'contour') return 0;
  const config = plot.colorScale,
    bar = config.colorbar;
  const scale = makeColorScale(
    bar.mode === 'independent' && bar.range
      ? { ...config, range: { mode: 'fixed', ...bar.range } }
      : config,
    item.grid?.values ?? item.irregular?.points.map((p) => p.z) ?? [],
  );
  const n = bar.majorTicks ?? 3;
  const labels = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1),
      v =
        config.transform === 'log10'
          ? 10 ** (Math.log10(scale.min) * (1 - t) + Math.log10(scale.max) * t)
          : scale.min * (1 - t) + scale.max * t;
    return bar.notation === 'scientific'
      ? v.toExponential(bar.precision ?? 6)
      : bar.notation === 'fixed'
        ? v.toFixed(bar.precision ?? 6)
        : formatNumber(v);
  });
  const width = (text: string) =>
    layoutText(
      text.replace(/\s+/g, ' '),
      { fontFamily, fontSizePt: 8, color: '#000000' },
      { format: 'plain' },
    ).bounds.width;
  return Math.max(
    colorbarSlotSize(plot),
    width(bar.title) + 8,
    (bar.widthPt ?? 10) + 5 + Math.max(...labels.map(width)) + 8,
  );
}

/** 有效组色标出现时才启用；无开关的旧布局与输出保持原样。 */
export function planGroupColorbarLayouts(
  template: FigureTemplate,
  data: DataBindingSet | undefined,
  prepared: Map<string, PreparedPlot[]>,
  shared: Map<string, PlotScale>,
) {
  const result = new Map<string, GroupColorbarPanelLayout>();
  if (
    !data ||
    !template.panels.some(
      (p) =>
        p.visible !== false &&
        p.groups?.some(
          (g) => g.mode === 'dependent' && g.colorMapping?.colorbar?.visible,
        ),
    )
  )
    return result;
  const page = pageGeometry(template.page).page;
  const contexts = template.panels
    .filter((p) => p.visible !== false)
    .map((panel) => {
      const plots = prepared.get(panel.panelId) ?? [],
        scales = panelScales(template, panel, plots, shared, data);
      return {
        panel,
        plots,
        scales,
        reserved: colorbarLayout(plots.map((p) => p.plot)),
        bars: groupColorbars(
          panel,
          plots,
          scales,
          template.theme.font.family,
          data,
        ),
      };
    });
  if (!contexts.some((c) => c.bars.length)) return result;
  const parent = new Map(
    contexts.map((c) => [c.panel.panelId, c.panel.panelId]),
  );
  const root = (id: string): string =>
    parent.get(id) === id ? id : root(parent.get(id)!);
  const sameX = (a: Panel, b: Panel) =>
    Math.abs(a.frame.x - b.frame.x) < 1e-9 &&
    Math.abs(a.frame.width - b.frame.width) < 1e-9;
  const join = (a: string, b: string) => {
    const first = contexts.find((c) => c.panel.panelId === a),
      second = contexts.find((c) => c.panel.panelId === b);
    if (first && second && sameX(first.panel, second.panel))
      parent.set(root(b), root(a));
  };
  for (const c of contexts)
    if (c.panel.frameLink)
      join(c.panel.panelId, c.panel.frameLink.parentPanelId);
  for (const g of template.sharedAxisGroups ?? []) {
    const members = g.members.filter(
      (m) =>
        contexts
          .find((c) => c.panel.panelId === m.panelId)
          ?.panel.axes.find((a) => a.axisId === m.axisId)?.dimension === 'x',
    );
    for (const m of members.slice(1)) join(members[0]!.panelId, m.panelId);
  }
  const components = new Map<string, typeof contexts>();
  for (const c of contexts) {
    const key = root(c.panel.panelId);
    components.set(key, [...(components.get(key) ?? []), c]);
  }
  const occupied: { component: string; rect: Rect }[] = [];
  for (const component of components.values()) {
    if (!component.some((c) => c.bars.length)) continue;
    const rows: (typeof contexts)[] = [];
    for (const c of component) {
      const f = c.panel.frame;
      const row = rows.find(
        (r) =>
          Math.abs(r[0]!.panel.frame.y - f.y) < 1e-9 &&
          Math.abs(r[0]!.panel.frame.height - f.height) < 1e-9,
      );
      if (row) row.push(c);
      else rows.push([c]);
    }
    for (let i = 0; i < rows.length; i++)
      for (const other of rows.slice(i + 1)) {
        const a = rows[i]![0]!.panel.frame,
          b = other[0]!.panel.frame;
        if (
          Math.min(a.y + a.height, b.y + b.height) >
          Math.max(a.y, b.y) + 1e-9
        )
          throw new Error(GROUP_COLORBAR_LAYOUT_ERROR);
      }
    const slots = rows.map((row) => {
      const heatmaps = row.flatMap((c) =>
        c.plots
          .filter(
            (p) =>
              (p.plot.kind === 'heatmap' || p.plot.kind === 'contour') &&
              p.plot.colorScale.colorbar.visible &&
              (p.plot.colorScale.colorbar.orientation ?? 'vertical') ===
                'vertical' &&
              (p.plot.colorScale.colorbar.side ?? 'right') === 'right',
          )
          .map((item) => ({
            owner: c,
            item,
            width: heatmapWidth(item, template.theme.font.family),
          })),
      );
      const groups = row.flatMap((c) =>
        c.bars.map((bar) => ({ owner: c, bar, width: bar.width })),
      );
      return {
        row,
        heatmaps,
        groups,
        width: [...heatmaps, ...groups].reduce((sum, s) => sum + s.width, 0),
        edge: 0,
      };
    });
    let right = Math.max(...slots.map((s) => s.width + 8));
    const left = Math.max(...component.map((c) => c.reserved.left));
    const geometries = new Map<
      string,
      ReturnType<typeof constrainAxisLengths>
    >();
    let stable = false;
    for (let iteration = 0; iteration < 4; iteration++) {
      for (const c of component) {
        const row = rows.find((r) => r.includes(c))!;
        const available = layerGeometry(c.panel.frame, page, {
          ...c.reserved,
          left,
          right,
          top: Math.max(...row.map((member) => member.reserved.top)),
          bottom: Math.max(...row.map((member) => member.reserved.bottom)),
        });
        if (available.plot.width < 60 || available.plot.height < 40)
          throw new Error(GROUP_COLORBAR_LAYOUT_ERROR);
        const geometry = constrainAxisLengths(
          available,
          c.panel.axisLengthRatio,
          c.scales,
        );
        if (geometry.plot.width < 60 || geometry.plot.height < 40)
          throw new Error(GROUP_COLORBAR_LAYOUT_ERROR);
        geometries.set(c.panel.panelId, geometry);
        result.set(c.panel.panelId, {
          available,
          bars: [],
          heatmaps: new Map(),
        });
      }
      // 关联图层的数据比例若无法保持共用横向绘图区，明确报错。
      const first = geometries.get(component[0]!.panel.panelId)!.plot;
      if (
        component.some(
          (c) =>
            Math.abs(geometries.get(c.panel.panelId)!.plot.x - first.x) >
              1e-6 ||
            Math.abs(
              geometries.get(c.panel.panelId)!.plot.width - first.width,
            ) > 1e-6,
        )
      )
        throw new Error(GROUP_COLORBAR_LAYOUT_ERROR);
      for (const row of rows) {
        const plot = geometries.get(row[0]!.panel.panelId)!.plot;
        if (
          row.some((c) => {
            const other = geometries.get(c.panel.panelId)!.plot;
            return (
              Math.abs(other.y - plot.y) > 1e-6 ||
              Math.abs(other.height - plot.height) > 1e-6
            );
          })
        )
          throw new Error(GROUP_COLORBAR_LAYOUT_ERROR);
      }
      let required = right;
      for (const slot of slots) {
        slot.edge = Math.max(
          ...slot.row.map((c) =>
            axisRightEdge(
              c.panel,
              geometries.get(c.panel.panelId)!.plot,
              c.scales,
            ),
          ),
        );
        required = Math.max(
          required,
          slot.width + 8 + slot.edge - (first.x + first.width),
        );
      }
      if (required <= right + 1e-6) {
        stable = true;
        break;
      }
      right = required;
    }
    if (!stable) throw new Error(GROUP_COLORBAR_LAYOUT_ERROR);
    for (const slot of slots) {
      let x = slot.edge + 8;
      const geometry = geometries.get(slot.row[0]!.panel.panelId)!;
      occupied.push({
        component: root(slot.row[0]!.panel.panelId),
        rect: {
          x,
          y: geometry.layer.y,
          width: slot.width,
          height: geometry.layer.height,
        },
      });
      for (const s of slot.heatmaps) {
        const geometry = geometries.get(s.owner.panel.panelId)!;
        const plot = s.item.plot;
        if (plot.kind !== 'heatmap' && plot.kind !== 'contour') continue;
        const height =
          geometry.status === 'active'
            ? geometry.layer.height
            : geometry.plot.height;
        const length = plot.colorScale.colorbar.length ?? 1;
        const h = Math.max(24, height - 36) * length;
        const rect = {
          x,
          y: geometry.plot.y + 18 + (Math.max(24, height - 36) - h) / 2,
          width: plot.colorScale.colorbar.widthPt ?? 10,
          height: h,
        };
        result.get(s.owner.panel.panelId)!.heatmaps.set(plot.plotSlotId, rect);
        x += s.width;
      }
      for (const s of slot.groups) {
        const geometry = geometries.get(s.owner.panel.panelId)!;
        const height =
          geometry.status === 'active'
            ? geometry.layer.height
            : geometry.plot.height;
        if (
          height < 60 ||
          x + s.width > geometry.layer.x + geometry.layer.width + 1e-6
        )
          throw new Error(GROUP_COLORBAR_LAYOUT_ERROR);
        const rect = {
          x,
          y: geometry.plot.y + 18,
          width: 10,
          height: height - 36,
        };
        result.get(s.owner.panel.panelId)!.bars.push({ bar: s.bar, rect });
        x += s.width;
      }
    }
  }
  // 手工叠放但未关联的图层不参与共用留白，不能让色标被其内容覆盖。
  for (const slot of occupied)
    for (const c of contexts) {
      if (root(c.panel.panelId) === slot.component) continue;
      const other = layerGeometry(c.panel.frame, page, c.reserved).layer,
        a = slot.rect;
      if (
        Math.min(a.x + a.width, other.x + other.width) >
          Math.max(a.x, other.x) + 1e-6 &&
        Math.min(a.y + a.height, other.y + other.height) >
          Math.max(a.y, other.y) + 1e-6
      )
        throw new Error(GROUP_COLORBAR_LAYOUT_ERROR);
    }
  return result;
}
