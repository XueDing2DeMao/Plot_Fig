import type { ColorScale, Panel } from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { PreparedPlot } from './charts/prepared.js';
import type { PlotScale } from './scales.js';
import { resolveGroupMapping } from './curve-groups.js';
import { renderResolvedColorbar } from './charts/color-scale.js';
import { escapeXml, formatNumber, type Rect } from './geometry.js';
import { layoutText } from './text/layout.js';
import { scaleCells } from './segmented-panel.js';
import { groupColorbarMarkerStyle } from './group-colorbar-markers.js';
import {
  clipDataPolyline,
  clipDataPolygon,
  containsDataPoint,
} from './data-clip.js';

export type GroupColorbar = {
  groupId: string;
  config: ColorScale;
  scale: ReturnType<typeof resolveGroupMapping>;
  plotIds: string[];
  width: number;
};

/** 与正式绘制使用同一准备结果，采样不影响色标范围或是否可用。 */
function hasDrawableData(
  item: PreparedPlot,
  scales: ReadonlyMap<string, PlotScale>,
  data: DataBindingSet,
) {
  const plot = item.plot;
  if (plot.kind !== 'xy' && plot.kind !== 'area') return false;
  const x = scales.get(plot.xAxisId),
    y = scales.get(plot.yAxisId);
  if (!x || !y) return false;
  const segments = item.curveGeometry?.lineSegments ?? item.segments;
  const line =
    plot.kind === 'area'
      ? plot.lineStyle.visible
      : plot.mode !== 'markers' && plot.lineStyle?.visible;
  const fills = (item.curveFills ?? [])
    .filter(
      (fill) =>
        fill.opacity > 0 &&
        fill.paint?.kind !== 'none' &&
        fill.color !== 'none',
    )
    .map((fill) => fill.points);
  if (
    plot.kind === 'area' &&
    !item.replaceAreaFill &&
    plot.fillStyle.opacity > 0 &&
    plot.fillStyle.paint?.kind !== 'none' &&
    plot.fillStyle.color !== 'none'
  ) {
    const baseline = plot.baseline + (item.curveGeometry?.offset?.y ?? 0);
    fills.push(
      ...item.segments
        .filter((s) => s.length >= 2)
        .map((s) => [
          { x: s[0]!.x, y: baseline },
          ...s,
          { x: s.at(-1)!.x, y: baseline },
        ]),
    );
  }
  const symbols = groupColorbarMarkerStyle(item, data, {
    rect: { x: 0, y: 0, width: 100, height: 100 },
    xScale: x,
    yScale: y,
  });
  if (!line && !symbols && !fills.length) return false;
  // 与正式断轴绘制共用保留区块与线段裁切；区外端点仍可能连接可见线段。
  return scaleCells({ x: 0, y: 0, width: 1, height: 1 }, x, y).some((cell) => {
    const clip = {
      xMin: cell.xScale.min,
      xMax: cell.xScale.max,
      yMin: cell.yScale.min,
      yMax: cell.yScale.max,
    };
    const finite = (p: { x: number; y: number }) =>
      Number.isFinite(cell.xScale.map(p.x)) &&
      Number.isFinite(cell.yScale.map(p.y));
    if (
      fills.some((points) => {
        const polygon = clipDataPolygon(points, clip);
        return polygon.length >= 3 && polygon.every(finite);
      })
    )
      return true;
    if (
      symbols &&
      item.xyRows?.segments.some((s) =>
        s.some((p) => {
          const style = symbols(p);
          return (
            style.visible &&
            style.sizePt > 0 &&
            containsDataPoint(p, clip) &&
            finite(p)
          );
        }),
      )
    )
      return true;
    if (!line) return false;
    return segments.some((segment) => {
      const connection = plot.kind === 'xy' ? plot.lineConnection : undefined;
      const expanded =
        connection === 'step-h' || connection === 'step-v'
          ? segment.flatMap((p, i) =>
              i
                ? [
                    {
                      x: connection === 'step-h' ? p.x : segment[i - 1]!.x,
                      y: connection === 'step-h' ? segment[i - 1]!.y : p.y,
                    },
                    p,
                  ]
                : [p],
            )
          : segment;
      return clipDataPolyline(expanded, clip).some(
        (s) => s.length >= 2 && s.every(finite),
      );
    });
  });
}

export function groupColorbars(
  panel: Panel,
  plots: PreparedPlot[],
  scales: ReadonlyMap<string, PlotScale>,
  fontFamily: string,
  data: DataBindingSet,
): GroupColorbar[] {
  if (panel.visible === false) return [];
  const enabled = (panel.groups ?? []).filter(
    (group) =>
      group.mode === 'dependent' && group.colorMapping?.colorbar?.visible,
  );
  if (!enabled.length) return [];
  const members = new Set(
    enabled.flatMap((group) => resolveGroupMapping(panel, group).activeMembers),
  );
  const drawable = new Set(
    plots
      .filter(
        (p) =>
          members.has(p.plot.plotSlotId) && hasDrawableData(p, scales, data),
      )
      .map((p) => p.plot.plotSlotId),
  );
  return (panel.groups ?? []).flatMap((group) => {
    const mapping = group.colorMapping;
    if (group.mode !== 'dependent' || !mapping?.colorbar?.visible) return [];
    const scale = resolveGroupMapping(panel, group);
    const plotIds = scale.activeMembers.filter(
      (id) => drawable.has(id) && scale.values.has(id),
    );
    if (
      !plotIds.length ||
      !Number.isFinite(scale.min) ||
      !Number.isFinite(scale.max)
    )
      return [];
    const title = (mapping.label ?? group.name).replace(/\s+/g, ' ');
    const scientific = [scale.min, scale.max].some(
      (v) => v !== 0 && (Math.abs(v) < 0.0001 || Math.abs(v) >= 1e6),
    );
    const config: ColorScale = {
      colors: mapping.colors,
      reverse: mapping.reverse ?? false,
      range: { mode: 'auto' },
      colorbar: {
        visible: true,
        title,
        majorTicks: 3,
        notation: scientific ? 'scientific' : 'auto',
        precision: 4,
      },
    };
    const values = [scale.min, scale.min / 2 + scale.max / 2, scale.max];
    const textWidth = (text: string) =>
      layoutText(
        text,
        { fontFamily, fontSizePt: 8, color: '#000000' },
        { format: 'plain' },
      ).bounds.width;
    const width = Math.max(
      60,
      textWidth(title) + 8,
      15 +
        Math.max(
          ...values.map((value) =>
            textWidth(
              scientific ? value.toExponential(4) : formatNumber(value),
            ),
          ),
        ) +
        8,
    );
    return [{ groupId: group.groupId, config, scale, plotIds, width }];
  });
}

export function renderGroupColorbar(
  panelId: string,
  bar: GroupColorbar,
  rect: Rect,
) {
  // 长度前缀避免跨层同名组及标识符连字符组合产生 ID 碰撞。
  const id = `group-color-${panelId.length}-${panelId}-${bar.groupId.length}-${bar.groupId}`;
  const svg = renderResolvedColorbar(bar.config, bar.scale, {
    rect,
    index: 0,
    id,
    barRect: rect,
    fractions: Array.from(
      { length: bar.config.colors.length },
      (_, i) => i / (bar.config.colors.length - 1),
    ),
  });
  return `<g data-role="group-colorbar" data-panel-id="${escapeXml(panelId)}" data-group-id="${escapeXml(bar.groupId)}" data-min="${bar.scale.min}" data-max="${bar.scale.max}">${svg}</g>`;
}
