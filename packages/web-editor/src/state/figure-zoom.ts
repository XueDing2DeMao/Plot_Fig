import {
  axisScaleSpec,
  createNumericScale,
  validateFigureTemplate,
  validateFormulaPair,
  type Axis,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import {
  figureCoordinates,
  validateFixedAxisTicks,
} from '@plot-fig/svg-renderer';

export type ZoomCoordinates = ReturnType<typeof figureCoordinates>;
export type ZoomRequest = {
  panelId: string;
  axisId?: string;
  dimension: 'x' | 'y' | 'xy';
  /** 绘图区内的比例坐标，X 从左到右、Y 从下到上。 */
  x: number;
  y: number;
  factor?: number;
  selection?: { x: number; y: number };
};
type Range = { min: number; max: number };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function zoomAxisRange(
  axis: Axis,
  range: Range,
  anchor: number,
  factor: number,
  initial: Range = range,
): Range {
  if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(anchor))
    throw new Error('缩放参数必须是有限数，缩放因子必须为正数');
  const spec =
    axis.scale === 'category'
      ? { kind: 'linear' as const }
      : axisScaleSpec(axis);
  const scale = createNumericScale(spec, range.min, range.max, axis.reverse);
  const f = scale.capability.forward;
  const span = Math.abs(f(range.max) - f(range.min));
  const baseSpan = Math.abs(f(initial.max) - f(initial.min));
  if (!Number.isFinite(span) || !Number.isFinite(baseSpan) || baseSpan === 0)
    throw new Error('坐标跨度超出可缩放范围');
  const precision =
    Math.max(Math.abs(f(range.min)), Math.abs(f(range.max)), Number.MIN_VALUE) *
    Number.EPSILON *
    32;
  const minSpan = Math.min(
    span,
    Math.max(axis.scale === 'category' ? 1 : baseSpan / 1e6, precision),
  );
  const maxSpan = Math.max(
    span,
    minSpan,
    Math.min(Number.MAX_VALUE, baseSpan * 1e6),
  );
  factor = Math.max(minSpan / span, Math.min(maxSpan / span, factor));
  const a = clamp(anchor);
  const ends = [
    scale.invert(a * (1 - factor)),
    scale.invert(a + (1 - a) * factor),
  ];
  const result = { min: Math.min(...ends), max: Math.max(...ends) };
  createNumericScale(spec, result.min, result.max, axis.reverse);
  return result;
}

export function axisSnapshot(template: FigureTemplate) {
  return template.panels.flatMap((panel) =>
    panel.axes.map((axis) => ({
      panelId: panel.panelId,
      axisId: axis.axisId,
      range: structuredClone(axis.range),
      rescale: axis.rescale ? structuredClone(axis.rescale) : undefined,
    })),
  );
}
export type AxisSnapshot = ReturnType<typeof axisSnapshot>;
export function restoreAxisSnapshot(
  template: FigureTemplate,
  snapshot: AxisSnapshot,
) {
  const next = structuredClone(template);
  for (const entry of snapshot) {
    const axis = next.panels
      .find((p) => p.panelId === entry.panelId)
      ?.axes.find((a) => a.axisId === entry.axisId);
    if (!axis) continue;
    axis.range = structuredClone(entry.range);
    if (entry.rescale) axis.rescale = structuredClone(entry.rescale);
    else delete axis.rescale;
  }
  return next;
}

export function zoomFigure(
  template: FigureTemplate,
  coordinates: ZoomCoordinates,
  request: ZoomRequest,
  initial: ZoomCoordinates = coordinates,
): FigureTemplate {
  const next = structuredClone(template);
  const panel = next.panels.find((p) => p.panelId === request.panelId);
  if (!panel) throw new Error('缩放图层不存在');
  if (
    panel.axisLengthRatio &&
    (request.dimension !== 'xy' ||
      request.axisId ||
      (request.selection &&
        Math.abs(
          Math.abs(request.selection.x - request.x) -
            Math.abs(request.selection.y - request.y),
        ) > 1e-10))
  )
    throw new Error(
      '当前图层锁定 X:Y 数据比例，请用 Ctrl / ⌘ + 滚轮或放大、缩小按钮同步缩放；自由框选需先关闭数据比例',
    );
  const axes = new Map(
    next.panels.flatMap((p) =>
      p.axes.map((a) => [a.axisId, { axis: a, panelId: p.panelId }] as const),
    ),
  );
  const done = new Set<string>();
  let changed = false;
  for (const selected of panel.axes) {
    if (request.axisId && selected.axisId !== request.axisId) continue;
    if (request.dimension !== 'xy' && selected.dimension !== request.dimension)
      continue;
    let entry = axes.get(selected.axisId)!;
    let anchor = request[selected.dimension];
    let end = request.selection?.[selected.dimension];
    const visited = new Set<string>();
    const inverses: Array<(value: number) => number> = [];
    while (entry.axis.advanced?.link) {
      if (visited.has(entry.axis.axisId)) throw new Error('坐标轴链接存在循环');
      visited.add(entry.axis.axisId);
      inverses.push(
        validateFormulaPair(entry.axis.advanced.link.formula).inverse,
      );
      if (entry.axis.reverse) {
        anchor = 1 - anchor;
        if (end !== undefined) end = 1 - end;
      }
      const source = axes.get(entry.axis.advanced.link.axisId);
      if (!source) throw new Error('坐标轴链接源不存在');
      entry = source;
    }
    const group = next.sharedAxisGroups?.find((g) =>
      g.members.some((m) => m.axisId === entry.axis.axisId),
    );
    if (group) entry = axes.get(group.members[0]!.axisId)!;
    const { axis, panelId } = entry;
    if (done.has(axis.axisId)) continue;
    done.add(axis.axisId);
    const sourceRange = (view: ZoomCoordinates) => {
      const direct =
        view.panels.get(panelId)?.scales.get(axis.axisId) ??
        group?.members
          .map((member) =>
            view.panels.get(member.panelId)?.scales.get(member.axisId),
          )
          .find(Boolean);
      if (direct) return direct;
      // 隐藏的公式源轴仍参与可见轴的映射，可从已解析范围反变换得到源窗口。
      const linked = view.panels
        .get(request.panelId)
        ?.scales.get(selected.axisId);
      if (!linked || !inverses.length) return undefined;
      const ends = [linked.min, linked.max].map((value) =>
        inverses.reduce((current, inverse) => inverse(current), value),
      );
      return { min: Math.min(...ends), max: Math.max(...ends) };
    };
    const scale = sourceRange(coordinates);
    if (!scale) continue;
    if (axis.advanced?.breaks || axis.scale === 'discrete')
      throw new Error('断轴和离散数值轴请在坐标轴属性中调整范围');
    const baseline = sourceRange(initial) ?? scale;
    let factor = request.factor ?? 1;
    if (end !== undefined) {
      const low = Math.min(clamp(anchor), clamp(end));
      const high = Math.max(clamp(anchor), clamp(end));
      factor = high - low;
      if (factor <= 0 || factor >= 1) continue;
      anchor = low / (1 - factor);
    }
    const range = zoomAxisRange(axis, scale, anchor, factor, baseline);
    if (range.min === scale.min && range.max === scale.max) continue;
    const ids = group?.members.map((m) => m.axisId) ?? [axis.axisId];
    for (const id of ids) {
      const target = axes.get(id)!.axis;
      target.range = { mode: 'fixed', ...range };
      // 保留现有自动重缩放策略；手动缩放不触发数据变更。
    }
    changed = true;
  }
  if (!changed) return template;
  const validation = validateFigureTemplate(next);
  if (!validation.ok)
    throw new Error(validation.issues[0]?.message ?? '缩放范围无效');
  const ticks = validateFixedAxisTicks(next);
  if (ticks.length) throw new Error(ticks[0]!.message);
  return next;
}
