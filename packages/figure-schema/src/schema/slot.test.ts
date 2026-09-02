import { Compile } from 'typebox/compile';
import { describe, expect, it } from 'vitest';
import { DataSlotSchema } from './data-slot.js';
import { PlotSlotSchema } from './plot-slot.js';

describe('slot schemas', () => {
  it('keeps data requirements separate from plot style', () => {
    expect(
      Compile(DataSlotSchema).Check({
        dataSlotId: 'x-temperature',
        name: 'Temperature',
        role: 'x',
        valueType: 'number',
        required: true,
      }),
    ).toBe(true);

    expect(
      Compile(PlotSlotSchema).Check({
        plotSlotId: 'series-1',
        kind: 'xy',
        mode: 'line-markers',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
        bindings: { x: 'x-temperature', y: 'y-conductivity' },
        lineStyle: {
          visible: true,
          color: '#000000',
          widthPt: 1.2,
          dash: 'solid',
        },
        markerStyle: {
          visible: true,
          shape: 'circle',
          sizePt: 4,
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidthPt: 0.8,
        },
        legendEntry: { visible: true, text: '8ScSZ' },
      }),
    ).toBe(true);
  });

  it('rejects plot styling on data slots and data requirements on plot slots', () => {
    const validateDataSlot = Compile(DataSlotSchema);
    const validatePlotSlot = Compile(PlotSlotSchema);

    expect(
      validateDataSlot.Check({
        dataSlotId: 'x-temperature',
        name: 'Temperature',
        role: 'x',
        valueType: 'number',
        required: true,
        lineStyle: {
          visible: true,
          color: '#000000',
          widthPt: 1,
          dash: 'solid',
        },
      }),
    ).toBe(false);

    expect(
      validatePlotSlot.Check({
        plotSlotId: 'series-1',
        kind: 'xy',
        mode: 'line',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
        bindings: { x: 'x-temperature', y: 'y-conductivity' },
        legendEntry: { visible: true, text: '8ScSZ' },
        valueType: 'number',
      }),
    ).toBe(false);
  });

  it.each([
    ['xError', 'slot-x-error'],
    ['xErrorLower', 'slot-x-error-lower'],
    ['xErrorUpper', 'slot-x-error-upper'],
    ['yError', 'slot-y-error'],
    ['yErrorLower', 'slot-y-error-lower'],
    ['yErrorUpper', 'slot-y-error-upper'],
  ] as const)(
    'structurally accepts optional error binding key %s',
    (bindingKey, slotId) => {
      const validatePlotSlot = Compile(PlotSlotSchema);

      expect(
        validatePlotSlot.Check({
          plotSlotId: `series-${bindingKey}`,
          kind: 'xy',
          mode: 'line',
          xAxisId: 'axis-x',
          yAxisId: 'axis-y',
          bindings: {
            x: 'slot-x',
            y: 'slot-y',
            [bindingKey]: slotId,
          },
          legendEntry: { visible: true, text: 'Series' },
        }),
      ).toBe(true);
    },
  );

  it('supports the planned non-error binding roles and keeps binding and style objects closed', () => {
    const validatePlotSlot = Compile(PlotSlotSchema);

    expect(
      validatePlotSlot.Check({
        plotSlotId: 'series-2',
        kind: 'xy',
        mode: 'markers',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
        bindings: {
          x: 'slot-x',
          y: 'slot-y',
          xErrorLower: 'slot-x-lower',
          xErrorUpper: 'slot-x-upper',
          yError: 'slot-y-error',
          group: 'slot-group',
          label: 'slot-label',
          color: 'slot-color',
          size: 'slot-size',
        },
        markerStyle: {
          visible: true,
          shape: 'diamond',
          sizePt: 5,
          fill: '#ff6600',
          stroke: '#111111',
          strokeWidthPt: 1,
        },
        errorBarStyle: {
          visible: true,
          color: '#111111',
          widthPt: 0.8,
          capWidthPt: 3,
        },
        legendEntry: { visible: false, text: '' },
      }),
    ).toBe(true);

    expect(
      validatePlotSlot.Check({
        plotSlotId: 'series-3',
        kind: 'xy',
        mode: 'markers',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
        bindings: {
          x: 'slot-x',
          y: 'slot-y',
          z: 'slot-z',
        },
        markerStyle: {
          visible: true,
          shape: 'circle',
          sizePt: 5,
          fill: '#ffffff',
          stroke: '#111111',
          strokeWidthPt: 1,
          opacity: 0.8,
        },
        legendEntry: { visible: true, text: 'Series 3' },
      }),
    ).toBe(false);
  });

  it('rejects legend text with html-like tags', () => {
    const validatePlotSlot = Compile(PlotSlotSchema);

    expect(
      validatePlotSlot.Check({
        plotSlotId: 'series-legend-html',
        kind: 'xy',
        mode: 'line',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
        bindings: { x: 'slot-x', y: 'slot-y' },
        legendEntry: {
          visible: true,
          text: '<b>Series 1</b>',
        },
      }),
    ).toBe(false);
  });
});
