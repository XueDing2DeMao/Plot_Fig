import {
  CURRENT_SCHEMA_VERSION,
  type FigureTemplate,
} from '@plot-fig/figure-schema';

type Axis = FigureTemplate['panels'][number]['axes'][number];
const INK = '#000000';
const CURVE = '#515151';
const FONT = 'Arial';

function axis(dimension: 'x' | 'y'): Axis {
  return {
    axisId: `axis-${dimension}`,
    dimension,
    position: dimension === 'x' ? 'bottom' : 'left',
    scale: 'linear',
    range: { mode: 'auto' },
    rescale: {
      mode: 'auto',
      nice: true,
      margin: { minPercent: 8, maxPercent: 8 },
    },
    reverse: false,
    visible: true,
    line: { color: INK, widthPt: 1 },
    majorTicks: { visible: true, lengthPt: 4, widthPt: 1 },
    minorTicks: { visible: false, count: 0, lengthPt: 2, widthPt: 0.8 },
    tickLabels: {
      visible: true,
      fontFamily: FONT,
      fontSizePt: 10,
      color: INK,
      notation: 'auto',
      precision: 6,
    },
    title: {
      format: 'auto',
      text: dimension.toUpperCase(),
      fontFamily: FONT,
      fontSizePt: 12,
      color: INK,
    },
  } as Axis;
}

function frameAxis(dimension: 'x' | 'y'): Axis {
  const result = axis(dimension);
  result.axisId = `frame-${dimension}`;
  result.position = dimension === 'x' ? 'top' : 'right';
  result.majorTicks.visible = false;
  result.tickLabels.visible = false;
  delete result.rescale;
  delete result.title;
  return result;
}

function panel(): FigureTemplate['panels'][number] {
  return {
    panelId: 'panel-main',
    frame: { x: 0.16, y: 0.06, width: 0.81, height: 0.79 },
    coordinateSystem: 'cartesian-2d',
    clip: true,
    axes: [axis('x'), axis('y'), frameAxis('x'), frameAxis('y')],
    plotSlots: [
      {
        plotSlotId: 'series-1',
        kind: 'xy',
        mode: 'line-markers',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
        bindings: { x: 'slot-x', y: 'slot-y' },
        lineStyle: { visible: true, color: CURVE, widthPt: 1.5, dash: 'solid' },
        markerStyle: {
          visible: true,
          shape: 'square',
          sizePt: 5,
          fill: CURVE,
          stroke: CURVE,
          strokeWidthPt: 0.5,
        },
        legendEntry: { visible: false, text: 'Series 1', source: 'auto' },
      },
    ],
  };
}

// 依据 Origin 2026b 的现代图页风格适配；精确取值和来源见 defaults 计划。
export function defaultTemplate(): FigureTemplate {
  return {
    kind: 'figure-template',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    templateId: 'web-xy-template',
    metadata: { name: 'SZ-Plot XY', tags: ['xy', 'origin-2026b-inspired'] },
    page: {
      size: {
        width: { value: 180, unit: 'mm' },
        height: { value: 120, unit: 'mm' },
      },
      background: '#ffffff',
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    panels: [panel()],
    dataSlots: [
      {
        dataSlotId: 'slot-x',
        name: 'X',
        role: 'x',
        valueType: 'number',
        required: true,
      },
      {
        dataSlotId: 'slot-y',
        name: 'Y',
        role: 'y',
        valueType: 'number',
        required: true,
      },
    ],
    annotations: [],
    theme: {
      font: { family: FONT, sizePt: 10, color: INK },
      line: { color: CURVE, widthPt: 1.5 },
      marker: { shape: 'square', sizePt: 5, fill: CURVE, stroke: CURVE },
      palette: [CURVE, '#d62728', '#1f77b4', '#2ca02c'],
      background: '#ffffff',
    },
  };
}
