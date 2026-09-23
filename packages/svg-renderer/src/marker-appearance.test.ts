import { describe, expect, it } from 'vitest';
import { renderMarker } from './plot-style.js';
import {
  renderAdvancedMarker,
  advancedMarkerRadius,
  validateMarkerAppearance,
  createMarkerRenderer,
  type AdvancedMarker,
} from './marker-appearance.js';

const marker: AdvancedMarker = {
  visible: true,
  shape: 'square',
  sizePt: 10,
  fill: '#ee6655',
  stroke: '#112233',
  strokeWidthPt: 1,
};
const point = { x: 100, y: 80 };

describe('F4.3A 符号几何准备', () => {
  it('曲线绘制复用独立样式快照，仍拒绝非法几何和逐点溢出', () => {
    const style: AdvancedMarker = {
      ...marker,
      shape: 'custom',
      customVertices: [
        [0, -1],
        [1, 1],
        [-1, 1],
      ],
      rotationDeg: 22.5,
      opacity: 0.5,
    };
    const original = structuredClone(style),
      render = createMarkerRenderer(style);
    style.customVertices![0]![0] = NaN;
    style.rotationDeg = 90;
    for (const p of [point, { x: 0, y: 0 }, { x: -0.5, y: 1.5 }])
      expect(render(p)).toBe(renderAdvancedMarker(p, original));
    expect(() => createMarkerRenderer(style)).toThrow();
    expect(() => render({ x: Infinity, y: 0 })).toThrow();
  });
  it.each([
    'circle',
    'square',
    'triangle',
    'diamond',
    'plus',
    'cross',
  ] as const)('旧 %s 符号逐字保持输出', (shape) => {
    expect(renderAdvancedMarker(point, { ...marker, shape })).toBe(
      renderMarker(point, { ...marker, shape }),
    );
  });
  it.each([
    'triangle-down',
    'triangle-left',
    'triangle-right',
    'star',
    'pentagon',
    'hexagon',
    'octagon',
    'h-line',
    'v-line',
  ] as const)('内置 %s 产生有限可导出的几何', (shape) => {
    const svg = renderAdvancedMarker(point, { ...marker, shape });
    expect(svg).toContain('data-role="marker"');
    expect(svg).not.toMatch(/NaN|Infinity|undefined/);
    expect(svg).toMatch(/<(polygon|path) /);
  });
  it('旋转以点为中心，正角度逆时针；填充和边框共同透明', () => {
    const svg = renderAdvancedMarker(point, {
      ...marker,
      rotationDeg: 30.5,
      opacity: 0.4,
    });
    expect(svg).toContain('transform="rotate(-30.5 100 80)"');
    expect(svg).toContain('opacity="0.4"');
    expect(svg.match(/data-role="marker"/g)).toHaveLength(1);
  });
  it('跟随线条透明度优先，取消跟随后恢复独立设置', () => {
    const style = { ...marker, opacity: 0.3, followLineOpacity: true };
    expect(renderAdvancedMarker(point, style, 0.7)).toContain('opacity="0.7"');
    expect(renderAdvancedMarker(point, style)).toContain('opacity="1"');
    expect(
      renderAdvancedMarker(point, { ...style, followLineOpacity: false }, 0.7),
    ).toContain('opacity="0.3"');
    expect(style.opacity).toBe(0.3);
  });
  it('自定义三角形按中心和直径转换坐标并闭合', () => {
    const svg = renderAdvancedMarker(point, {
      ...marker,
      shape: 'custom',
      customVertices: [
        [0, -1],
        [1, 1],
        [-1, 1],
      ],
    });
    expect(svg).toContain('points="100,75 105,85 95,85"');
  });
  it('间隙包络涵盖尖锐三角边框及任意旋转', () => {
    const style: AdvancedMarker = {
      ...marker,
      shape: 'triangle',
      rotationDeg: 47,
      strokeWidthPt: 3,
    };
    expect(advancedMarkerRadius(style)).toBeGreaterThan(8);
    expect(advancedMarkerRadius(style)).toBe(
      advancedMarkerRadius({ ...style, rotationDeg: -33 }),
    );
    expect(advancedMarkerRadius({ ...style, visible: false })).toBe(0);
  });
  it('巨大但可表示的尺寸先除后乘，无法表示的描边包络有明确错误', () => {
    expect(
      Number.isFinite(
        advancedMarkerRadius({
          ...marker,
          sizePt: Number.MAX_VALUE,
          strokeWidthPt: 0,
        }),
      ),
    ).toBe(true);
    expect(() =>
      advancedMarkerRadius({ ...marker, strokeWidthPt: Number.MAX_VALUE }),
    ).toThrow(/范围/);
  });
  it('不允许不完整、越界及无法形成面积的自定义几何', () => {
    for (const customVertices of [
      [],
      [
        [0, 0],
        [1, 1],
      ],
      [
        [0, 0],
        [0.5, 0.5],
        [1, 1],
      ],
      [
        [-1, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
      ],
      [
        [0, 0],
        [2, 1],
        [1, 0],
      ],
      [
        [0, 0],
        [1, 0],
        [1, 0],
        [0, 1],
      ],
    ])
      expect(() =>
        validateMarkerAppearance({
          ...marker,
          shape: 'custom',
          customVertices,
        }),
      ).toThrow();
    expect(() =>
      validateMarkerAppearance({ ...marker, shape: 'custom' }),
    ).toThrow();
  });
  it.each([
    { rotationDeg: NaN },
    { rotationDeg: 361 },
    { opacity: -0.1 },
    { followLineOpacity: 'yes' },
    { sizePt: Infinity },
    {
      customVertices: [
        [0, 0],
        [1, 0],
        [0, 1],
      ],
    },
  ])('拒绝非法设置 %j', (patch) => {
    expect(() =>
      validateMarkerAppearance({ ...marker, ...patch } as AdvancedMarker),
    ).toThrow();
  });
});
