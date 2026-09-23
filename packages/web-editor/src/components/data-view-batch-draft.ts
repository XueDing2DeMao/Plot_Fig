import type { XyDataView } from '@plot-fig/figure-schema';
export type DataViewKind = 'row-range' | 'series-sampling';
export type DataViewDraft = Record<string, string>;
export function dataViewBatchDraft(
  kind: DataViewKind,
  value: unknown,
): DataViewDraft {
  if (kind === 'row-range') {
    const v = value as XyDataView['rowRange'];
    return {
      mode: v ? 'range' : 'none',
      from: String(v?.from ?? 1),
      to: String(v?.to ?? 100000),
    };
  }
  const v = value as XyDataView['sampling'];
  return {
    mode: v?.mode ?? 'none',
    amount: String(
      v?.mode === 'every' ? v.step : v?.mode === 'count' ? v.count : 2,
    ),
    keepFirst: String(v?.keepFirst ?? false),
    keepLast: String(v?.keepLast ?? false),
  };
}
export function parseDataViewBatchDraft(
  kind: DataViewKind,
  text: string,
): unknown {
  const d: DataViewDraft = JSON.parse(text);
  if (d.mode === 'none') return undefined;
  const integer = (value: string | undefined) => {
    const n = value && /^\+?\d+$/.test(value.trim()) ? Number(value) : NaN;
    if (!Number.isInteger(n) || n < 1 || n > 100000)
      throw new Error('数据行号和抽样点数须为 1–100000 的整数');
    return n;
  };
  if (kind === 'row-range') return { from: integer(d.from), to: integer(d.to) };
  return {
    mode: d.mode,
    ...(d.mode === 'every'
      ? { step: integer(d.amount) }
      : { count: integer(d.amount) }),
    ...(d.keepFirst === 'true' ? { keepFirst: true } : {}),
    ...(d.keepLast === 'true' ? { keepLast: true } : {}),
  };
}
