import type {
  TextStyle,
  ShapeStyle,
  LegendLayout,
} from './schema/publication.js';
export function defaultTextStyle(): TextStyle {
  return {
    fontFamily: 'Arial',
    fontSizePt: 10,
    color: '#222222',
    bold: false,
    italic: false,
    anchor: 'start',
    rotation: 0,
  };
}
export function defaultShapeStyle(): ShapeStyle {
  return {
    line: { visible: true, color: '#333333', widthPt: 1, dash: 'solid' },
    fill: 'none',
    opacity: 1,
    arrowHead: 'end',
    arrowSizePt: 6,
  };
}
export function defaultLegendLayout(): LegendLayout {
  return {
    columns: 1,
    direction: 'vertical',
    anchor: 'top-right',
    sampleWidthPt: 18,
    rowGapPt: 6,
    columnGapPt: 16,
    paddingPt: 6,
    background: 'none',
    borderColor: '#555555',
    borderWidthPt: 0,
  };
}
