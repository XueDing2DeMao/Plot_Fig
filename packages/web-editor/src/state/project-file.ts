import type { DataBindingSet } from '@plot-fig/data-binding';
import { loadFigurePayload } from '@plot-fig/figure-migrations';
import { CURRENT_SCHEMA_VERSION } from '@plot-fig/figure-schema';
import type {
  DataSourceDescriptor,
  FigureDocument,
  FigureTemplate,
} from '@plot-fig/figure-schema';

const PROJECT_KIND = 'plot-fig-project' as const;
const PROJECT_VERSION = '1.0.0' as const;
const MAX_PROJECT_TEXT_LENGTH = 10_000_000;

export type PlotFigProjectFile = {
  kind: typeof PROJECT_KIND;
  version: typeof PROJECT_VERSION;
  document: FigureDocument;
  data: { sourceName: string; csvText: string };
};

export type ProjectDiagnostic = {
  code: 'PROJECT_INVALID' | 'PROJECT_VERSION_UNSUPPORTED' | 'PROJECT_TOO_LARGE';
  severity: 'error';
  sourcePath: string;
  message: string;
};

export type ProjectLoadResult =
  | { ok: true; document: FigureDocument; csvText: string; sourceName: string }
  | { ok: false; diagnostics: ProjectDiagnostic[] };

function diagnostic(
  code: ProjectDiagnostic['code'],
  message: string,
): ProjectLoadResult {
  return {
    ok: false,
    diagnostics: [{ code, severity: 'error', sourcePath: '/', message }],
  };
}

function hashText(text: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function createSource(
  data: DataBindingSet,
  csvText: string,
): DataSourceDescriptor {
  return {
    sourceId: 'source-1',
    name: data.source.name,
    sourceKind: 'inline',
    mediaType: 'text/csv',
    contentHash: hashText(csvText),
    columns: data.columns.map((column) => ({
      columnId: column.columnId,
      valueType: column.valueType,
    })),
  };
}

export function createProjectFile(
  template: FigureTemplate,
  data: DataBindingSet,
  csvText: string,
): PlotFigProjectFile {
  const source = createSource(data, csvText);
  return {
    kind: PROJECT_KIND,
    version: PROJECT_VERSION,
    document: {
      kind: 'figure-document',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      documentId: `${template.templateId}-document`,
      templateSnapshot: structuredClone(template),
      dataSources: [source],
      bindingSet: data.bindings
        .filter((binding) => binding.status === 'valid')
        .map((binding) => ({
          dataSlotId: binding.dataSlotId,
          sourceId: source.sourceId,
          columnId: binding.columnId,
        })),
    },
    data: { sourceName: data.source.name, csvText },
  };
}

export function serializeProjectFile(
  template: FigureTemplate,
  data: DataBindingSet,
  csvText: string,
): string {
  return `${JSON.stringify(createProjectFile(template, data, csvText), null, 2)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseProjectFile(text: string): ProjectLoadResult {
  if (text.length > MAX_PROJECT_TEXT_LENGTH)
    return diagnostic('PROJECT_TOO_LARGE', 'Project file exceeds 10 MB');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return diagnostic('PROJECT_INVALID', 'Project file is not valid JSON');
  }
  if (!isRecord(parsed) || parsed.kind !== PROJECT_KIND)
    return diagnostic('PROJECT_INVALID', 'Project file kind is invalid');
  if (parsed.version !== PROJECT_VERSION)
    return diagnostic(
      'PROJECT_VERSION_UNSUPPORTED',
      `Unsupported project version ${String(parsed.version)}`,
    );
  const data = parsed.data;
  if (
    !isRecord(data) ||
    typeof data.sourceName !== 'string' ||
    typeof data.csvText !== 'string' ||
    !('document' in parsed)
  )
    return diagnostic(
      'PROJECT_INVALID',
      'Project file data envelope is invalid',
    );
  const loaded = loadFigurePayload(parsed.document);
  if (!loaded.ok)
    return {
      ok: false,
      diagnostics: loaded.diagnostics.map((issue) => ({
        code: 'PROJECT_INVALID',
        severity: 'error',
        sourcePath: '/document' + (issue.path === '/' ? '' : issue.path),
        message: issue.message,
      })),
    };
  if (loaded.value.kind !== 'figure-document')
    return diagnostic('PROJECT_INVALID', 'Project document failed validation');
  return {
    ok: true,
    document: loaded.value,
    csvText: data.csvText,
    sourceName: data.sourceName,
  };
}
