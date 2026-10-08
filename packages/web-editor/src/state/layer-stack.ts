import type { DataBindingSet } from '@plot-fig/data-binding';
import type {
  CurveOffset,
  CurveTransform,
  Panel,
  PlotSlot,
} from '@plot-fig/figure-schema';
import { materializeCurveOffsets } from '@plot-fig/svg-renderer';

// 仅用于属性窗口的事务草稿，保存时仍写入各曲线已有的 transform 字段。
export type LayerCurveOffsets = Record<
  string,
  Pick<CurveTransform, 'offsetX' | 'offsetY'>
>;
export type LayerOffsetSettings = {
  mode: 'none' | 'constant' | 'auto' | 'individual';
  x: boolean;
  y: boolean;
  value: number;
  gap: number;
};
export function offsetCurves(panel: Panel) {
  return panel.plotSlots.filter(
    (p): p is Extract<PlotSlot, { kind: 'xy' | 'area' }> =>
      p.kind === 'xy' || p.kind === 'area',
  );
}
export function readLayerCurveOffsets(panel: Panel): LayerCurveOffsets {
  return Object.fromEntries(
    offsetCurves(panel).map((p) => [
      p.plotSlotId,
      {
        ...(p.transform?.offsetX
          ? { offsetX: structuredClone(p.transform.offsetX) }
          : {}),
        ...(p.transform?.offsetY
          ? { offsetY: structuredClone(p.transform.offsetY) }
          : {}),
      },
    ]),
  );
}
export function applyLayerCurveOffsets(
  panel: Panel,
  offsets: LayerCurveOffsets,
): Panel {
  return {
    ...panel,
    plotSlots: panel.plotSlots.map((p) => {
      if (p.kind !== 'xy' && p.kind !== 'area') return p;
      const next = { ...p },
        transform = { ...p.transform };
      delete transform.offsetX;
      delete transform.offsetY;
      Object.assign(transform, structuredClone(offsets[p.plotSlotId] ?? {}));
      if (Object.keys(transform).length) next.transform = transform;
      else delete next.transform;
      return next;
    }),
  };
}
export function layerOffsetSettings(panel: Panel): LayerOffsetSettings {
  const plots = offsetCurves(panel),
    first = plots[0]?.transform;
  const x = plots.some((p) => p.transform?.offsetX),
    y = plots.some((p) => p.transform?.offsetY);
  const defaults = { x: !!x, y: !!y || !x, value: 1, gap: 8 };
  if (!x && !y) return { ...defaults, mode: 'none' };
  const same = (a: CurveOffset | undefined, b: CurveOffset | undefined) => {
    if (!a || !b) return a === b;
    if (
      (a.scope ?? 'panel') !== 'panel' ||
      (b.scope ?? 'panel') !== 'panel' ||
      a.mode !== b.mode
    )
      return false;
    return a.mode === 'increment' && b.mode === 'increment'
      ? Object.is(a.value, b.value)
      : a.mode === 'auto' && b.mode === 'auto' && Object.is(a.gap, b.gap);
  };
  const uniform = plots.every(
    (p) =>
      same(p.transform?.offsetX, first?.offsetX) &&
      same(p.transform?.offsetY, first?.offsetY),
  );
  const setting = first?.offsetY ?? first?.offsetX;
  if (uniform && (!x || !y || same(first?.offsetX, first?.offsetY))) {
    if (setting?.mode === 'increment')
      return { ...defaults, mode: 'constant', value: setting.value };
    if (setting?.mode === 'auto')
      return { ...defaults, mode: 'auto', gap: setting.gap * 100 };
  }
  return { ...defaults, mode: 'individual' };
}
export function setLayerOffsets(
  panel: Panel,
  settings: LayerOffsetSettings,
  data?: DataBindingSet,
): Panel {
  const offsets: LayerCurveOffsets = {};
  for (const p of offsetCurves(panel)) {
    if (settings.mode === 'individual') {
      const transform = materializeCurveOffsets(panel, p.plotSlotId, data);
      // 0 值表示可单独编辑的原位曲线，区别于未启用偏移。
      offsets[p.plotSlotId] = {
        offsetX: transform?.offsetX ?? { mode: 'constant', value: 0 },
        offsetY: transform?.offsetY ?? { mode: 'constant', value: 0 },
      };
    } else if (settings.mode !== 'none') {
      const offset: CurveOffset =
        settings.mode === 'auto'
          ? { mode: 'auto', gap: settings.gap / 100 }
          : { mode: 'increment', value: settings.value };
      offsets[p.plotSlotId] = {
        ...(settings.x ? { offsetX: offset } : {}),
        ...(settings.y ? { offsetY: offset } : {}),
      };
    }
  }
  const next = applyLayerCurveOffsets(panel, offsets);
  delete next.stack;
  return next;
}
