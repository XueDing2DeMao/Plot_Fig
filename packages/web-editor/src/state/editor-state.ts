import {
  bindDataSlots,
  inferDataBindingSet,
  parseCsvText,
  type DataBindingSet,
  type DataDiagnostic,
} from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { renderFigureSvg, type RenderDiagnostic } from '@plot-fig/svg-renderer';

export type EditorState = {
  fileName?: string;
  data?: DataBindingSet;
  svg?: string;
  diagnostics: Array<DataDiagnostic | RenderDiagnostic>;
  status: 'empty' | 'parsing' | 'ready' | 'error';
};

export const defaultTemplate = (): FigureTemplate => ({
  kind: 'figure-template',
  schemaVersion: '1.0.0',
  templateId: 'web-xy-template',
  metadata: { name: 'Web XY', tags: ['xy'] },
  page: {
    size: {
      width: { value: 89, unit: 'mm' },
      height: { value: 65, unit: 'mm' },
    },
    background: '#ffffff',
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  panels: [
    {
      panelId: 'panel-main',
      frame: { x: 0.12, y: 0.08, width: 0.8, height: 0.82 },
      coordinateSystem: 'cartesian-2d',
      clip: true,
      axes: [
        {
          axisId: 'axis-x',
          dimension: 'x',
          position: 'bottom',
          scale: 'linear',
          range: { mode: 'auto' },
          reverse: false,
          visible: true,
          line: { color: '#14532d', widthPt: 1 },
          majorTicks: { visible: true, lengthPt: 4, widthPt: 1 },
          minorTicks: { visible: false, count: 0, lengthPt: 2, widthPt: 0.8 },
          tickLabels: {
            visible: true,
            fontFamily: 'Fira Sans',
            fontSizePt: 8,
            color: '#14532d',
            notation: 'auto',
            precision: 6,
          },
        },
        {
          axisId: 'axis-y',
          dimension: 'y',
          position: 'left',
          scale: 'linear',
          range: { mode: 'auto' },
          reverse: false,
          visible: true,
          line: { color: '#14532d', widthPt: 1 },
          majorTicks: { visible: true, lengthPt: 4, widthPt: 1 },
          minorTicks: { visible: false, count: 0, lengthPt: 2, widthPt: 0.8 },
          tickLabels: {
            visible: true,
            fontFamily: 'Fira Sans',
            fontSizePt: 8,
            color: '#14532d',
            notation: 'auto',
            precision: 6,
          },
        },
      ],
      plotSlots: [
        {
          plotSlotId: 'series-1',
          kind: 'xy',
          mode: 'line-markers',
          xAxisId: 'axis-x',
          yAxisId: 'axis-y',
          bindings: { x: 'slot-x', y: 'slot-y' },
          lineStyle: {
            visible: true,
            color: '#15803d',
            widthPt: 1.5,
            dash: 'solid',
          },
          markerStyle: {
            visible: true,
            shape: 'circle',
            sizePt: 5,
            fill: '#ffffff',
            stroke: '#15803d',
            strokeWidthPt: 1,
          },
          legendEntry: { visible: true, text: 'Series 1' },
        },
      ],
    },
  ],
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
    font: { family: 'Fira Sans', sizePt: 8, color: '#14532d' },
    line: { color: '#14532d', widthPt: 1 },
    marker: {
      shape: 'circle',
      sizePt: 4,
      fill: '#ffffff',
      stroke: '#15803d',
    },
    palette: ['#15803d', '#d97706'],
    background: '#ffffff',
  },
});

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

export async function loadCsvFile(file: File): Promise<EditorState> {
  const parsed = parseCsvText(await readFileText(file), file.name);
  if (!parsed.ok)
    return {
      fileName: file.name,
      diagnostics: parsed.diagnostics,
      status: 'error',
    };
  const data = bindDataSlots(
    defaultTemplate(),
    inferDataBindingSet(parsed.rows, file.name),
  );
  const rendered = renderFigureSvg(defaultTemplate(), data);
  if (!rendered.ok)
    return {
      fileName: file.name,
      data,
      diagnostics: [...data.diagnostics, ...rendered.diagnostics],
      status: 'error',
    };
  return {
    fileName: file.name,
    data,
    svg: rendered.svg,
    diagnostics: [...data.diagnostics, ...rendered.diagnostics],
    status: 'ready',
  };
}
