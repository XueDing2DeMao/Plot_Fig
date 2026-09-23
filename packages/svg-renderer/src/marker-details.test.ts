import { describe, expect, it } from 'vitest';
import type { DataColumn } from '@plot-fig/data-binding';
import { prepareSeriesRows } from './series-rows.js';
import { createScale } from './scales.js';
import {
  renderAdvancedMarker,
  type AdvancedMarker,
} from './marker-appearance.js';
import { validateMarkerDetails } from './marker-detail-settings.js';
import {
  resolveMarkerDetails,
  renderMarkerDetailLegend,
} from './marker-details.js';
import { lineSymbolGapRadius } from './xy-line-extras.js';
import { advancedMarkerRadius } from './marker-appearance.js';

const base: AdvancedMarker = {
  visible: true,
  shape: 'circle',
  sizePt: 10,
  fill: '#336699',
  stroke: '#112233',
  strokeWidthPt: 1,
  opacity: 0.3,
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
  col('x', [1, 2, 2, 2, 4]),
  col('y', [2, 3, 3, 3, 5]),
).rawRows;
const context = {
  rect: { x: 0, y: 0, width: 100, height: 200 },
  xScale: createScale({ scale: 'linear' }, 0, 10)!,
  yScale: createScale({ scale: 'linear' }, 0, 10)!,
};
const resolve = (
  details: Parameters<typeof resolveMarkerDetails>[3],
  extra: Parameters<typeof resolveMarkerDetails>[4] = {},
) => resolveMarkerDetails(base, rows, context, details, extra);

describe('F4.3C 符号细节准备', () => {
  it('图例最大尺寸和百分比边框不会挤压相邻符号及文字', () => {
    const resolved = resolve({
      strokeRadiusPct: 100,
      legend: { rows: [1, 3, 5], sizePt: 36 },
    });
    const svg = renderMarkerDetailLegend(resolved.legend, { x: 0, y: 0 });
    const circles = [
      ...svg.matchAll(/<circle\b[^>]*cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/g),
    ];
    const radius = advancedMarkerRadius(resolved.legend[0]!.style);
    expect(Number(circles[1]![2]) - Number(circles[0]![2])).toBeGreaterThan(
      2 * radius,
    );
    expect(Number(svg.match(/<text x="([^"]+)"/)![1])).toBeGreaterThan(
      Number(circles[0]![1]) + radius,
    );
  });
  it('字符方框周围的连线间隙使用字符包络，而非基础圆形', () => {
    const style = resolve({
      character: {
        mode: 'constant',
        text: 'A',
        fontFamily: 'Arial',
        outline: 'box',
      },
    }).style(rows[0]!);
    expect(
      lineSymbolGapRadius(
        { visible: true, color: '#000000', widthPt: 0, dash: 'solid' },
        style,
        1,
      ),
    ).toBeGreaterThan(advancedMarkerRadius(style));
  });
  it.each(['\ufffe', '\uffff'])('拒绝 XML 禁用字符 %s', (char) => {
    for (const character of [
      { mode: 'constant', text: char, fontFamily: 'Arial', outline: 'none' },
      {
        mode: 'sequence',
        alphabet: 'A' + char,
        fontFamily: 'Arial',
        outline: 'none',
      },
      { mode: 'row-number', fontFamily: 'A' + char, outline: 'none' },
    ])
      expect(() => validateMarkerDetails({ character })).toThrow();
  });
  it.each([
    null,
    [],
    { unknown: true },
    { fixedSize: null },
    { fillOnlyOpacity: 1 },
    { strokeRadiusPct: -1 },
    { strokeRadiusPct: NaN },
    {
      character: {
        mode: 'constant',
        text: 'AB',
        fontFamily: 'Arial',
        outline: 'none',
      },
    },
    {
      character: {
        mode: 'row-number',
        fontFamily: 'Arial',
        outline: 'none',
        text: 'X',
      },
    },
    { legend: { rows: [1, 1], sizePt: 10 } },
    { overlap: { direction: 'random', gapPt: 1, center: true } },
  ])('拒绝非法候选设置 %j', (value) =>
    expect(() => validateMarkerDetails(value)).toThrow(),
  );
  it('接受单个补充平面字符，拒绝控制字符、未知字段与非整数图例行', () => {
    expect(() =>
      validateMarkerDetails({
        character: {
          mode: 'constant',
          text: '😀',
          fontFamily: 'Arial',
          outline: 'box',
        },
      }),
    ).not.toThrow();
    for (const value of [
      {
        character: {
          mode: 'constant',
          text: '\u0000',
          fontFamily: 'Arial',
          outline: 'none',
        },
      },
      { fixedSize: { value: 1, unit: 'x-data', extra: 1 } },
      { legend: { rows: [1.1], sizePt: 10 } },
    ])
      expect(() => validateMarkerDetails(value)).toThrow();
  });
  it('固定数据尺寸沿绑定轴换算，反向轴尺寸仍为正', () => {
    expect(
      resolve({ fixedSize: { value: 2, unit: 'x-data' } }).style(rows[0]!)
        .sizePt,
    ).toBeCloseTo(20);
    const flipped = {
      ...context,
      yScale: createScale({ scale: 'linear', reverse: true }, 0, 10)!,
    };
    expect(
      resolveMarkerDetails(base, rows, flipped, {
        fixedSize: { value: 2, unit: 'y-data' },
      }).style(rows[0]!).sizePt,
    ).toBeCloseTo(40);
  });
  it('大小映射优先于固定数据尺寸，缺失映射回退固定尺寸，单点尺寸优先', () => {
    const result = resolve(
      { fixedSize: { value: 2, unit: 'x-data' } },
      {
        mapping: {
          size: { mode: 'diameter', minSize: 4, maxSize: 8, unit: 'pt' },
        },
        columns: { size: col('size', [0, null, 1, 0, 1]) },
        overrides: new Map([[rows[2]!.identity!, { sizePt: 13 }]]),
      },
    );
    expect(rows.slice(0, 3).map((r) => result.style(r).sizePt)).toEqual([
      4, 20, 13,
    ]);
  });
  it('对数跨度无效时隐藏；单点物理尺寸可恢复；零尺寸不显示', () => {
    const log = {
      ...context,
      xScale: createScale({ scale: 'log10' }, 0.1, 10)!,
    };
    const result = resolveMarkerDetails(
      base,
      rows,
      log,
      { fixedSize: { value: 3, unit: 'x-data' } },
      { overrides: new Map([[rows[0]!.identity!, { sizePt: 9 }]]) },
    );
    expect(result.style(rows[0]!).visible).toBe(true);
    const invalid = resolveMarkerDetails(base, rows, log, {
      fixedSize: { value: 3, unit: 'x-data' },
    });
    expect(invalid.style(rows[0]!).visible).toBe(false);
    expect(invalid.diagnostics.length).toBeGreaterThan(0);
  });
  it('边框按半径百分比换算；0 使用最小可见尺寸的相同宽度，单点边框优先', () => {
    const opts = {
      overrides: new Map([
        [rows[0]!.identity!, { sizePt: 4 }],
        [rows[1]!.identity!, { strokeWidthPt: 3 }],
      ]),
    };
    expect(
      resolve({ strokeRadiusPct: 20 }, opts).style(rows[0]!).strokeWidthPt,
    ).toBeCloseTo(0.4);
    const equal = resolve({ strokeRadiusPct: 0 }, opts);
    expect(equal.style(rows[0]!).strokeWidthPt).toBeCloseTo(0.4);
    expect(equal.style(rows[4]!).strokeWidthPt).toBeCloseTo(0.4);
    expect(equal.style(rows[1]!).strokeWidthPt).toBe(3);
  });
  it('仅填充透明度不降低边框；跟随线条时使用整体透明度', () => {
    const s = resolve({ fillOnlyOpacity: true }).style(rows[0]!);
    expect(renderAdvancedMarker({ x: 10, y: 10 }, s)).toContain(
      'fill-opacity="0.3"',
    );
    expect(renderAdvancedMarker({ x: 10, y: 10 }, s)).not.toContain(
      ' opacity=',
    );
    expect(
      renderAdvancedMarker(
        { x: 10, y: 10 },
        { ...s, followLineOpacity: true },
        0.7,
      ),
    ).toContain(' opacity="0.7"');
    expect(
      renderAdvancedMarker(
        { x: 10, y: 10 },
        { ...s, followLineOpacity: true },
        0.7,
      ),
    ).not.toContain('fill-opacity=');
  });
  it('字符按原始行序号构造且转义，单点形状覆盖恢复几何符号', () => {
    const result = resolve(
      {
        character: {
          mode: 'sequence',
          alphabet: 'A😀<',
          fontFamily: 'Arial',
          outline: 'circle',
        },
      },
      { overrides: new Map([[rows[0]!.identity!, { shape: 'square' }]]) },
    );
    expect(result.style(rows[0]!).characterGlyph).toBeUndefined();
    expect(result.style(rows[1]!).characterGlyph?.text).toBe('😀');
    const svg = renderAdvancedMarker({ x: 10, y: 10 }, result.style(rows[2]!));
    expect(svg).toContain('&lt;');
    expect(svg).toContain('data-role="character-outline"');
    expect(
      resolve({
        character: { mode: 'row-number', fontFamily: 'Arial', outline: 'none' },
      }).style(rows[4]!).characterGlyph?.text,
    ).toBe('5');
  });
  it('重复点仅改变符号位置，完整原行决定展开距离且与传入顺序无关', () => {
    const details = {
      overlap: { direction: 'horizontal' as const, gapPt: 2, center: true },
    };
    const result = resolve(details);
    expect(result.position(rows[2]!)).toEqual({ x: 20, y: 140 });
    expect(result.position(rows[1]!).x).toBeCloseTo(7);
    expect(result.position(rows[3]!).x).toBeCloseTo(33);
    expect(result.centers([rows[1]!])).toEqual([{ x: 20, y: 140 }]);
    const reversed = resolveMarkerDetails(
      base,
      [...rows].reverse(),
      context,
      details,
    );
    expect(reversed.position(rows[1]!)).toEqual(result.position(rows[1]!));
    expect(() => result.position({ ...rows[0]!, identity: 'other' })).toThrow(
      /其他/,
    );
  });
  it('图例选原始行样式、采用物理尺寸并给出映射值；不存在的原行不静默替换', () => {
    const result = resolve(
      {
        fixedSize: { value: 2, unit: 'x-data' },
        legend: { rows: [1, 5], sizePt: 8 },
      },
      {
        mapping: {
          color: {
            mode: 'continuous',
            target: 'fill',
            colors: ['#000000', '#ffffff'],
          },
        },
        columns: { color: col('signal', [0, 1, 2, 3, 4]) },
      },
    );
    const svg = renderMarkerDetailLegend(result.legend, { x: 0, y: 10 });
    expect(svg).toContain('r="4"');
    expect(svg).toContain('#ffffff');
    expect(svg).toContain('signal=4');
    expect(() => resolve({ legend: { rows: [8], sizePt: 8 } })).toThrow(
      /原始第 8 行/,
    );
  });
});
