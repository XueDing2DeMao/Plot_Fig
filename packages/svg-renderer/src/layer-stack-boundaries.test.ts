import { describe, expect, it } from 'vitest';
import { createLayerStack } from '@plot-fig/figure-schema';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { preparePanel } from './panel.js';
import { prepareAxisScale } from './panel-scales.js';
import type { RenderDiagnostic } from './types.js';

describe('layer stack compatibility and data-domain boundaries', () => {
  it.each([10, -10])(
    'includes the final area baseline in auto range (offset %i)',
    (offset) => {
      const panel = chartTemplate('area').panels[0]!;
      const plot = panel.plotSlots[0]!;
      panel.layerStack = createLayerStack([plot.plotSlotId]);
      panel.layerStack.mode = 'constant';
      panel.layerStack.constant = { values: [offset], absolute: true };
      const data = chartData({ x: [1, 2], y: [1, 2] });
      for (const relative of [false, true]) {
        panel.layerStack.relativeAdditionalLine = relative;
        const diagnostics: RenderDiagnostic[] = [];
        const result = preparePanel(panel, data, diagnostics);
        const baseline = relative ? offset : 0;
        expect(diagnostics).toEqual([]);
        expect(result[0]!.yValues).toEqual([1 + offset, 2 + offset, baseline]);
        const scale = prepareAxisScale(
          panel.axes.find((a) => a.axisId === plot.yAxisId)!,
          result,
          data,
        )!;
        expect(scale.min).toBe(Math.min(1 + offset, 2 + offset, baseline));
        expect(scale.max).toBe(Math.max(1 + offset, 2 + offset, baseline));
      }
    },
  );

  it('includes a custom fill baseline after relative additional-line mapping', () => {
    const panel = chartTemplate('xy').panels[0]!;
    const plot = panel.plotSlots[0]!;
    if (plot.kind !== 'xy') throw new Error('fixture');
    plot.transform = {
      fill: {
        target: 'baseline',
        baseline: 0,
        positiveColor: '#ff0000',
        negativeColor: '#0000ff',
        opacity: 0.5,
      },
    };
    plot.dropLines = { vertical: { target: { mode: 'value', value: 0 } } };
    panel.layerStack = createLayerStack([plot.plotSlotId]);
    panel.layerStack.mode = 'constant';
    panel.layerStack.constant = { values: [10], absolute: true };
    const data = chartData({ x: [1, 2], y: [1, 2] });
    for (const relative of [false, true]) {
      panel.layerStack.relativeAdditionalLine = relative;
      const diagnostics: RenderDiagnostic[] = [];
      const result = preparePanel(panel, data, diagnostics);
      expect(diagnostics).toEqual([]);
      expect(Math.min(...result[0]!.yValues)).toBe(relative ? 10 : 0);
      expect(result[0]!.plot).toMatchObject({
        dropLines: { vertical: { target: { value: relative ? 10 : 0 } } },
      });
    }
  });

  it.each([0, 1, 2])(
    'replaces area fills only for active legacy members (%i remain)',
    (remaining) => {
      const panel = chartTemplate('area').panels[0]!;
      const original = panel.plotSlots[0]!;
      panel.plotSlots = Array.from({ length: 2 + remaining }, (_, i) => ({
        ...structuredClone(original),
        plotSlotId: `p${i}`,
      }));
      panel.stack = {
        mode: 'normal',
        members: panel.plotSlots.map((p) => p.plotSlotId),
      };
      panel.layerStack = createLayerStack(['p0', 'p1']);
      const diagnostics: RenderDiagnostic[] = [];
      const result = preparePanel(
        panel,
        chartData({ x: [1, 2], y: [2, 3] }),
        diagnostics,
      );
      expect(diagnostics).toEqual([]);
      expect(result.map((p) => p.replaceAreaFill)).toEqual([
        false,
        false,
        ...Array.from({ length: remaining }, () => remaining >= 2),
      ]);
      expect(result.slice(0, 2).every((p) => p.curveFills?.length === 0)).toBe(
        true,
      );
      if (remaining >= 2)
        expect(result[2]!.curveFills?.length).toBeGreaterThan(0);
    },
  );

  function logFixture() {
    const panel = chartTemplate('xy').panels[0]!;
    const plot = panel.plotSlots[0]!;
    if (plot.kind !== 'xy') throw new Error('fixture');
    plot.dataView = {
      rowRange: { from: 2, to: 3 },
      calculationSource: 'selected',
    };
    panel.axes.find((a) => a.axisId === plot.yAxisId)!.scale = 'log10';
    panel.layerStack = createLayerStack([plot.plotSlotId]);
    panel.layerStack.mode = 'auto';
    panel.layerStack.auto.preserveScale = true;
    return { panel, plot };
  }

  it('ignores out-of-domain raw rows excluded from plotting and calculation', () => {
    const { panel } = logFixture();
    const diagnostics: RenderDiagnostic[] = [];
    const data = chartData({ x: [1, 2, 3], y: [-1, 1, 10] });
    const result = preparePanel(panel, data, diagnostics);
    expect(diagnostics).toEqual([]);
    expect(result).toHaveLength(1);
    expect(result[0]!.xyRows!.selectedRows.map((r) => r.y)).toEqual([1, 10]);
    expect(result[0]!.xyRows!.rawRows[0]!.y).toBe(-1);
    expect(data.columns.find((c) => c.columnId === 'y')!.values).toEqual([
      -1, 1, 10,
    ]);
  });

  it('still rejects invalid coordinates included in raw calculation', () => {
    const { panel, plot } = logFixture();
    plot.dataView!.calculationSource = 'raw';
    const diagnostics: RenderDiagnostic[] = [];
    expect(
      preparePanel(
        panel,
        chartData({ x: [1, 2, 3], y: [-1, 1, 10] }),
        diagnostics,
      ),
    ).toEqual([]);
    expect(
      diagnostics.some(
        (d) => d.severity === 'error' && /非线性/.test(d.message),
      ),
    ).toBe(true);
  });

  it('still rejects selected error endpoints outside the nonlinear domain', () => {
    const { panel, plot } = logFixture();
    plot.bindings.yError = 'slot-yError';
    plot.errorBarStyle = {
      visible: true,
      color: '#111111',
      widthPt: 1,
      capWidthPt: 4,
    };
    const diagnostics: RenderDiagnostic[] = [];
    const data = chartData({ x: [1, 2, 3], y: [1, 1, 10], yError: [0, 2, 1] });
    expect(preparePanel(panel, data, diagnostics)).toEqual([]);
    expect(
      diagnostics.some(
        (d) => d.severity === 'error' && /非线性/.test(d.message),
      ),
    ).toBe(true);
  });
});
