import { expect } from 'vitest';
import type {
  ImportDiagnostic,
  ImportResult,
} from '../../packages/origin-compat/src/types.js';
import type { CompatibilityReport } from '../../packages/origin-compat/src/types.js';
import type { OriginTemplateSnapshotV1 } from '../../packages/origin-compat/src/snapshot-schema.js';
import { validateOriginSnapshot } from '../../packages/origin-compat/src/snapshot-schema.js';

export function createValidSnapshot(): OriginTemplateSnapshotV1 {
  return {
    kind: 'origin-template-snapshot',
    snapshotVersion: '1.0.0',
    originVersion: '2026 SR0',
    sourceHash: 'sha256:origin-fixture',
    templateId: 'origin-template-main',
    name: 'Origin Main Template',
    page: {
      width: 89,
      height: 65,
      unit: 'mm',
      background: '#ffffff',
    },
    layers: [
      {
        layerId: 'layer-main',
        frame: {
          leftPct: 0.1,
          bottomPct: 0.12,
          widthPct: 0.8,
          heightPct: 0.76,
        },
        xAxis: {
          scale: 'linear',
          range: { mode: 'auto' },
          reverse: false,
          visible: true,
          title: { text: 'X', format: 'plain' },
          lineColor: '#111111',
          lineWidthPt: 1,
          majorTickLengthPt: 4,
          minorTickCount: 0,
          tickLabelFont: 'Arial',
          tickLabelSizePt: 8,
          unknownProperties: { originTickLabel: 'bottom' },
        },
        yAxis: {
          scale: 'log10',
          range: { mode: 'fixed', from: 1, to: 1000 },
          reverse: false,
          visible: true,
          lineColor: '#111111',
          lineWidthPt: 1,
          majorTickLengthPt: 4,
          minorTickCount: 2,
          tickLabelFont: 'Arial',
          tickLabelSizePt: 8,
        },
        plots: [
          {
            plotId: 'plot-main',
            mode: 'line-symbol',
            bindings: {
              x: {
                slotId: 'slot-x',
                name: 'X',
                valueType: 'number',
              },
              y: {
                slotId: 'slot-y',
                name: 'Y',
                valueType: 'number',
              },
              yErrorUpper: {
                slotId: 'slot-y-upper',
                name: 'Y Upper',
                valueType: 'number',
              },
            },
            line: {
              visible: true,
              color: '#111111',
              widthPt: 1.2,
              dash: 'solid',
            },
            symbol: {
              visible: true,
              shape: 'circle',
              sizePt: 4,
              fill: '#ffffff',
              stroke: '#111111',
              strokeWidthPt: 0.8,
            },
            errorBar: {
              visible: true,
              color: '#111111',
              widthPt: 1,
              capWidthPt: 2,
            },
            legendText: 'Series 1',
            unknownProperties: { originSymbolInterior: 'open' },
          },
        ],
        annotations: [
          {
            annotationId: 'annotation-legend',
            coordinateSpace: 'layer',
            kind: 'legend',
            position: { x: 0.9, y: 0.85 },
            visible: true,
          },
        ],
      },
    ],
    theme: {
      fontFamily: 'Arial',
      fontSizePt: 8,
      foreground: '#111111',
      background: '#ffffff',
      palette: ['#0072B2', '#D55E00'],
    },
    unknownProperties: { originProject: 'Project 1' },
    automation: [
      {
        kind: 'labtalk',
        text: 'range aa=1;',
      },
    ],
  };
}

export function createEmptyCompatibilityReport(): CompatibilityReport {
  return {
    items: [],
    counts: {
      mapped: 0,
      preservedInExtensions: 0,
      lossy: 0,
      dropped: 0,
      ignoredForSecurity: 0,
    },
  };
}

export function createTypedImportResult(
  value: OriginTemplateSnapshotV1,
): ImportResult<OriginTemplateSnapshotV1> {
  return {
    status: 'success',
    value,
    diagnostics: [],
    compatibilityReport: createEmptyCompatibilityReport(),
    provenance: {
      importerVersion: '0.1.0',
      originVersion: value.originVersion,
      sourceHash: value.sourceHash,
    },
  };
}

export function expectInvalid(
  result: ReturnType<typeof validateOriginSnapshot>,
  code: ImportDiagnostic['code'],
  sourcePath: string,
): asserts result is { ok: false; diagnostics: ImportDiagnostic[] } {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('expected validation to fail');
  }
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code,
        severity: 'error',
        sourcePath,
        message: expect.any(String),
        recoverable: false,
      }),
    ]),
  );
}

export function collectSignatures(diagnostics: ImportDiagnostic[]): string[] {
  return diagnostics.map((diagnostic) => {
    expect(diagnostic.message.trim().length).toBeGreaterThan(0);
    return `${diagnostic.code}@${diagnostic.sourcePath}`;
  });
}
