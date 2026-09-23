import { describe, expect, it } from 'vitest';
import type { Axis, Panel } from '@plot-fig/figure-schema';
import { bindDataSlots, inferDataBindingSet } from '@plot-fig/data-binding';
import { createCurrentTemplate } from '../../../tests/helpers/figure-payloads.js';
import { alignYAxisScales } from './axis-alignment.js';
import { figureCoordinates } from './figure-coordinates.js';
import { renderFigureSvg } from './index.js';
import { createScale, type PlotScale } from './scales.js';

function axis(
  axisId: string,
  position: 'left' | 'right',
  options: Partial<Pick<Axis, 'scale' | 'range' | 'reverse'>> = {},
): Axis {
  return {
    axisId,
    dimension: 'y',
    position,
    scale: options.scale ?? 'linear',
    range: options.range ?? { mode: 'auto' },
    reverse: options.reverse ?? false,
    visible: true,
    line: { color: '#111111', widthPt: 1 },
    majorTicks: { visible: true, lengthPt: 4, widthPt: 1 },
    minorTicks: { visible: false, count: 0, lengthPt: 2, widthPt: 1 },
    tickLabels: {
      visible: true,
      fontFamily: 'Arial',
      fontSizePt: 8,
      color: '#111111',
      notation: 'auto',
      precision: 6,
    },
  };
}

function fixture(
  value: number,
  options: {
    left?: Partial<Pick<Axis, 'scale' | 'range' | 'reverse'>>;
    right?: Partial<Pick<Axis, 'scale' | 'range' | 'reverse'>>;
  } = {},
): { panel: Panel; left: Axis; right: Axis } {
  const left = axis('left-y', 'left', options.left);
  const right = axis('right-y', 'right', options.right);
  return {
    left,
    right,
    panel: {
      panelId: 'panel-main',
      frame: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
      coordinateSystem: 'cartesian-2d',
      clip: true,
      axes: [left, right],
      yAxisAlignment: {
        leftAxisId: left.axisId,
        rightAxisId: right.axisId,
        value,
      },
      plotSlots: [],
    },
  };
}

function scale(axisValue: Axis, min: number, max: number): PlotScale {
  const value = createScale(axisValue, min, max);
  if (!value) throw new Error('test scale is invalid');
  return value;
}

describe('Y axis value alignment', () => {
  it('aligns zero at the midpoint while preserving the complete right range', () => {
    const { panel, left, right } = fixture(0);
    const result = alignYAxisScales(
      panel,
      new Map([
        [left.axisId, scale(left, -1, 1)],
        [right.axisId, scale(right, 0, 1000)],
      ]),
    );

    expect(result.ok).toBe(true);
    const leftScale = result.scales.get(left.axisId)!;
    const rightScale = result.scales.get(right.axisId)!;
    expect(rightScale).toMatchObject({ min: -1000, max: 1000 });
    expect(rightScale.map(0)).toBeCloseTo(leftScale.map(0));
  });

  it('keeps matching lower endpoints unchanged', () => {
    const { panel, left, right } = fixture(0);
    const result = alignYAxisScales(
      panel,
      new Map([
        [left.axisId, scale(left, 0, 1)],
        [right.axisId, scale(right, 0, 1000)],
      ]),
    );

    expect(result.ok).toBe(true);
    expect(result.scales.get(right.axisId)).toMatchObject({
      min: 0,
      max: 1000,
    });
    expect(result.scales.get(right.axisId)!.map(0)).toBeCloseTo(
      result.scales.get(left.axisId)!.map(0),
    );
  });

  it('may expand a persisted window that still uses automatic rescaling', () => {
    const { panel, left, right } = fixture(0, {
      right: { range: { mode: 'fixed', min: 0, max: 1000 } },
    });
    right.rescale = { mode: 'auto' };
    const result = alignYAxisScales(
      panel,
      new Map([
        [left.axisId, scale(left, -1, 1)],
        [right.axisId, scale(right, 0, 1000)],
      ]),
    );

    expect(result.ok).toBe(true);
    expect(result.scales.get(right.axisId)).toMatchObject({
      min: -1000,
      max: 1000,
    });
  });

  it('accepts a fixed minimum already aligned at the lower endpoint', () => {
    const { panel, left, right } = fixture(0, {
      right: { range: { mode: 'min-only', min: 0 } },
    });
    right.rescale = { mode: 'fixed-min-auto' };
    const result = alignYAxisScales(
      panel,
      new Map([
        [left.axisId, scale(left, 0, 1)],
        [right.axisId, scale(right, 0, 1000)],
      ]),
    );

    expect(result.ok).toBe(true);
    expect(result.scales.get(right.axisId)).toMatchObject({
      min: 0,
      max: 1000,
    });
  });

  it('accepts a fixed maximum already aligned at the upper endpoint', () => {
    const { panel, left, right } = fixture(1000, {
      left: { range: { mode: 'fixed', min: 0, max: 1000 } },
      right: { range: { mode: 'max-only', max: 1000 } },
    });
    right.rescale = { mode: 'fixed-max-auto' };
    const result = alignYAxisScales(
      panel,
      new Map([
        [left.axisId, scale(left, 0, 1000)],
        [right.axisId, scale(right, 0, 1000)],
      ]),
    );

    expect(result.ok).toBe(true);
    expect(result.scales.get(right.axisId)).toMatchObject({
      min: 0,
      max: 1000,
    });
  });

  it('solves logarithmic alignment in transformed space', () => {
    const { panel, left, right } = fixture(10, {
      left: { scale: 'log10' },
      right: { scale: 'log10' },
    });
    const result = alignYAxisScales(
      panel,
      new Map([
        [left.axisId, scale(left, 1, 100)],
        [right.axisId, scale(right, 1, 10000)],
      ]),
    );

    expect(result.ok).toBe(true);
    expect(result.scales.get(right.axisId)).toMatchObject({
      min: 0.01,
      max: 10000,
    });
    expect(result.scales.get(right.axisId)!.map(10)).toBeCloseTo(
      result.scales.get(left.axisId)!.map(10),
    );
  });

  it('uses final screen mapping when the right axis is reversed', () => {
    const { panel, left, right } = fixture(1, {
      right: { reverse: true },
    });
    const result = alignYAxisScales(
      panel,
      new Map([
        [left.axisId, scale(left, 0, 4)],
        [right.axisId, scale(right, 0, 1000)],
      ]),
    );

    expect(result.ok).toBe(true);
    expect(result.scales.get(right.axisId)!.map(1)).toBeCloseTo(
      result.scales.get(left.axisId)!.map(1),
    );
  });

  it('rejects incompatible fully fixed ranges', () => {
    const { panel, left, right } = fixture(0, {
      left: { range: { mode: 'fixed', min: -1, max: 1 } },
      right: { range: { mode: 'fixed', min: 0, max: 1000 } },
    });
    const result = alignYAxisScales(
      panel,
      new Map([
        [left.axisId, scale(left, -1, 1)],
        [right.axisId, scale(right, 0, 1000)],
      ]),
    );

    expect(result).toMatchObject({
      ok: false,
      message: '右 Y 轴固定范围无法满足对齐值 0',
    });
  });

  it('preserves both original scales when the secondary constraint cannot be solved', () => {
    const { panel, left, right } = fixture(-1, {
      right: { range: { mode: 'fixed', min: 0, max: 1000 } },
    });
    const scales = new Map([
      [left.axisId, scale(left, 0, 1)],
      [right.axisId, scale(right, 0, 1000)],
    ]);
    const result = alignYAxisScales(panel, scales);
    expect(result.ok).toBe(false);
    expect(result.scales.get(left.axisId)).toBe(scales.get(left.axisId));
    expect(result.scales.get(right.axisId)).toBe(scales.get(right.axisId));
  });

  it('keeps the configuration dormant when an automatic side has no data', () => {
    const { panel, left } = fixture(0);
    const result = alignYAxisScales(
      panel,
      new Map([[left.axisId, scale(left, -1, 1)]]),
    );

    expect(result).toMatchObject({
      ok: true,
      warning: '右 Y 轴暂无可用于自动范围的数据',
    });
  });

  it('uses aligned scales in figure coordinate resolution', () => {
    const template = createCurrentTemplate();
    const panel = template.panels[0]!;
    const left = panel.axes.find((item) => item.position === 'left')!;
    const right: Axis = {
      ...structuredClone(left),
      axisId: 'right-y',
      position: 'right',
    };
    panel.axes.push(right);
    panel.yAxisAlignment = {
      leftAxisId: left.axisId,
      rightAxisId: right.axisId,
      value: 0,
    };
    template.dataSlots.push({
      dataSlotId: 'slot-right',
      name: 'Right',
      role: 'y',
      valueType: 'number',
      required: true,
    });
    panel.plotSlots.push({
      ...structuredClone(panel.plotSlots[0]!),
      plotSlotId: 'series-right',
      yAxisId: right.axisId,
      bindings: { x: 'slot-x', y: 'slot-right' },
    });
    const data = bindDataSlots(
      template,
      inferDataBindingSet(
        [
          ['X', 'Y', 'Right'],
          ['0', '-1', '0'],
          ['1', '1', '1000'],
        ],
        'dual-y.csv',
      ),
    );

    const scales = figureCoordinates(template, data).panels.get(
      panel.panelId,
    )!.scales;

    expect(scales.get(left.axisId)!.map(0)).toBeCloseTo(
      scales.get(right.axisId)!.map(0),
    );
  });

  it('reports an incompatible fixed right range during rendering', () => {
    const template = createCurrentTemplate();
    const panel = template.panels[0]!;
    const left = panel.axes.find((item) => item.position === 'left')!;
    left.range = { mode: 'fixed', min: -1, max: 1 };
    const right: Axis = {
      ...structuredClone(left),
      axisId: 'right-y-fixed',
      position: 'right',
      range: { mode: 'fixed', min: 0, max: 1000 },
    };
    panel.axes.push(right);
    panel.yAxisAlignment = {
      leftAxisId: left.axisId,
      rightAxisId: right.axisId,
      value: 0,
    };
    template.dataSlots.push({
      dataSlotId: 'slot-right-fixed',
      name: 'RightFixed',
      role: 'y',
      valueType: 'number',
      required: true,
    });
    panel.plotSlots.push({
      ...structuredClone(panel.plotSlots[0]!),
      plotSlotId: 'series-right-fixed',
      yAxisId: right.axisId,
      bindings: { x: 'slot-x', y: 'slot-right-fixed' },
    });
    const data = bindDataSlots(
      template,
      inferDataBindingSet(
        [
          ['X', 'Y', 'RightFixed'],
          ['0', '-1', '0'],
          ['1', '1', '1000'],
        ],
        'dual-y-fixed.csv',
      ),
    );

    expect(renderFigureSvg(template, data)).toMatchObject({
      ok: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          sourcePath: '/panels/panel-main/yAxisAlignment',
          message: '右 Y 轴固定范围无法满足对齐值 0',
        }),
      ]),
    });
  });
});
