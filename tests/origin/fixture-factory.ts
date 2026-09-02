import { canonicalizeFigurePayload } from '@plot-fig/figure-schema';
import { expect } from 'vitest';
import type { OriginTemplateSnapshotV1 } from '../../packages/origin-compat/src/snapshot-schema.js';

const BASE_SNAPSHOT = {
  kind: 'origin-template-snapshot',
  snapshotVersion: '1.0.0',
  originVersion: '2026 SR0',
  sourceHash: 'sha256:origin-security-fixture',
  templateId: 'origin-security-main',
  name: 'Origin Security Template',
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
        title: { text: 'X axis', format: 'plain' },
        lineColor: '#111111',
        lineWidthPt: 1,
        majorTickLengthPt: 4,
        minorTickCount: 0,
        tickLabelFont: 'Arial',
        tickLabelSizePt: 8,
      },
      yAxis: {
        scale: 'linear',
        range: { mode: 'auto' },
        reverse: false,
        visible: true,
        title: { text: 'Y axis', format: 'plain' },
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
          legendText: 'Series 1',
        },
      ],
      annotations: [],
    },
  ],
  theme: {
    fontFamily: 'Arial',
    fontSizePt: 8,
    foreground: '#111111',
    background: '#ffffff',
    palette: ['#0072B2', '#D55E00'],
  },
} satisfies OriginTemplateSnapshotV1;

export function createOriginSnapshot(
  mutate?: (snapshot: OriginTemplateSnapshotV1) => void,
): OriginTemplateSnapshotV1 {
  const snapshot = structuredClone(BASE_SNAPSHOT) as OriginTemplateSnapshotV1;
  mutate?.(snapshot);
  return snapshot;
}

export function createSnapshotClone(
  value: OriginTemplateSnapshotV1,
): OriginTemplateSnapshotV1 {
  return structuredClone(value) as OriginTemplateSnapshotV1;
}

export function canonicalizeJson(value: unknown): string {
  return canonicalizeFigurePayload(value);
}

export function expectNoSharedSnapshotRefs(
  output: OriginTemplateSnapshotV1,
  input: OriginTemplateSnapshotV1,
): void {
  expect(output).not.toBe(input);
  expect(output.page).not.toBe(input.page);
  expect(output.layers).not.toBe(input.layers);
  expect(output.layers[0]).not.toBe(input.layers[0]);
  expect(output.layers[0]?.xAxis).not.toBe(input.layers[0]?.xAxis);
  expect(output.layers[0]?.yAxis).not.toBe(input.layers[0]?.yAxis);
  expect(output.layers[0]?.plots).not.toBe(input.layers[0]?.plots);
  expect(output.layers[0]?.plots[0]).not.toBe(input.layers[0]?.plots[0]);
  expect(output.theme).not.toBe(input.theme);
  if (output.unknownProperties && input.unknownProperties) {
    expect(output.unknownProperties).not.toBe(input.unknownProperties);
  }
}
