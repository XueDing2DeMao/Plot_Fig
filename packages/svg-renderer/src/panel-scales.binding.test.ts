import { describe, expect, it } from 'vitest';
import type { Axis } from '@plot-fig/figure-schema';
import type { PreparedPlot } from './charts/prepared.js';
import { prepareAxisScale } from './panel-scales.js';

function yAxis(range: Axis['range']): Axis {
  return {
    axisId: 'right-y',
    dimension: 'y',
    position: 'right',
    scale: 'linear',
    range,
    reverse: false,
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

function leftPlot(): PreparedPlot {
  return {
    plot: {
      plotSlotId: 'series-left',
      kind: 'xy',
      mode: 'line',
      xAxisId: 'bottom-x',
      yAxisId: 'left-y',
      bindings: { x: 'slot-x', y: 'slot-y' },
      lineStyle: {
        visible: true,
        color: '#111111',
        widthPt: 1,
        dash: 'solid',
      },
      markerStyle: {
        visible: false,
        shape: 'circle',
        sizePt: 4,
        fill: '#ffffff',
        stroke: '#111111',
        strokeWidthPt: 1,
      },
      legendEntry: { visible: true, text: 'Left' },
    },
    xValues: [0, 1],
    yValues: [0, 100],
    categories: [],
    skipped: 0,
  } as PreparedPlot;
}

describe('axis scale binding isolation', () => {
  it('does not borrow another axis data when an automatic axis is unbound', () => {
    expect(
      prepareAxisScale(yAxis({ mode: 'auto' }), [leftPlot()]),
    ).toBeUndefined();
  });

  it('keeps an unbound fixed axis renderable', () => {
    expect(
      prepareAxisScale(yAxis({ mode: 'fixed', min: -1, max: 1 }), [leftPlot()]),
    ).toMatchObject({ min: -1, max: 1 });
  });
});
