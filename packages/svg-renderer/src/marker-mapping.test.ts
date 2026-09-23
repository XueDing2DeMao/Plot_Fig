import { describe, expect, it } from 'vitest';
import type { DataColumn } from '@plot-fig/data-binding';
import { resolveMarkerMapping, type MarkerMapping } from './marker-mapping.js';
import { prepareSeriesRows } from './series-rows.js';
import { createScale } from './scales.js';
import type { AdvancedMarker } from './marker-appearance.js';
const base: AdvancedMarker = {
  visible: true,
  shape: 'circle',
  sizePt: 4,
  fill: '#333333',
  stroke: '#111111',
  strokeWidthPt: 1,
};
const col = (id: string, values: DataColumn['values']): DataColumn => ({
  columnId: id,
  name: id,
  index: 0,
  valueType: 'number',
  values,
  source: { tableId: 't', tableName: 'T', dataStartRow: 1 },
});
const rows = prepareSeriesRows(
  col('x', [1, 2, 3]),
  col('y', [2, 3, 4]),
).rawRows;
describe('F4.3B 数据映射准备', () => {
  it('连续映射拒绝整列分类类型，数值列内个别缺失仍可回退', () => {
    expect(() =>
      resolveMarkerMapping(
        base,
        rows,
        { size: { mode: 'area', minSize: 4, maxSize: 10, unit: 'pt' } },
        { size: { ...col('c', [1, 2, 3]), valueType: 'category' } },
      ),
    ).toThrow(/数值列/);
  });
  it('混入其他来源的原行与未知配置字段均拒绝', () => {
    expect(() =>
      resolveMarkerMapping(
        base,
        [rows[0]!, { ...rows[1]!, sourceTableId: 'other' }],
        {},
        {},
      ),
    ).toThrow(/同一/);
    expect(() =>
      resolveMarkerMapping(base, rows, { unknown: true } as MarkerMapping, {}),
    ).toThrow(/未知/);
  });
  it('同一序号的新表数据不能套用旧表单点覆盖', () => {
    const resolver = resolveMarkerMapping(
      base,
      rows,
      {},
      {},
      undefined,
      new Map([[rows[0]!.identity!, { fill: '#ff0000' }]]),
    );
    expect(() =>
      resolver.style({ ...rows[0]!, identity: 'foreign-row' }),
    ).toThrow(/其他数据行/);
  });
  it('合法的单点物理尺寸覆盖可以替代无效的对数数据尺寸', () => {
    const context = {
      xScale: createScale({ scale: 'log10' }, 0.1, 10)!,
      yScale: createScale({ scale: 'linear' }, 0, 10)!,
      rect: { x: 0, y: 0, width: 100, height: 100 },
    };
    const resolver = resolveMarkerMapping(
      base,
      rows,
      { size: { mode: 'diameter', minSize: 3, maxSize: 3, unit: 'x-data' } },
      { size: col('s', [1, 1, 1]) },
      context,
      new Map([[rows[0]!.identity!, { sizePt: 17 }]]),
    );
    expect(resolver.style(rows[0]!)).toMatchObject({
      visible: true,
      sizePt: 17,
    });
    expect(resolver.diagnostics.filter((d) => d.sourceIndex === 0)).toEqual([]);
  });
  it('颜色渐变和面积映射使用原行；抽样后颜色、大小不重新编号', () => {
    const mapping: MarkerMapping = {
      color: {
        mode: 'continuous',
        colors: ['#000000', '#ffffff'],
        target: 'fill',
      },
      size: { mode: 'area', minSize: 2, maxSize: 6, unit: 'pt' },
    };
    const resolver = resolveMarkerMapping(base, rows, mapping, {
      color: col('color', [0, 5, 10]),
      size: col('size', [0, 5, 10]),
    });
    expect(resolver.style(rows[0]!).fill).toBe('#000000');
    expect(resolver.style(rows[1]!).fill).toBe('#808080');
    expect(resolver.style(rows[2]!).fill).toBe('#ffffff');
    expect(resolver.style(rows[1]!).sizePt).toBeCloseTo(Math.sqrt(20));
    expect([rows[2]!, rows[0]!].map((r) => resolver.style(r).sizePt)).toEqual([
      6, 2,
    ]);
  });
  it('直径线性与面积线性有不同参考结果；常量列取输出中点', () => {
    const size = {
      mode: 'diameter' as const,
      minSize: 2,
      maxSize: 6,
      unit: 'pt' as const,
    };
    expect(
      resolveMarkerMapping(
        base,
        rows,
        { size },
        { size: col('s', [7, 7, 7]) },
      ).style(rows[1]!).sizePt,
    ).toBe(4);
    expect(
      resolveMarkerMapping(
        base,
        rows,
        { size: { ...size, mode: 'area' } },
        { size: col('s', [7, 7, 7]) },
      ).style(rows[1]!).sizePt,
    ).toBeCloseTo(Math.sqrt(20));
  });
  it('分类值按未排序的原行顺序分配；数值 1 和文本 1 不混淆', () => {
    const mapping: MarkerMapping = {
      color: {
        mode: 'categorical',
        colors: ['#ff0000', '#00ff00', '#0000ff'],
        target: 'both',
      },
      shape: { shapes: ['square', 'diamond', 'star'] },
    };
    const resolver = resolveMarkerMapping(base, rows, mapping, {
      color: col('c', [1, '1', 'b']),
      shape: col('s', ['b', 'a', 'b']),
    });
    expect(resolver.style(rows[1]!)).toMatchObject({
      fill: '#00ff00',
      stroke: '#00ff00',
      shape: 'diamond',
    });
    expect(resolver.style(rows[2]!).shape).toBe('square');
  });
  it('缺失映射值保留基础样式并按源行报告；不删除数据点', () => {
    const resolver = resolveMarkerMapping(
      base,
      rows,
      { size: { mode: 'diameter', minSize: 2, maxSize: 6, unit: 'pt' } },
      { size: col('s', [1, null, 3]) },
    );
    expect(resolver.style(rows[1]!)).toEqual(base);
    expect(resolver.diagnostics).toEqual([
      { sourceIndex: 1, property: 'size', message: expect.any(String) },
    ]);
  });
  it('单点覆盖高于映射，按身份恢复继承不改变数据行', () => {
    const mapping: MarkerMapping = {
      color: {
        mode: 'continuous',
        colors: ['#000000', '#ffffff'],
        target: 'fill',
      },
    };
    const overrides = new Map([
      [rows[1]!.identity!, { fill: '#123456', sizePt: 17 }],
    ]);
    const resolver = resolveMarkerMapping(
      base,
      rows,
      mapping,
      { color: col('c', [0, 5, 10]) },
      undefined,
      overrides,
    );
    expect(resolver.style(rows[1]!)).toMatchObject({
      fill: '#123456',
      sizePt: 17,
    });
    const inherited = resolveMarkerMapping(base, rows, mapping, {
      color: col('c', [0, 5, 10]),
    });
    expect(inherited.style(rows[1]!).fill).toBe('#808080');
    expect(rows).toHaveLength(3);
  });
  it('X/Y 数据单位按各自绑定轴转换，反向轴不产生负直径', () => {
    const context = {
      xScale: createScale({ scale: 'linear', reverse: true }, 0, 10)!,
      yScale: createScale({ scale: 'linear' }, 0, 20)!,
      rect: { x: 0, y: 0, width: 200, height: 100 },
    };
    const mapping: MarkerMapping = {
      size: { mode: 'diameter', minSize: 1, maxSize: 1, unit: 'x-data' },
    };
    expect(
      resolveMarkerMapping(
        base,
        rows,
        mapping,
        { size: col('s', [1, 1, 1]) },
        context,
      ).style(rows[0]!).sizePt,
    ).toBeCloseTo(20);
    mapping.size!.unit = 'y-data';
    expect(
      resolveMarkerMapping(
        base,
        rows,
        mapping,
        { size: col('s', [1, 1, 1]) },
        context,
      ).style(rows[0]!).sizePt,
    ).toBeCloseTo(5);
  });
  it('对数轴上跨越非正数的符号尺寸隐藏并诊断，数据点仍存在', () => {
    const context = {
      xScale: createScale({ scale: 'log10' }, 0.1, 10)!,
      yScale: createScale({ scale: 'linear' }, 0, 10)!,
      rect: { x: 0, y: 0, width: 100, height: 100 },
    };
    const r = resolveMarkerMapping(
      base,
      rows,
      { size: { mode: 'diameter', minSize: 3, maxSize: 3, unit: 'x-data' } },
      { size: col('s', [1, 1, 1]) },
      context,
    );
    expect(r.style(rows[0]!).visible).toBe(false);
    expect(r.diagnostics[0]!.sourceIndex).toBe(0);
  });
  it('错误列来源与非法配置不能静默回退', () => {
    const mapping: MarkerMapping = {
      color: {
        mode: 'continuous',
        colors: ['#000000', '#ffffff'],
        target: 'fill',
      },
    };
    expect(() => resolveMarkerMapping(base, rows, mapping, {})).toThrow(/颜色/);
    const foreign = col('foreign', [1, 2, 3]);
    foreign.source!.tableId = 'other-table';
    expect(() =>
      resolveMarkerMapping(base, rows, mapping, { color: foreign }),
    ).toThrow(/同一表格/);
    expect(() =>
      resolveMarkerMapping(
        base,
        rows,
        { size: { mode: 'area', minSize: 10, maxSize: 2, unit: 'pt' } },
        { size: col('s', [1, 2, 3]) },
      ),
    ).toThrow();
    expect(() =>
      resolveMarkerMapping(
        base,
        rows,
        {
          color: {
            mode: 'continuous',
            colors: ['red', 'blue'],
            target: 'fill',
          },
        },
        { color: col('c', [1, 2, 3]) },
      ),
    ).toThrow();
  });
});
