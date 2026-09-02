import { describe, expect, it } from 'vitest';
import {
  type CompatibilityReport,
  type ImportDiagnostic,
  type ImportResult,
} from './types.js';
import {
  type OriginTemplateSnapshotV1,
  validateOriginSnapshot,
} from './snapshot-schema.js';

function createValidSnapshot(): OriginTemplateSnapshotV1 {
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

function expectInvalid(
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

function collectSignatures(diagnostics: ImportDiagnostic[]): string[] {
  return diagnostics.map((diagnostic) => {
    expect(diagnostic.message.trim().length).toBeGreaterThan(0);
    return `${diagnostic.code}@${diagnostic.sourcePath}`;
  });
}

describe('validateOriginSnapshot', () => {
  it('accepts a complete Snapshot and keeps type contracts explicit', () => {
    const snapshot = createValidSnapshot();
    const report: CompatibilityReport = {
      items: [],
      counts: {
        mapped: 0,
        preservedInExtensions: 0,
        lossy: 0,
        dropped: 0,
        ignoredForSecurity: 0,
      },
    };
    const result: ImportResult<OriginTemplateSnapshotV1> = {
      status: 'success',
      value: snapshot,
      diagnostics: [],
      compatibilityReport: report,
      provenance: {
        importerVersion: '0.1.0',
        originVersion: snapshot.originVersion,
        sourceHash: snapshot.sourceHash,
      },
    };

    expect(validateOriginSnapshot(snapshot)).toEqual({
      ok: true,
      value: snapshot,
    });
    expect(result.compatibilityReport.counts).toEqual(report.counts);
  });

  it.each(['1.0.1', '1.1.0', '2.0.0'])(
    'rejects future snapshotVersion %s with a dedicated diagnostic code',
    (snapshotVersion) => {
      const input = {
        ...createValidSnapshot(),
        snapshotVersion,
      };
      const result = validateOriginSnapshot(input);

      expectInvalid(
        result,
        'FIGURE_FUTURE_VERSION_UNSUPPORTED',
        '/snapshotVersion',
      );
    },
  );

  it.each(['1.0', '01.0.0', '1.0.0-alpha', '0.9.9'])(
    'treats loose or older snapshotVersion %s as an invalid Snapshot contract',
    (snapshotVersion) => {
      const input = {
        ...createValidSnapshot(),
        snapshotVersion,
      };
      const result = validateOriginSnapshot(input);

      expectInvalid(result, 'ORIGIN_SNAPSHOT_INVALID', '/snapshotVersion');
    },
  );

  it('aggregates missing fields, enum mismatches and closed-schema failures', () => {
    const input = createValidSnapshot() as Record<string, unknown>;
    delete input.name;
    input.script = 'range aa=1;';
    (input.page as Record<string, unknown>).unit = 'meter';
    (input.layers as Array<Record<string, unknown>>)[0]!.extraLayer = true;
    (
      (input.layers as Array<Record<string, unknown>>)[0]!.frame as Record<
        string,
        unknown
      >
    ).extraFrame = true;
    (
      (
        (
          (input.layers as Array<Record<string, unknown>>)[0]!.plots as Array<
            Record<string, unknown>
          >
        )[0]!.bindings as Record<string, unknown>
      ).x as Record<string, unknown>
    ).extraBinding = true;

    const result = validateOriginSnapshot(input);

    expectInvalid(result, 'ORIGIN_SNAPSHOT_INVALID', '/name');
    expect(collectSignatures(result.diagnostics)).toEqual(
      expect.arrayContaining([
        'ORIGIN_SNAPSHOT_INVALID@/name',
        'ORIGIN_SNAPSHOT_INVALID@/script',
        'ORIGIN_SNAPSHOT_INVALID@/page/unit',
        'ORIGIN_SNAPSHOT_INVALID@/layers/0/extraLayer',
        'ORIGIN_SNAPSHOT_INVALID@/layers/0/frame/extraFrame',
        'ORIGIN_SNAPSHOT_INVALID@/layers/0/plots/0/bindings/x/extraBinding',
      ]),
    );
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(6);
  });

  it('allows automation but rejects script-like root fields outside automation', () => {
    const input = createValidSnapshot() as Record<string, unknown>;
    input.labtalkScript = 'type -b "hello";';

    const result = validateOriginSnapshot(input);

    expectInvalid(result, 'ORIGIN_SNAPSHOT_INVALID', '/labtalkScript');
  });

  it.each([null, []])('returns failure instead of throwing for %j', (input) => {
    expect(() => validateOriginSnapshot(input)).not.toThrow();
    expectInvalid(
      validateOriginSnapshot(input),
      'ORIGIN_SNAPSHOT_INVALID',
      '/',
    );
  });

  it('does not execute a root snapshotVersion getter while checking for future versions', () => {
    let executed = false;
    const input = createValidSnapshot() as Record<string, unknown>;
    delete input.snapshotVersion;
    Object.defineProperty(input, 'snapshotVersion', {
      enumerable: true,
      configurable: true,
      get() {
        executed = true;
        return '9.9.9';
      },
    });

    const result = validateOriginSnapshot(input);

    expect(executed).toBe(false);
    expectInvalid(result, 'ORIGIN_SNAPSHOT_INVALID', '/snapshotVersion');
  });

  it('captures nested accessor boundaries without throwing', () => {
    let executed = false;
    const input = createValidSnapshot() as Record<string, unknown>;
    const page = { ...(input.page as Record<string, unknown>) };
    delete page.width;
    Object.defineProperty(page, 'width', {
      enumerable: true,
      configurable: true,
      get() {
        executed = true;
        throw new Error('width getter should not run');
      },
    });
    input.page = page;

    const result = validateOriginSnapshot(input);

    expect(executed).toBe(false);
    expectInvalid(result, 'ORIGIN_SNAPSHOT_INVALID', '/page/width');
  });

  it('returns a validation diagnostic for revoked proxies', () => {
    const { proxy, revoke } = Proxy.revocable(createValidSnapshot(), {});
    revoke();

    expect(() => validateOriginSnapshot(proxy)).not.toThrow();
    expectInvalid(
      validateOriginSnapshot(proxy),
      'ORIGIN_SNAPSHOT_INVALID',
      '/',
    );
  });
});
