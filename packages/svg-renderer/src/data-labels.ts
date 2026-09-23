import {
  validateDataLabels,
  validateLabelOverrides,
  type DataLabels,
  type LabelOverrides,
  type PlotSlot,
  type MarkerStyle,
} from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { ChartContext } from './charts/chart-point.js';
import { prepareSeriesRows, type SeriesRow } from './series-rows.js';
import type { RenderDiagnostic } from './types.js';
import { point } from './charts/chart-point.js';
import { escapeXml } from './geometry.js';
import { captureMarkerSource } from './marker-overrides.js';
import { errorRange } from './error-values.js';

export type LabelPlot = Extract<PlotSlot, { kind: 'xy' | 'bar' | 'area' }> & {
  dataLabels?: DataLabels;
  labelOverrides?: LabelOverrides;
};
type Point = { x: number; y: number };
type Box = Point & { width: number; height: number };
export type DataLabelRenderOptions = {
  plot: LabelPlot;
  data: DataBindingSet;
  context: ChartContext;
  rows: readonly SeriesRow[];
  markerForRow?: (row: SeriesRow) => MarkerStyle;
  rawRowForRow?: (row: SeriesRow) => SeriesRow;
  pointForRow?: (row: SeriesRow) => Point;
  anchorForRow?: (
    row: SeriesRow,
    anchor: NonNullable<DataLabels['anchor']>,
  ) => Point | undefined;
  lineColorForRow?: (row: SeriesRow) => string;
  errorBounds?: (
    prefix: 'x' | 'y',
    index: number,
    base: number,
  ) => [number, number] | undefined;
};
function labelBoundColumns(plot: LabelPlot, data: DataBindingSet) {
  const column = (id: string) => {
    const binding = data.bindings.find(
      (b) => b.dataSlotId === id && b.status === 'valid',
    );
    const found = data.columns.find((c) => c.columnId === binding?.columnId);
    if (!found) throw new Error(`标签数据槽 ${id} 尚未绑定可用数据`);
    return found;
  };
  return plot.kind === 'bar'
    ? { x: column(plot.bindings.category), y: column(plot.bindings.value) }
    : { x: column(plot.bindings.x), y: column(plot.bindings.y) };
}
export function labelSourceForPlot(plot: LabelPlot, data: DataBindingSet) {
  const { x, y } = labelBoundColumns(plot, data);
  return x.source && y.source
    ? captureMarkerSource(data.columns, x, y)
    : undefined;
}
export function prepareDataLabelRows(
  plot: LabelPlot,
  data: DataBindingSet,
): SeriesRow[] {
  const { x, y } = labelBoundColumns(plot, data);
  // 类别坐标只用于默认位置；标签内容仍从真实类别列读取。
  return prepareSeriesRows(
    plot.kind === 'bar' ? { ...x, values: x.values.map((_, i) => i) } : x,
    y,
  ).rawRows;
}
const MAX_LABELS = 2000;
function formatNumber(value: number, format: DataLabels['format']) {
  if (format?.mode === 'fixed') return value.toFixed(format.precision);
  if (format?.mode === 'scientific')
    return value.toExponential(format.precision);
  return String(Number(value.toPrecision(12)));
}
function sampleRows(
  rows: readonly SeriesRow[],
  sampling: DataLabels['sampling'],
) {
  const ordered = [...rows].sort((a, b) => a.sourceIndex - b.sourceIndex);
  if (sampling?.mode === 'rows') {
    const wanted = new Set(sampling.rows),
      present = new Set(ordered.map((r) => r.sourceIndex + 1));
    if ([...wanted].some((r) => !present.has(r)))
      throw new Error('标签指定原行不存在于当前数据范围');
    return ordered.filter((r) => wanted.has(r.sourceIndex + 1));
  }
  if (sampling?.mode === 'every')
    return ordered.filter((r) => r.sourceIndex % sampling.step === 0);
  if (sampling?.mode === 'count' && ordered.length > sampling.count)
    return Array.from(
      { length: sampling.count },
      (_, i) =>
        ordered[
          sampling.count === 1
            ? 0
            : Math.round((i * (ordered.length - 1)) / (sampling.count - 1))
        ]!,
    );
  return ordered;
}
function textLines(text: string, wrap: number) {
  return text.split(/\r?\n/).flatMap((line) => {
    if (!wrap) return [line];
    const chars = Array.from(line),
      parts: string[] = [];
    for (let i = 0; i < chars.length; i += wrap)
      parts.push(chars.slice(i, i + wrap).join(''));
    return parts.length ? parts : [''];
  });
}
function intersects(a: Box, b: Box) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
function rotatedBox(
  center: Point,
  width: number,
  height: number,
  angle: number,
): Box {
  const a = (angle * Math.PI) / 180,
    w = Math.abs(width * Math.cos(a)) + Math.abs(height * Math.sin(a)),
    h = Math.abs(width * Math.sin(a)) + Math.abs(height * Math.cos(a));
  return { x: center.x - w / 2, y: center.y - h / 2, width: w, height: h };
}
export function renderDataLabels(options: DataLabelRenderOptions): {
  svg: string;
  diagnostics: RenderDiagnostic[];
  placed: number;
  hidden: number;
} {
  const { plot, data, context } = options,
    config = plot.dataLabels;
  if (!config) return { svg: '', diagnostics: [], placed: 0, hidden: 0 };
  validateDataLabels(config);
  if (!config.visible)
    return { svg: '', diagnostics: [], placed: 0, hidden: 0 };
  const diagnostics: RenderDiagnostic[] = [],
    warn = (message: string) =>
      diagnostics.push({
        code: 'RENDER_DATA_INVALID',
        severity: 'warning',
        sourcePath: `plotSlots.${plot.plotSlotId}.dataLabels`,
        message,
      });
  const rows = sampleRows(options.rows, config.sampling);
  if (rows.length > MAX_LABELS)
    throw new Error('标签超过 2000 个上限，请设置标签抽样');
  if (
    new Set(options.rows.map((r) => r.sourceIndex)).size !== options.rows.length
  )
    throw new Error('标签原行身份重复');
  const needsColumn =
    config.source === 'column' ||
    (config.source === 'custom' && config.template?.includes('{label}'));
  const labelBinding = data.bindings.find(
    (b) => b.dataSlotId === plot.bindings.label && b.status === 'valid',
  );
  const labelColumn = data.columns.find(
    (c) => c.columnId === labelBinding?.columnId,
  );
  if (needsColumn && !labelColumn) throw new Error('标签列尚未绑定可用数据');
  if (needsColumn && labelColumn?.source) {
    const { x } = labelBoundColumns(plot, data);
    if (
      x.source &&
      (labelColumn.source.tableId !== x.source.tableId ||
        labelColumn.source.dataStartRow !== x.source.dataStartRow)
    )
      throw new Error('标签列须来自同一表格数据区');
  }
  const patches = new Map<number, LabelOverrides['points'][number]>();
  if (plot.labelOverrides) {
    validateLabelOverrides(plot.labelOverrides);
    const { x, y } = labelBoundColumns(plot, data);
    const current =
      x.source && y.source
        ? captureMarkerSource(data.columns, x, y)
        : undefined;
    if (
      !current ||
      Object.keys(current).some(
        (k) =>
          current[k as keyof typeof current] !==
          plot.labelOverrides!.source[k as keyof typeof current],
      )
    )
      warn(
        '源数据或绑定列已变化，旧标签单点覆盖已暂停；请清除后重新选择原行。',
      );
    else {
      for (const r of options.rows) {
        const physical = current.dataStartRow + r.sourceIndex + 1;
        const identity = JSON.stringify([
          current.tableId,
          current.xColumnId,
          current.yColumnId,
          physical,
          physical,
        ]);
        if (
          r.identity !== identity ||
          r.sourceTableId !== current.tableId ||
          r.sourceRow !== physical
        )
          throw new Error('标签覆盖不能用于其他数据来源');
      }
      for (const p of plot.labelOverrides.points) patches.set(p.row, p);
    }
  }
  const font = config.font ?? {
    family: 'Arial',
    sizePt: 10,
    bold: false,
    italic: false,
  };
  const boxes: Box[] = [],
    out: string[] = [];
  let hidden = 0,
    missingAnchors = 0;
  const categoryColumn =
    plot.kind === 'bar' ? labelBoundColumns(plot, data).x : undefined;
  for (const row of rows) {
    const rawRow = options.rawRowForRow?.(row) ?? row;
    if (rawRow.sourceIndex !== row.sourceIndex)
      throw new Error('标签原始数据与展示数据行号不一致');
    const patch = patches.get(row.sourceIndex + 1);
    if (patch?.visible === false) {
      hidden++;
      continue;
    }
    const labelValue = labelColumn?.values[row.sourceIndex];
    const values = {
      x: categoryColumn
        ? typeof categoryColumn.values[row.sourceIndex] === 'number'
          ? formatNumber(
              categoryColumn.values[row.sourceIndex] as number,
              config.format,
            )
          : String(categoryColumn.values[row.sourceIndex] ?? '')
        : formatNumber(rawRow.x, config.format),
      y: formatNumber(rawRow.y, config.format),
      row: String(row.sourceIndex + 1),
      label:
        typeof labelValue === 'number' && Number.isFinite(labelValue)
          ? formatNumber(labelValue, config.format)
          : String(labelValue ?? ''),
    };
    const raw =
      patch?.text ??
      (config.source === 'custom'
        ? config.template!.replace(
            /\{(x|y|label|row)\}/g,
            (_, key: keyof typeof values) => values[key],
          )
        : config.source === 'xy'
          ? `${values.x}, ${values.y}`
          : config.source === 'column'
            ? values.label
            : values[config.source]);
    const text =
      (config.format?.prefix ?? '') + raw + (config.format?.suffix ?? '');
    if (
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\uD800-\uDFFF\uFFFE\uFFFF]/u.test(
        text,
      )
    )
      throw new Error('数据标签含不支持的控制字符');
    if (Array.from(text).length > 4096)
      throw new Error('单个数据标签超过 4096 字符上限');
    if (!text) {
      hidden++;
      continue;
    }
    const lines = textLines(text, config.wrapChars ?? 0);
    const widths = lines.map((l) =>
      Array.from(l).reduce(
        (w, c) => w + (c.charCodeAt(0) > 255 ? 1 : 0.62) * font.sizePt,
        0,
      ),
    );
    const padding = config.box?.visible ? config.box.paddingPt : 0,
      lineHeight = font.sizePt * (config.lineSpacing ?? 1.2);
    const width = Math.max(...widths, font.sizePt * 0.5) + padding * 2,
      height = font.sizePt + (lines.length - 1) * lineHeight + padding * 2;
    let anchor: Point;
    const mode = config.anchor ?? 'point';
    if (options.anchorForRow && mode !== 'point') {
      const anchored = options.anchorForRow(row, mode);
      if (!anchored) {
        hidden++;
        missingAnchors++;
        continue;
      }
      anchor = anchored;
    } else if (mode === 'point')
      anchor = options.pointForRow?.(row) ?? point(context, row.x, row.y);
    else if (mode === 'baseline')
      anchor = point(
        context,
        row.x,
        config.baseline ?? (plot.kind === 'area' ? plot.baseline : 0),
      );
    else {
      const prefix = mode.startsWith('x-') ? 'x' : 'y',
        base = prefix === 'x' ? row.x : row.y;
      const bounds = options.errorBounds
        ? options.errorBounds(prefix, row.sourceIndex, base)
        : errorRange(plot, data, { prefix, index: row.sourceIndex, base });
      if (!bounds) {
        hidden++;
        missingAnchors++;
        continue;
      }
      const v = bounds[mode.endsWith('lower') ? 0 : 1];
      anchor = point(
        context,
        prefix === 'x' ? v : row.x,
        prefix === 'y' ? v : row.y,
      );
    }
    if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y))
      throw new Error('标签锚点坐标无效');
    const marker =
      options.markerForRow?.(row) ??
      (plot.kind === 'xy' ? plot.markerStyle : undefined);
    const radius =
      mode === 'point' &&
      plot.kind === 'xy' &&
      plot.mode !== 'line' &&
      marker?.visible
        ? marker.sizePt / 2 + marker.strokeWidthPt / 2
        : 0;
    const gap = (config.gapPt ?? 3) + radius,
      position = config.position ?? 'above';
    const offset = patch?.offset ?? config.offset,
      multiplier = offset?.unit === 'font-percent' ? font.sizePt / 100 : 1;
    const center = {
      x:
        anchor.x +
        (position === 'left'
          ? -gap - width / 2
          : position === 'right'
            ? gap + width / 2
            : 0) +
        (offset?.x ?? 0) * multiplier,
      y:
        anchor.y +
        (position === 'above'
          ? -gap - height / 2
          : position === 'below'
            ? gap + height / 2
            : 0) +
        (offset?.y ?? 0) * multiplier,
    };
    const angle = config.rotationDeg ?? 0;
    let box = rotatedBox(center, width, height, angle);
    const keepInside = () => {
      const { rect } = context;
      center.x = Math.max(
        rect.x + box.width / 2,
        Math.min(center.x, rect.x + rect.width - box.width / 2),
      );
      center.y = Math.max(
        rect.y + box.height / 2,
        Math.min(center.y, rect.y + rect.height - box.height / 2),
      );
    };
    if (config.collision === 'move') {
      if (box.width > context.rect.width || box.height > context.rect.height) {
        hidden++;
        continue;
      }
      keepInside();
      box = rotatedBox(center, width, height, angle);
    }
    const collides = (b: Box) =>
      boxes.some((existing) => intersects(existing, b));
    if (config.collision && config.collision !== 'none' && collides(box)) {
      if (config.collision === 'hide') {
        hidden++;
        continue;
      }
      let found = false;
      const start = { ...center };
      // 每个标签最多尝试 24 个候选，处理成本及位移均有上界。
      for (let ring = 1; ring <= 3 && !found; ring++)
        for (const [dx, dy] of [
          [0, -1],
          [1, -1],
          [1, 0],
          [1, 1],
          [0, 1],
          [-1, 1],
          [-1, 0],
          [-1, -1],
        ]) {
          center.x = start.x + dx! * ring * (box.width + 3);
          center.y = start.y + dy! * ring * (box.height + 3);
          keepInside();
          const candidate = rotatedBox(center, width, height, angle);
          if (!collides(candidate)) {
            box = candidate;
            found = true;
            break;
          }
        }
      if (!found) {
        hidden++;
        continue;
      }
    }
    boxes.push(box);
    let color =
      config.color?.mode === 'fixed'
        ? config.color.value
        : config.color?.mode === 'line'
          ? (options.lineColorForRow?.(row) ??
            (plot.kind === 'bar'
              ? plot.fillStyle.borderColor
              : plot.lineStyle?.color) ??
            '#000000')
          : config.color?.mode === 'marker'
            ? marker?.fill && marker.fill !== 'none'
              ? marker.fill
              : (marker?.stroke ??
                (plot.kind === 'xy' ? '#000000' : plot.fillStyle.color))
            : '#000000';
    color = escapeXml(color);
    let svg = '';
    if (config.leader?.visible) {
      const end = {
        x: Math.max(box.x, Math.min(anchor.x, box.x + box.width)),
        y: Math.max(box.y, Math.min(anchor.y, box.y + box.height)),
      };
      if (end.x !== anchor.x || end.y !== anchor.y)
        svg += `<path data-role="label-leader" d="M ${anchor.x} ${anchor.y} L ${end.x} ${end.y}" fill="none" stroke="${config.leader.color}" stroke-width="${config.leader.widthPt}"/>`;
    }
    svg += `<g data-role="data-label" data-source-row="${row.sourceIndex + 1}" transform="translate(${center.x} ${center.y}) rotate(${angle})">`;
    if (config.box?.visible)
      svg += `<rect data-role="label-box" x="${-width / 2}" y="${-height / 2}" width="${width}" height="${height}" fill="${config.box.fill}" stroke="${config.box.stroke}" stroke-width="${config.box.widthPt}"/>`;
    svg += `<text text-anchor="middle" fill="${color}" font-family="${escapeXml(font.family)}" font-size="${font.sizePt}" font-weight="${font.bold ? 'bold' : 'normal'}" font-style="${font.italic ? 'italic' : 'normal'}">${lines.map((line, i) => `<tspan x="0" y="${(-(lines.length - 1) * lineHeight) / 2 + font.sizePt * 0.35 + i * lineHeight}">${escapeXml(line)}</tspan>`).join('')}</text></g>`;
    out.push(svg);
  }
  if (missingAnchors)
    warn(`${missingAnchors} 个标签缺少有效误差端点，已隐藏。`);
  return {
    svg: out.length
      ? `<g data-role="data-labels" data-plot-slot-id="${escapeXml(plot.plotSlotId)}">${out.join('')}</g>`
      : '',
    diagnostics,
    placed: out.length,
    hidden,
  };
}
