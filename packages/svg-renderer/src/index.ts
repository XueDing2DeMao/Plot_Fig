import { renderTemplateSvg } from './render.js';

export type { RenderDiagnostic, RenderResult, RendererInput } from './types.js';

export const renderFigureSvg = renderTemplateSvg;
export { prepareXyData } from './xy-data-view.js';
export {
  markerSourceForPlot,
  markerMappingColumns,
} from './marker-mapped-plot.js';
export { resolveMarkerOverrides } from './marker-overrides.js';
export { figureCoordinates } from './figure-coordinates.js';
export { validateFixedAxisTicks } from './fixed-axis-ticks.js';
export { resolveTextFormat } from './text/parse.js';

export { rescaleFigureRanges } from './axis-rescale-events.js';

export { validateXyLineConnections } from './xy-line-validation.js';
export {
  parseCustomDash,
  lineAppearanceAttributes,
} from './line-appearance.js';
export { unlinkCurveGroup, resolveCurveGroups } from './curve-groups.js';
export { materializeCurveOffsets } from './curve-transforms.js';
export { labelSourceForPlot, prepareDataLabelRows } from './data-labels.js';
