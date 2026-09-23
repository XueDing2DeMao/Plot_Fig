import type { ChartContext } from './charts/chart-point.js';
import type { SeriesRow } from './series-rows.js';
import {
  advancedMarkerRadius,
  renderAdvancedMarker,
  validateMarkerAppearance,
  type AdvancedMarker,
} from './marker-appearance.js';
import { resolveMarkerMapping } from './marker-mapping.js';
import {
  validateMarkerDetails,
  type MarkerDetails,
} from './marker-detail-settings.js';
import { escapeXml as esc, formatNumber as n } from './geometry.js';
type Point = { x: number; y: number };
export type MarkerLegendSample = {
  row?: number;
  style: AdvancedMarker;
  label?: string;
  lineColor?: string;
};
export type MarkerLegendSamples = Map<string, MarkerLegendSample[]>;
type Options = {
  mapping?: Parameters<typeof resolveMarkerMapping>[2];
  columns?: Parameters<typeof resolveMarkerMapping>[3];
  overrides?: Parameters<typeof resolveMarkerMapping>[5];
  baseForRow?: Parameters<typeof resolveMarkerMapping>[6];
  referenceRows?: readonly SeriesRow[];
};
export function resolveMarkerDetails(
  base: AdvancedMarker,
  rows: readonly SeriesRow[],
  context: ChartContext,
  details: MarkerDetails,
  options: Options = {},
) {
  validateMarkerDetails(details);
  const mapped = resolveMarkerMapping(
    base,
    rows,
    options.mapping ?? {},
    options.columns ?? {},
    context,
    options.overrides,
    options.baseForRow,
    options.referenceRows ?? rows,
  );
  const diagnostics: {
    sourceIndex: number;
    property: string;
    message: string;
  }[] = [...mapped.diagnostics];
  const styles = new Map<number, AdvancedMarker>(),
    positions = new Map<number, Point>();
  const groupFor = new Map<number, string>(),
    groups = new Map<string, SeriesRow[]>();
  const alphabet =
    details.character?.mode === 'sequence'
      ? Array.from(details.character.alphabet)
      : [];
  const actual = (r: SeriesRow): Point => ({
    x: context.rect.x + context.xScale.map(r.x) * context.rect.width,
    y: context.rect.y + (1 - context.yScale.map(r.y)) * context.rect.height,
  });
  let smallest = Infinity;
  for (const row of rows) {
    const style = mapped.style(row),
      override = row.identity
        ? options.overrides?.get(row.identity)
        : undefined;
    const sizeValue = options.columns?.size?.values[row.sourceIndex];
    const hasMappedSize =
      !!options.mapping?.size &&
      typeof sizeValue === 'number' &&
      Number.isFinite(sizeValue);
    if (details.fixedSize && !hasMappedSize && override?.sizePt === undefined) {
      const x = details.fixedSize.unit === 'x-data',
        scale = x ? context.xScale : context.yScale,
        center = x ? row.x : row.y,
        radius = details.fixedSize.value / 2;
      const diameter =
        Math.abs(scale.map(center + radius) - scale.map(center - radius)) *
        (x ? context.rect.width : context.rect.height);
      if (!Number.isFinite(diameter) || diameter > 1_000_000) {
        style.visible = false;
        diagnostics.push({
          sourceIndex: row.sourceIndex,
          property: 'fixedSize',
          message: '固定数据尺寸超出坐标轴定义域或可绘制范围，跳过此符号',
        });
      } else style.sizePt = diameter;
    }
    if (details.fillOnlyOpacity !== undefined)
      style.fillOnlyOpacity = details.fillOnlyOpacity;
    if (details.character && override?.shape === undefined) {
      const c = details.character;
      style.characterGlyph = {
        text:
          c.mode === 'constant'
            ? c.text
            : c.mode === 'sequence'
              ? alphabet[row.sourceIndex % alphabet.length]!
              : String(row.sourceIndex + 1),
        fontFamily: c.fontFamily,
        outline: c.outline,
      };
    }
    if (style.sizePt === 0) style.visible = false;
    const point = actual(row);
    if (
      style.visible &&
      style.sizePt > 0 &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    )
      smallest = Math.min(smallest, style.sizePt / 2);
    styles.set(row.sourceIndex, style);
    positions.set(row.sourceIndex, point);
  }
  const commonStroke =
    Number.isFinite(smallest) && base.sizePt > 0
      ? (smallest * base.strokeWidthPt) / (base.sizePt / 2)
      : base.strokeWidthPt;
  for (const row of [...rows].sort((a, b) => a.sourceIndex - b.sourceIndex)) {
    const style = styles.get(row.sourceIndex)!,
      override = row.identity
        ? options.overrides?.get(row.identity)
        : undefined;
    if (
      details.strokeRadiusPct !== undefined &&
      override?.strokeWidthPt === undefined
    )
      style.strokeWidthPt =
        details.strokeRadiusPct === 0
          ? commonStroke
          : ((style.sizePt / 2) * details.strokeRadiusPct) / 100;
    validateMarkerAppearance(style);
    const point = positions.get(row.sourceIndex)!;
    if (
      !details.overlap ||
      !style.visible ||
      style.sizePt === 0 ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    )
      continue;
    const key = JSON.stringify([row.x, row.y]);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
    groupFor.set(row.sourceIndex, key);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const radius = group.reduce(
      (max, row) =>
        Math.max(max, advancedMarkerRadius(styles.get(row.sourceIndex)!)),
      0,
    );
    const step = 2 * radius + details.overlap!.gapPt;
    group.forEach((row, i) => {
      const offset = (i - (group.length - 1) / 2) * step;
      if (!Number.isFinite(offset) || Math.abs(offset) > 1_000_000)
        throw new Error('重复点展开超过可绘制范围，请减小尺寸或间距');
      const point = positions.get(row.sourceIndex)!;
      if (details.overlap!.direction === 'horizontal') point.x += offset;
      else point.y += offset;
    });
  }
  const assertRow = (row: SeriesRow) => {
    mapped.style(row);
  };
  const legend = (details.legend?.rows ?? []).map((index) => {
    const row = rows.find((r) => r.sourceIndex === index - 1);
    if (!row) throw new Error(`图例指定的原始第 ${index} 行不存在或 XY 无效`);
    const style = structuredClone(styles.get(row.sourceIndex)!);
    const ratio = style.sizePt > 0 ? details.legend!.sizePt / style.sizePt : 1;
    style.strokeWidthPt *= ratio;
    style.sizePt = details.legend!.sizePt;
    // 保留原行可见性；图例行仍有标签，帮助识别隐藏样本。
    const values = Object.entries(options.columns ?? {})
      .filter(
        ([role]) =>
          options.mapping?.[role as keyof NonNullable<Options['mapping']>],
      )
      .map(([, c]) =>
        c ? `${c.name}=${String(c.values[row.sourceIndex] ?? '缺失')}` : '',
      )
      .filter(Boolean);
    return {
      row: index,
      style,
      label: `原始第 ${index} 行${values.length ? ' · ' + values.join('，') : ''}`,
    };
  });
  return {
    diagnostics,
    legend,
    style(row: SeriesRow) {
      assertRow(row);
      return structuredClone(styles.get(row.sourceIndex)!);
    },
    position(row: SeriesRow) {
      assertRow(row);
      return { ...positions.get(row.sourceIndex)! };
    },
    centers(selected: readonly SeriesRow[]) {
      if (!details.overlap?.center) return [];
      const keys = new Set<string>();
      const result: Point[] = [];
      for (const row of selected) {
        assertRow(row);
        const key = groupFor.get(row.sourceIndex);
        if (
          key === undefined ||
          keys.has(key) ||
          (groups.get(key)?.length ?? 0) < 2
        )
          continue;
        keys.add(key);
        result.push(actual(row));
      }
      return result;
    },
  };
}
export function markerDetailLegendLayout(
  entries: ReturnType<typeof resolveMarkerDetails>['legend'],
) {
  const radius = entries.reduce(
    (max, entry) => Math.max(max, advancedMarkerRadius(entry.style)),
    0,
  );
  const rowHeight = Math.max(22, 2 * radius + 8),
    symbolX = radius + 4,
    textX = 2 * radius + 12;
  const textWidth = entries.reduce(
    (max, entry) => Math.max(max, Array.from(entry.label).length * 9),
    0,
  );
  return {
    rowHeight,
    symbolX,
    textX,
    width: textX + textWidth,
    height: entries.length * rowHeight,
  };
}
export function renderMarkerDetailLegend(
  entries: ReturnType<typeof resolveMarkerDetails>['legend'],
  origin: Point,
  lineOpacity?: number,
) {
  const layout = markerDetailLegendLayout(entries);
  return `<g data-role="marker-detail-legend">${entries
    .map((entry, i) => {
      const y = origin.y + (i + 0.5) * layout.rowHeight;
      return `<g data-source-row="${entry.row}">${renderAdvancedMarker({ x: origin.x + layout.symbolX, y }, entry.style, lineOpacity)}<text x="${n(origin.x + layout.textX)}" y="${n(y + 3)}" font-family="Arial, sans-serif" font-size="9" fill="#30343b">${esc(entry.label)}</text></g>`;
    })
    .join('')}</g>`;
}
