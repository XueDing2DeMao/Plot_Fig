import { describe, expect, it } from 'vitest';
import type { DataColumn } from '@plot-fig/data-binding';
import { prepareSeriesRows, type SeriesRowOptions } from './series-rows.js';
const col = (
  id: string,
  values: DataColumn['values'],
  start = 1,
): DataColumn => ({
  columnId: id,
  name: id,
  index: 0,
  valueType: 'number',
  values,
  source: { tableId: 'table-1', tableName: 'Data', dataStartRow: start },
});
const indices = (segments: { sourceIndex: number }[][]) =>
  segments.map((s) => s.map((p) => p.sourceIndex));

describe('F4.1 原行与绘制样本准备', () => {
  it('强制首尾端点后仍均匀覆盖曲线，不偏向开头', () => {
    const values = Array.from({ length: 10 }, (_, i) => i);
    const x = col('x', values),
      y = col('y', values);
    expect(
      indices(
        prepareSeriesRows(x, y, {
          sampling: {
            mode: 'count',
            count: 3,
            keepFirst: true,
            keepLast: true,
          },
        }).displaySegments,
      ),
    ).toEqual([[0, 5, 9]]);
    expect(
      indices(
        prepareSeriesRows(x, y, {
          sampling: { mode: 'count', count: 2, keepFirst: true },
        }).displaySegments,
      ),
    ).toEqual([[0, 9]]);
  });
  it('已知来源冲突必须拒绝，不能降级为没有身份的输入', () => {
    const x = col('x', [1, 2]),
      y = col('y', [2, 3]);
    y.source!.tableId = 'other';
    expect(() => prepareSeriesRows(x, y)).toThrow(/同一/);
    y.source!.tableId = x.source!.tableId;
    y.source!.dataStartRow = 2;
    expect(() => prepareSeriesRows(x, y)).toThrow(/同一/);
  });
  it('默认保留原始顺序和重复 X，跳过无效点但连接两侧', () => {
    const r = prepareSeriesRows(
      col('x', [3, 1, null, 1, 2]),
      col('y', [30, 10, 99, 12, 20]),
    );
    expect(indices(r.segments)).toEqual([[0, 1, 3, 4]]);
    expect(r.invalidCount).toBe(1);
    expect(indices(r.displaySegments)).toEqual([[0, 1, 3, 4]]);
  });
  it('缺失和尺度域无效值形成独立段；排序不跨过缺口', () => {
    const r = prepareSeriesRows(
      col('x', [3, 1, 2, 5, 4, 0, 8]),
      col('y', [3, 1, null, 5, 4, 0, 8]),
      { missing: 'break', sort: 'x-ascending' },
      (p) => p.x > 0 && p.y > 0,
    );
    expect(indices(r.segments)).toEqual([[1, 0], [4, 3], [6]]);
    expect(r.rawRows.map((p) => p.sourceIndex)).toEqual([0, 1, 3, 4, 5, 6]);
    expect(r.invalidCount).toBe(2);
  });
  it('行范围包含两端，重复值首/末行基于原输入行而不是绘制序号', () => {
    const x = col('x', [4, 1, 2, 1, 0]),
      y = col('y', [40, 10, 20, 11, 0]);
    expect(
      indices(
        prepareSeriesRows(x, y, {
          rowRange: { from: 2, to: 4 },
          sort: 'x-descending',
          duplicates: 'last',
        }).segments,
      ),
    ).toEqual([[2, 3]]);
    expect(
      indices(
        prepareSeriesRows(x, y, {
          rowRange: { from: 2, to: 4 },
          sort: 'x-ascending',
          duplicates: 'first',
        }).segments,
      ),
    ).toEqual([[1, 2]]);
    expect(x.values).toEqual([4, 1, 2, 1, 0]);
  });
  it('抽样不更改统计输入、所选样本或默认导出点', () => {
    const x = col('x', [0, 1, 2, 3, 4, 5]),
      y = col('y', [0, 1, 100, 3, 4, 5]);
    const r = prepareSeriesRows(x, y, {
      sampling: { mode: 'every', step: 3, keepLast: true },
    });
    expect(indices(r.displaySegments)).toEqual([[0, 3, 5]]);
    expect(r.rawRows).toHaveLength(6);
    expect(r.selectedRows).toHaveLength(6);
    expect(indices(r.exportSegments)).toEqual([[0, 1, 2, 3, 4, 5]]);
    expect(
      indices(
        prepareSeriesRows(x, y, {
          sampling: { mode: 'every', step: 3, keepLast: true },
          sampleExport: true,
        }).exportSegments,
      ),
    ).toEqual([[0, 3, 5]]);
  });
  it('按数量全曲线上限、等距取点、分段端点例外不会被静默丢弃', () => {
    const x = col('x', [0, 1, 2, 3, 4, 5, 6]),
      y = col('y', [0, 1, 2, null, 4, 5, 6]);
    const options: SeriesRowOptions = {
      missing: 'break',
      sampling: { mode: 'count', count: 4, keepFirst: true, keepLast: true },
    };
    expect(indices(prepareSeriesRows(x, y, options).displaySegments)).toEqual([
      [0, 2],
      [4, 6],
    ]);
    expect(() =>
      prepareSeriesRows(x, y, {
        ...options,
        sampling: { mode: 'count', count: 3, keepFirst: true, keepLast: true },
      }),
    ).toThrow(/端点/);
  });
  it('排序和抽样后，标签及非对称误差仍按 sourceIndex 对应', () => {
    const labels = ['A', 'B', 'C', 'D'],
      lower = [1, 2, 3, 4],
      upper = [11, 12, 13, 14];
    const r = prepareSeriesRows(
      col('x', [3, 1, 2, 1]),
      col('y', [30, 10, 20, 12]),
      {
        sort: 'x-ascending',
        duplicates: 'last',
        sampling: { mode: 'count', count: 2, keepLast: true },
      },
    );
    const rows = r.displaySegments
      .flat()
      .map((p) => [
        labels[p.sourceIndex],
        lower[p.sourceIndex],
        upper[p.sourceIndex],
      ]);
    expect(rows).toEqual([
      ['D', 4, 14],
      ['A', 1, 11],
    ]);
  });
  it('身份由表/列/源行决定：重排不变，换表或换列不误用旧点', () => {
    const x = col('x', [3, 1, 2]),
      y = col('y', [30, 10, 20]);
    const original = prepareSeriesRows(x, y).rawRows;
    const sorted = prepareSeriesRows(x, y, {
      sort: 'x-ascending',
    }).selectedRows;
    expect(sorted[0]!.identity).toEqual(original[1]!.identity);
    expect(original[1]!.sourceRow).toBe(3);
    const changed = prepareSeriesRows({ ...x, columnId: 'x2' }, y).rawRows;
    expect(changed[1]!.identity).not.toEqual(original[1]!.identity);
    const noSource = { ...x };
    delete noSource.source;
    expect(prepareSeriesRows(noSource, y).rawRows[0]!.identity).toBeUndefined();
  });
  it.each([
    { rowRange: { from: 0, to: 2 } },
    { rowRange: { from: 3, to: 2 } },
    { sampling: { mode: 'every', step: 0 } },
    { sampling: { mode: 'count', count: 1.2 } },
    { sort: 'random' },
    { missing: 'unknown' },
  ])('拒绝非法设置 %j', (options) => {
    expect(() =>
      prepareSeriesRows(
        col('x', [1]),
        col('y', [1]),
        options as SeriesRowOptions,
      ),
    ).toThrow();
  });
  it('空区间、单点和尾部长度不齐有确定结果', () => {
    expect(prepareSeriesRows(col('x', [1]), col('y', [])).segments).toEqual([]);
    expect(
      prepareSeriesRows(col('x', [1]), col('y', [2]), {
        rowRange: { from: 3, to: 9 },
      }).segments,
    ).toEqual([]);
    expect(
      indices(
        prepareSeriesRows(col('x', [1, 2]), col('y', [2]), {
          sampling: {
            mode: 'count',
            count: 1,
            keepFirst: true,
            keepLast: true,
          },
        }).displaySegments,
      ),
    ).toEqual([[0]]);
  });
});
