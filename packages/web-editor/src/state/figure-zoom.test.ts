import { describe, expect, it } from 'vitest';
import { createNumericScale, type Axis } from '@plot-fig/figure-schema';
import { figureCoordinates, renderFigureSvg } from '@plot-fig/svg-renderer';
import {
  chartTemplate,
  chartData,
} from '../../../../tests/helpers/chart-fixtures.js';
import {
  zoomAxisRange,
  zoomFigure,
  axisSnapshot,
  restoreAxisSnapshot,
} from './figure-zoom.js';

const axis = (scale: Axis['scale'] = 'linear', reverse = false) =>
  ({ scale, reverse }) as Axis;

describe('坐标范围缩放', () => {
  it('固定数据比例只接受同比例双轴缩放，避免绘图区和鼠标锚点漂移', () => {
    const t = chartTemplate('xy');
    const p = t.panels[0]!;
    p.axes.forEach((a) => (a.range = { mode: 'fixed', min: 0, max: 100 }));
    p.axisLengthRatio = {
      xAxisId: p.axes[0]!.axisId,
      yAxisId: p.axes[1]!.axisId,
      ratio: 1,
    };
    const data = chartData({ x: [0, 100], y: [0, 100] });
    const coords = figureCoordinates(t, data);
    const request = {
      panelId: p.panelId,
      dimension: 'x' as const,
      x: 0.75,
      y: 0.5,
      factor: 0.5,
    };
    expect(() => zoomFigure(t, coords, request)).toThrow('数据比例');
    const next = zoomFigure(t, coords, { ...request, dimension: 'xy' });
    expect(
      figureCoordinates(next, data).panels.get(p.panelId)!.rect.width,
    ).toBeCloseTo(coords.panels.get(p.panelId)!.rect.width);
  });
  it('可见公式链接轴可缩放隐藏的源轴', () => {
    const t = chartTemplate('xy');
    const source = t.panels[0]!;
    source.axes[0]!.range = { mode: 'fixed', min: 0, max: 100 };
    source.visible = false;
    const peer = structuredClone(source);
    peer.panelId = 'peer';
    peer.visible = true;
    peer.axes.forEach((a) => (a.axisId += '-peer'));
    peer.plotSlots.forEach((p) => {
      p.plotSlotId += '-peer';
      p.xAxisId += '-peer';
      p.yAxisId += '-peer';
    });
    peer.axes[0]!.advanced = {
      link: {
        panelId: source.panelId,
        axisId: source.axes[0]!.axisId,
        formula: { forward: 'x*2', inverse: 'x/2', min: -1000, max: 1000 },
      },
    };
    t.panels.push(peer);
    const data = chartData({ x: [0, 100], y: [1, 2] });
    const next = zoomFigure(t, figureCoordinates(t, data), {
      panelId: peer.panelId,
      axisId: peer.axes[0]!.axisId,
      dimension: 'x',
      x: 0.5,
      y: 0.5,
      factor: 0.5,
    });
    expect(next.panels[0]!.axes[0]!.range).toEqual({
      mode: 'fixed',
      min: 25,
      max: 75,
    });
    expect(renderFigureSvg(next, data).ok).toBe(true);
    expect(
      figureCoordinates(next, data)
        .panels.get(peer.panelId)!
        .scales.get(peer.axes[0]!.axisId),
    ).toMatchObject({ min: 50, max: 150 });
  });
  it('到达精度下限时放大不反向扩大范围', () => {
    const range = { min: 1e15, max: 1e15 + 1 };
    expect(zoomAxisRange(axis(), range, 0.5, 0.85)).toEqual(range);
  });
  it.each([false, true])('共享轴联动，即使首成员图层隐藏：%s', (hidden) => {
    const t = chartTemplate('xy');
    const first = t.panels[0]!;
    first.visible = !hidden;
    first.axes[0]!.range = { mode: 'fixed', min: 0, max: 100 };
    const peer = structuredClone(first);
    peer.panelId = 'peer';
    peer.visible = true;
    peer.axes.forEach((a) => (a.axisId += '-peer'));
    peer.plotSlots.forEach((p) => {
      p.plotSlotId += '-peer';
      p.xAxisId += '-peer';
      p.yAxisId += '-peer';
    });
    t.panels.push(peer);
    t.sharedAxisGroups = [
      {
        groupId: 'zoom-group',
        members: [
          { panelId: first.panelId, axisId: first.axes[0]!.axisId },
          { panelId: peer.panelId, axisId: peer.axes[0]!.axisId },
        ],
      },
    ];
    const data = chartData({ x: [0, 100], y: [1, 2] });
    const coords = figureCoordinates(t, data);
    const next = zoomFigure(t, coords, {
      panelId: peer.panelId,
      dimension: 'x',
      x: 0.5,
      y: 0.5,
      factor: 0.5,
    });
    expect(next.panels.map((p) => p.axes[0]!.range)).toEqual([
      { mode: 'fixed', min: 25, max: 75 },
      { mode: 'fixed', min: 25, max: 75 },
    ]);
    expect(renderFigureSvg(next, data).ok).toBe(true);
  });

  it.each([1e-200, 1e200])('极小/极大数值 %s 保留有效范围', (unit) => {
    const range = zoomAxisRange(
      axis(),
      { min: unit, max: 2 * unit },
      0.4,
      0.85,
    );
    expect(range.min / unit).toBeCloseTo(1.06);
    expect(range.max / unit).toBeCloseTo(1.91);
  });

  it.each([false, true])('线性轴保持鼠标锚点，支持反向 %s', (reverse) => {
    const a = axis('linear', reverse);
    const range = zoomAxisRange(a, { min: 0, max: 100 }, 0.3, 0.5);
    const before = createNumericScale({ kind: 'linear' }, 0, 100, reverse);
    const after = createNumericScale(
      { kind: 'linear' },
      range.min,
      range.max,
      reverse,
    );
    expect(range.max - range.min).toBeCloseTo(50);
    expect(after.map(before.invert(0.3))).toBeCloseTo(0.3, 12);
  });

  it.each(['log10', 'ln', 'log2'] as const)('在 %s 变换空间缩放', (kind) => {
    const range = zoomAxisRange(axis(kind), { min: 1, max: 10000 }, 0.5, 0.5);
    expect(range.min).toBeCloseTo(10);
    expect(range.max).toBeCloseTo(1000);
  });

  it('连续 500 次放大缩小，保持有限范围并限制最小跨度', () => {
    const initial = { min: -100, max: 100 };
    let range = initial;
    for (let i = 0; i < 500; i++)
      range = zoomAxisRange(axis(), range, 0.4, 0.85, initial);
    expect(range.max - range.min).toBeGreaterThanOrEqual(0.00019);
    for (let i = 0; i < 500; i++)
      range = zoomAxisRange(axis(), range, 0.4, 1 / 0.85, initial);
    expect(Number.isFinite(range.min) && Number.isFinite(range.max)).toBe(true);
    expect(range.max - range.min).toBeLessThanOrEqual(200000001);
  });

  it.each([0, -1, NaN, Infinity])('拒绝无效缩放因子 %s', (factor) => {
    expect(() =>
      zoomAxisRange(axis(), { min: 0, max: 10 }, 0.5, factor),
    ).toThrow();
  });

  it('X 缩放不改 Y、样式或数据；恢复保留期间的样式修改', () => {
    const t = chartTemplate('xy');
    const data = chartData({ x: [0, 10, 20], y: [1, 8, 3] });
    const original = structuredClone({ t, data });
    const coordinates = figureCoordinates(t, data);
    const p = t.panels[0]!;
    const next = zoomFigure(t, coordinates, {
      panelId: p.panelId,
      dimension: 'x',
      x: 0.5,
      y: 0.5,
      factor: 0.5,
    });
    expect(
      next.panels[0]!.axes.find((a) => a.dimension === 'x')!.range.mode,
    ).toBe('fixed');
    expect(next.panels[0]!.axes.find((a) => a.dimension === 'y')).toEqual(
      p.axes.find((a) => a.dimension === 'y'),
    );
    expect({ t, data }).toEqual(original);
    expect(renderFigureSvg(next, data).ok).toBe(true);
    next.panels[0]!.axes[0]!.line.color = '#ff0000';
    const restored = restoreAxisSnapshot(next, axisSnapshot(t));
    expect(restored.panels[0]!.axes[0]!.range).toEqual(p.axes[0]!.range);
    expect(restored.panels[0]!.axes[0]!.line.color).toBe('#ff0000');
  });

  it('框选同时更新两轴，反向拖动得到相同范围', () => {
    const t = chartTemplate('xy');
    const data = chartData({ x: [0, 100], y: [0, 100] });
    const coords = figureCoordinates(t, data);
    const request = {
      panelId: t.panels[0]!.panelId,
      dimension: 'xy' as const,
      x: 0.2,
      y: 0.3,
      selection: { x: 0.8, y: 0.7 },
    };
    const next = zoomFigure(t, coords, request);
    const reversed = zoomFigure(t, coords, {
      ...request,
      x: 0.8,
      y: 0.7,
      selection: { x: 0.2, y: 0.3 },
    });
    expect(next).toEqual(reversed);
    expect(
      next.panels[0]!.axes.filter((a) => a.range.mode === 'fixed'),
    ).toHaveLength(2);
  });
});
