import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { DataColumn } from '@plot-fig/data-binding';
import { sha256 } from './source-fingerprint.js';
import {
  captureMarkerSource,
  resolveMarkerOverrides,
  type MarkerOverrides,
} from './marker-overrides.js';
import { prepareSeriesRows } from './series-rows.js';

const col = (columnId: string, values: DataColumn['values']): DataColumn => ({
  columnId,
  name: columnId,
  index: 0,
  valueType: 'number',
  values,
  source: { tableId: 'table', tableName: 'Data', dataStartRow: 1 },
});
const columns = [
  col('x', [3, 1, 2]),
  col('y', [5, 2, 4]),
  col('color', [0, 5, 10]),
];
const source = () => captureMarkerSource(columns, columns[0]!, columns[1]!);
const rows = () =>
  prepareSeriesRows(columns[0]!, columns[1]!, {
    sort: 'x-ascending',
    sampling: { mode: 'every', step: 2 },
  });
const saved = (): MarkerOverrides => ({
  source: source(),
  points: [{ row: 1, style: { fill: '#ff0000', sizePt: 12 } }],
});
describe('单点覆盖的数据快照', () => {
  it('SHA-256 与独立实现一致，覆盖 UTF-8、多块和填充边界', () => {
    for (const text of [
      '',
      'abc',
      '中文🌟',
      ...[55, 56, 63, 64, 65, 127, 128, 100000].map((n) => 'a'.repeat(n)),
    ])
      expect(sha256(text)).toBe(
        createHash('sha256').update(text).digest('hex'),
      );
  });
  it('保存重开、排序与抽样保留原行身份，删除覆盖恢复继承', () => {
    const restored = JSON.parse(JSON.stringify(saved()));
    const result = resolveMarkerOverrides(restored, source(), rows().rawRows);
    expect(result.paused).toBe(false);
    expect(result.overrides.get(rows().rawRows[0]!.identity!)).toEqual({
      fill: '#ff0000',
      sizePt: 12,
    });
    expect(result.overrides.has(rows().selectedRows[0]!.identity!)).toBe(false);
    expect(
      resolveMarkerOverrides(
        { ...restored, points: [] },
        source(),
        rows().rawRows,
      ).overrides.size,
    ).toBe(0);
  });
  it('重命名和列排列不改变快照；其他列、行顺序或数据区变化暂停旧覆盖', () => {
    const renamed = columns
      .map((c) => ({
        ...c,
        name: 'new',
        source: { ...c.source!, tableName: 'new' },
      }))
      .reverse();
    expect(captureMarkerSource(renamed, renamed[2]!, renamed[1]!)).toEqual(
      source(),
    );
    const changed = structuredClone(columns);
    changed[2]!.values[0] = 99;
    const current = captureMarkerSource(changed, changed[0]!, changed[1]!);
    const result = resolveMarkerOverrides(saved(), current, rows().rawRows);
    expect(result.paused).toBe(true);
    expect(result.overrides.size).toBe(0);
    expect(result.message).toMatch(/数据.*变化/);
    expect(
      resolveMarkerOverrides(
        saved(),
        { ...source(), dataStartRow: 2 },
        rows().rawRows,
      ).paused,
    ).toBe(true);
    expect(
      resolveMarkerOverrides(
        saved(),
        { ...source(), xColumnId: 'other' },
        rows().rawRows,
      ).paused,
    ).toBe(true);
  });
  it('无来源、跨表 XY 和重复列身份不能创建覆盖', () => {
    expect(() =>
      captureMarkerSource(
        columns,
        { ...columns[0]!, source: undefined },
        columns[1]!,
      ),
    ).toThrow(/来源/);
    expect(() =>
      captureMarkerSource(columns, columns[0]!, {
        ...columns[1]!,
        source: { ...columns[1]!.source!, tableId: 'other' },
      }),
    ).toThrow(/同一/);
    expect(() =>
      captureMarkerSource([...columns, columns[0]!], columns[0]!, columns[1]!),
    ).toThrow(/重复/);
  });
  it('严格校验单点补丁，拒绝重复行、未知字段、空补丁和无效尺寸', () => {
    for (const points of [
      [{ row: 1, style: {} }],
      [{ row: 0, style: { fill: 'red' } }],
      [{ row: 1, style: { sizePt: -1 } }],
      [{ row: 1, style: { opacity: null } }],
      [{ row: 1, style: { rotationDeg: null } }],
      [{ row: 1, style: { unknown: true } }],
      [
        { row: 1, style: { fill: 'red' } },
        { row: 1, style: { fill: 'blue' } },
      ],
    ])
      expect(() =>
        resolveMarkerOverrides(
          { ...saved(), points } as MarkerOverrides,
          source(),
          rows().rawRows,
        ),
      ).toThrow();
    expect(() =>
      resolveMarkerOverrides(
        { ...saved(), points: [{ row: 1, style: { shape: 'custom' } }] },
        source(),
        rows().rawRows,
      ),
    ).toThrow(/顶点/);
  });
  it('有限值与缺失值不同；空数据和源列内容不一致不能创建快照', () => {
    const changed = structuredClone(columns);
    changed[0]!.values[0] = null;
    const nullDigest = captureMarkerSource(
      changed,
      changed[0]!,
      changed[1]!,
    ).fingerprint;
    changed[0]!.values[0] = NaN;
    expect(
      captureMarkerSource(changed, changed[0]!, changed[1]!).fingerprint,
    ).not.toBe(nullDigest);
    expect(() =>
      captureMarkerSource(
        columns,
        { ...columns[0]!, values: [99] },
        columns[1]!,
      ),
    ).toThrow(/来源/);
  });
});
