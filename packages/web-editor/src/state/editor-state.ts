import {
  bindDataSlots,
  inferDataBindingSet,
  parseCsvText,
  type DataBindingSet,
  type DataDiagnostic,
} from '@plot-fig/data-binding';
import type { FigureTemplate, XyPlot } from '@plot-fig/figure-schema';
import { renderFigureSvg, type RenderDiagnostic } from '@plot-fig/svg-renderer';
import { parseProjectFile, type ProjectDiagnostic } from './project-file.js';
import { defaultTemplate } from './default-template.js';

export type PlotMode = XyPlot['mode'];
export type PlotLineChoice = NonNullable<XyPlot['lineStyle']>['dash'] | 'none';
export type PlotMarkerChoice =
  NonNullable<XyPlot['markerStyle']>['shape'] | 'none';

export type EditorState = {
  fileName?: string;
  sourceText?: string;
  data?: DataBindingSet;
  svg?: string;
  overrides: Record<string, string>;
  plotMode: PlotMode;
  diagnostics: Array<DataDiagnostic | RenderDiagnostic | ProjectDiagnostic>;
  status: 'empty' | 'parsing' | 'ready' | 'error';
};

export { defaultTemplate } from './default-template.js';

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () =>
      reject(reader.error ?? new Error('Unable to read file'));
    reader.readAsText(file);
  });
}

const bindingDiagnosticCodes = new Set<DataDiagnostic['code']>([
  'COLUMN_TYPE_CONFLICT',
  'SLOT_COLUMN_MISSING',
  'SLOT_VALUE_INVALID',
]);

function templatePlotMode(template: FigureTemplate): PlotMode {
  const plot = template.panels[0]?.plotSlots[0];
  const plotMode = plot?.kind === 'xy' ? plot.mode : 'line-markers';
  if (!plotMode) throw new Error('Figure template must contain a PlotSlot');
  return plotMode;
}

export function updatePlotMode(
  template: FigureTemplate,
  plotMode: PlotMode,
): FigureTemplate {
  const next = structuredClone(template);
  const plotSlot = next.panels[0]?.plotSlots[0];
  if (!plotSlot) throw new Error('Figure template must contain a PlotSlot');
  if (plotSlot.kind !== 'xy') throw new Error('仅 XY 图表支持点线模式');
  plotSlot.mode = plotMode;
  return next;
}

function cleanSourceData(data: DataBindingSet): DataBindingSet {
  return {
    ...structuredClone(data),
    bindings: [],
    diagnostics: data.diagnostics.filter(
      (diagnostic) => !bindingDiagnosticCodes.has(diagnostic.code),
    ),
  };
}

export function rebindEditorData(
  template: FigureTemplate,
  source: DataBindingSet,
  overrides: Record<string, string>,
  sourceText?: string,
): EditorState {
  const plotMode = templatePlotMode(template);
  const data = bindDataSlots(template, cleanSourceData(source), overrides);
  const rendered = renderFigureSvg(template, data);
  const diagnostics = [...data.diagnostics, ...rendered.diagnostics];
  if (!rendered.ok)
    return {
      fileName: data.source.name,
      ...(sourceText === undefined ? {} : { sourceText }),
      data,
      overrides: { ...overrides },
      plotMode,
      diagnostics,
      status: 'error',
    };
  return {
    fileName: data.source.name,
    ...(sourceText === undefined ? {} : { sourceText }),
    data,
    svg: rendered.svg,
    overrides: { ...overrides },
    plotMode,
    diagnostics,
    status: 'ready',
  };
}

export function loadCsvText(
  text: string,
  sourceName: string,
  template: FigureTemplate = defaultTemplate(),
  overrides: Record<string, string> = {},
): EditorState {
  const parsed = parseCsvText(text, sourceName);
  if (!parsed.ok)
    return {
      fileName: sourceName,
      sourceText: text,
      overrides: { ...overrides },
      plotMode: templatePlotMode(template),
      diagnostics: parsed.diagnostics,
      status: 'error',
    };
  return rebindEditorData(
    template,
    inferDataBindingSet(parsed.rows, sourceName),
    overrides,
    text,
  );
}

export function restoreProjectState(
  text: string,
):
  | { ok: true; template: FigureTemplate; state: EditorState }
  | { ok: false; state: EditorState } {
  const parsed = parseProjectFile(text);
  if (!parsed.ok)
    return {
      ok: false,
      state: {
        overrides: {},
        plotMode: templatePlotMode(defaultTemplate()),
        diagnostics: parsed.diagnostics,
        status: 'error',
      },
    };
  const overrides = Object.fromEntries(
    parsed.document.bindingSet.map((binding) => [
      binding.dataSlotId,
      binding.columnId,
    ]),
  );
  const state = loadCsvText(
    parsed.csvText,
    parsed.sourceName,
    parsed.document.templateSnapshot,
    overrides,
  );
  return { ok: true, template: parsed.document.templateSnapshot, state };
}

export async function loadCsvFile(
  file: File,
  template: FigureTemplate = defaultTemplate(),
): Promise<EditorState> {
  return loadCsvText(await readFileText(file), file.name, template);
}
