import {
  defaultShapeStyle,
  plotBindingEntries,
  type Axis,
  type Panel,
  type AxisAdvanced,
} from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { PreparedPlot } from './charts/prepared.js';
import type { PlotScale } from './scales.js';
import { axisSourceColumn } from './axis-advanced-labels.js';
import { annotationSegment } from './annotation-style.js';
import { layoutAxis, axisPointAt } from './axis-layout.js';
import { cellClip, scaleCells } from './segmented-panel.js';
import { escapeXml as esc, formatNumber as n, type Rect } from './geometry.js';
type Reference = NonNullable<AxisAdvanced['references']>['items'][number];
type Sample = { value: number; x?: number; y?: number; sourceIndex: number };
function samples(
  item: PreparedPlot,
  axis: Axis,
  data: DataBindingSet,
  source: 'raw' | 'display',
): Sample[] {
  if (item.xyRows) {
    const rows =
      source === 'raw'
        ? (item.curveGeometry?.sourceRows ?? item.xyRows).rawRows
        : item.xyRows.displaySegments.flat();
    return rows.map((row, i) => ({
      value: row[axis.dimension],
      x: row.x,
      y: row.y,
      sourceIndex: 'sourceIndex' in row ? Number(row.sourceIndex) : i,
    }));
  }
  if (source === 'display' && item.segments.length)
    return item.segments.flat().map((p, i) => ({
      value: p[axis.dimension],
      x: p.x,
      y: p.y,
      sourceIndex: i,
    }));
  const bindings = plotBindingEntries(item.plot),
    entry =
      bindings.find((b) => b.role === axis.dimension) ??
      bindings.find((b) => b.role === 'value' || b.role === 'values');
  return (
    (entry ? axisSourceColumn(data, entry.slotId)?.values : [])?.flatMap(
      (value, sourceIndex) =>
        typeof value === 'number' && Number.isFinite(value)
          ? [{ value, sourceIndex }]
          : [],
    ) ?? []
  );
}
function inScale(value: number, scale: PlotScale | undefined) {
  return (
    !!scale &&
    value >= scale.min &&
    value <= scale.max &&
    Number.isFinite(scale.map(value))
  );
}
function statistic(values: number[], ref: Reference): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b),
    q = ref.statistic === 'median' ? 0.5 : (ref.quantile ?? 0.5);
  if (ref.statistic === 'min') return sorted[0];
  if (ref.statistic === 'max') return sorted.at(-1);
  if (ref.statistic === 'quantile' || ref.statistic === 'median') {
    const i = (sorted.length - 1) * q,
      lo = Math.floor(i);
    return sorted[lo]! + (sorted[Math.ceil(i)]! - sorted[lo]!) * (i - lo);
  }
  let mean = 0,
    m2 = 0,
    count = 0;
  for (const value of values) {
    count++;
    const delta = value - mean;
    mean += delta / count;
    m2 += delta * (value - mean);
  }
  return ref.statistic === 'sd'
    ? count > 1
      ? Math.sqrt(m2 / (count - 1))
      : 0
    : mean;
}
export function renderAxisDecorations(
  axis: Axis,
  panel: Panel,
  rect: Rect,
  scale: PlotScale,
  scales: Map<string, PlotScale>,
  plots: PreparedPlot[],
  data: DataBindingSet,
): { behind: string; ahead: string } {
  const config = axis.advanced;
  if (!config?.references && !config?.rug) return { behind: '', ahead: '' };
  const relevant = plots.filter(
    (p) =>
      (axis.dimension === 'x' ? p.plot.xAxisId : p.plot.yAxisId) ===
      axis.axisId,
  );
  const opposite = panel.axes.find((a) => a.dimension !== axis.dimension),
    otherId = relevant[0]
      ? axis.dimension === 'x'
        ? relevant[0].plot.yAxisId
        : relevant[0].plot.xAxisId
      : opposite?.axisId,
    other = otherId ? scales.get(otherId) : undefined;
  const clipId = `axis-reference-clip-${axis.axisId}`,
    rects = other
      ? scaleCells(
          rect,
          axis.dimension === 'x' ? scale : other,
          axis.dimension === 'y' ? scale : other,
        ).map((c) => c.rect)
      : [rect];
  let behind = '',
    ahead = '';
  if (config.references) {
    const entries = config.references.items
      .flatMap((ref) => {
        let values: number[];
        if (ref.kind === 'constant') values = [ref.value!];
        else if (ref.kind === 'column')
          values = (
            axisSourceColumn(data, ref.dataSlotId)?.values ?? []
          ).filter(
            (v): v is number => typeof v === 'number' && Number.isFinite(v),
          );
        else {
          const selected = ref.plotSlotId
            ? relevant.filter((p) => p.plot.plotSlotId === ref.plotSlotId)
            : relevant;
          const rows = ref.dataSlotId
            ? (axisSourceColumn(data, ref.dataSlotId)?.values ?? []).flatMap(
                (v, i) =>
                  typeof v === 'number' && Number.isFinite(v)
                    ? [{ value: v, sourceIndex: i }]
                    : [],
              )
            : selected.flatMap((item) =>
                samples(item, axis, data, 'raw').filter(
                  (row) =>
                    ref.domain !== 'visible' ||
                    (inScale(row.value, scale) &&
                      (row.x === undefined ||
                        inScale(row.x, scales.get(item.plot.xAxisId))) &&
                      (row.y === undefined ||
                        inScale(row.y, scales.get(item.plot.yAxisId)))),
                ),
              );
          const value = statistic(
            rows
              .filter(
                (row) => ref.domain !== 'visible' || inScale(row.value, scale),
              )
              .map((row) => row.value),
            ref,
          );
          values = value === undefined ? [] : [value];
        }
        if (values.length > 10000) throw new Error('参考线位置最多10000个');
        return values.map((value) => ({ ref, value, ratio: scale.map(value) }));
      })
      .filter((e) => Number.isFinite(e.value) && Number.isFinite(e.ratio));
    const fill = config.references.fill;
    if (fill) {
      const positions = entries
        .map((e) => e.ratio)
        .filter((r) => r >= 0 && r <= 1)
        .sort((a, b) => a - b);
      if (fill.mode === 'alternating')
        (positions.unshift(0), positions.push(1));
      for (let i = 0; i + 1 < positions.length; i += 2) {
        const a = positions[i]!,
          b = positions[i + 1]!;
        behind += `<rect data-role="axis-reference-fill" x="${n(rect.x + (axis.dimension === 'x' ? a * rect.width : 0))}" y="${n(rect.y + (axis.dimension === 'y' ? (1 - b) * rect.height : 0))}" width="${n(axis.dimension === 'x' ? (b - a) * rect.width : rect.width)}" height="${n(axis.dimension === 'y' ? (b - a) * rect.height : rect.height)}" fill="${esc(fill.color)}" opacity="${n(fill.opacity)}"/>`;
      }
    }
    for (const { ref, value, ratio } of entries) {
      const vertical = axis.dimension === 'x',
        pos = vertical
          ? rect.x + ratio * rect.width
          : rect.y + (1 - ratio) * rect.height,
        style = defaultShapeStyle();
      style.line = {
        ...style.line,
        color: ref.color ?? axis.line.color,
        widthPt: ref.widthPt ?? 1,
        dash:
          ref.dash === 'solid'
            ? 'solid'
            : ref.dash === 'dot'
              ? 'dotted'
              : 'dashed',
      };
      let svg = annotationSegment(
        'reference-line',
        {
          start: vertical ? { x: pos, y: rect.y } : { x: rect.x, y: pos },
          end: vertical
            ? { x: pos, y: rect.y + rect.height }
            : { x: rect.x + rect.width, y: pos },
        },
        style,
      );
      const label = [
        ref.label,
        ref.showValue ? String(Number(value.toPrecision(8))) : '',
      ]
        .filter(Boolean)
        .join(' ');
      if (label) {
        const at = ref.labelPosition ?? 0.95;
        svg += `<text data-role="axis-reference-label" x="${n(vertical ? pos + (ratio > 0.5 ? -3 : 3) : rect.x + at * rect.width)}" y="${n(vertical ? rect.y + (1 - at) * rect.height : pos - 3)}" text-anchor="${(vertical ? ratio : at) > 0.5 ? 'end' : 'start'}" fill="${esc(style.line.color)}" font-size="${n(axis.tickLabels.fontSizePt)}" font-family="${esc(axis.tickLabels.fontFamily)}">${esc(label)}</text>`;
      }
      behind += `<g data-reference-id="${esc(ref.id)}" data-value="${n(value)}">${svg}</g>`;
    }
    behind =
      cellClip(clipId, rects) +
      `<g data-role="axis-references" clip-path="url(#${esc(clipId)})">${behind}</g>`;
  }
  if (config.rug && axis.visible) {
    const rug = config.rug,
      layout = layoutAxis(
        axis,
        rect,
        { ...(axis.placement ? { placement: axis.placement } : {}) },
        { axes: panel.axes, scales },
      ),
      selected = relevant.filter(
        (p) =>
          !rug.plotSlotIds.length ||
          rug.plotSlotIds.includes(p.plot.plotSlotId),
      );
    let count = 0;
    for (const [group, item] of selected.entries())
      for (const row of samples(item, axis, data, rug.source)) {
        if (!inScale(row.value, scale)) continue;
        if (++count > 100000) throw new Error('Rug 标记最多100000个');
        const p = axisPointAt(layout, scale.map(row.value)),
          length = rug.lengthPt ?? 5,
          direction = layout.outward * (rug.side === 'inside' ? -1 : 1),
          offset =
            (rug.offsetPt ?? 0) +
            (rug.arrangement === 'stack' ? group * (length + 2) : 0),
          a = offset * direction,
          b = (offset + length) * direction;
        const color = rug.followStyle
          ? 'lineStyle' in item.plot
            ? item.plot.lineStyle.color
            : 'fillStyle' in item.plot
              ? item.plot.fillStyle.color
              : axis.line.color
          : (rug.color ?? axis.line.color);
        ahead += `<line data-role="axis-rug" data-plot-id="${esc(item.plot.plotSlotId)}" data-source-index="${row.sourceIndex}" x1="${n(p.x + (layout.horizontal ? 0 : a))}" y1="${n(p.y + (layout.horizontal ? a : 0))}" x2="${n(p.x + (layout.horizontal ? 0 : b))}" y2="${n(p.y + (layout.horizontal ? b : 0))}" stroke="${esc(color)}" stroke-width="${n(rug.widthPt ?? 1)}"/>`;
      }
  }
  return { behind, ahead };
}
