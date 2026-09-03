import type { OriginTemplateSnapshotV1 } from './snapshot-schema.js';
import { cloneForValidation } from './snapshot-safe-clone.js';

export const NORMALIZE_TYPE_ERROR_MESSAGE =
  'Origin Snapshot normalization requires JSON-safe own data properties';

export type NormalizedOriginLengthUnit = 'mm' | 'cm' | 'in';

export type NormalizedOriginLength = {
  value: number;
  unit: NormalizedOriginLengthUnit;
};

export type NormalizedOriginFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NormalizedOriginPage = Omit<
  OriginTemplateSnapshotV1['page'],
  'height' | 'unit' | 'width'
> & {
  width: NormalizedOriginLength;
  height: NormalizedOriginLength;
};

export type NormalizedOriginLayer = Omit<
  OriginTemplateSnapshotV1['layers'][number],
  'frame'
> & {
  frame: NormalizedOriginFrame;
};

export type NormalizedOriginSnapshot = Omit<
  OriginTemplateSnapshotV1,
  'layers' | 'page'
> & {
  page: NormalizedOriginPage;
  layers: NormalizedOriginLayer[];
};

function normalizeUnit(
  unit: OriginTemplateSnapshotV1['page']['unit'],
): NormalizedOriginLengthUnit {
  return unit === 'inch' ? 'in' : unit;
}

function canonicalZero(value: number): number {
  return value === 0 ? 0 : value;
}

function percentToFraction(value: number): number {
  return canonicalZero(value / 100);
}

function normalizeFrame(
  frame: OriginTemplateSnapshotV1['layers'][number]['frame'],
): NormalizedOriginFrame {
  return {
    x: percentToFraction(frame.leftPct),
    y: percentToFraction(100 - frame.bottomPct - frame.heightPct),
    width: percentToFraction(frame.widthPct),
    height: percentToFraction(frame.heightPct),
  };
}

function normalizePage(
  page: OriginTemplateSnapshotV1['page'],
): NormalizedOriginPage {
  const { width, height, unit, ...rest } = page;
  const normalizedUnit = normalizeUnit(unit);

  return {
    ...rest,
    width: { value: width, unit: normalizedUnit },
    height: { value: height, unit: normalizedUnit },
  };
}

function normalizeLayer(
  layer: OriginTemplateSnapshotV1['layers'][number],
): NormalizedOriginLayer {
  const { frame, ...rest } = layer;
  return {
    ...rest,
    frame: normalizeFrame(frame),
  };
}

export function normalizeOriginSnapshot(
  input: OriginTemplateSnapshotV1,
): NormalizedOriginSnapshot {
  const cloned = cloneForValidation(input);
  if (!cloned.ok) {
    throw new TypeError(NORMALIZE_TYPE_ERROR_MESSAGE);
  }

  const snapshot = cloned.value as OriginTemplateSnapshotV1;
  return {
    ...snapshot,
    page: normalizePage(snapshot.page),
    layers: snapshot.layers.map(normalizeLayer),
  };
}
