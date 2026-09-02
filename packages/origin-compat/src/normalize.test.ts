import { canonicalizeFigurePayload } from '@plot-fig/figure-schema';
import { describe, expect, it } from 'vitest';
import {
  createOriginSnapshot,
  createSnapshotClone,
} from '../../../tests/origin/fixture-factory.js';
import type { OriginTemplateSnapshotV1 } from './snapshot-schema.js';
import { normalizeOriginSnapshot } from './normalize.js';

const NORMALIZE_TYPE_ERROR_MESSAGE =
  'Origin Snapshot normalization requires JSON-safe own data properties';

function collectReferences(
  value: unknown,
  refs: Set<object> = new Set<object>(),
): Set<object> {
  if (value === null || typeof value !== 'object' || refs.has(value)) {
    return refs;
  }

  refs.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry) => collectReferences(entry, refs));
    return refs;
  }

  Object.values(value).forEach((entry) => collectReferences(entry, refs));
  return refs;
}

function expectFreshObjectGraph(value: unknown, inputRefs: Set<object>): void {
  if (value === null || typeof value !== 'object') {
    return;
  }

  expect(inputRefs.has(value)).toBe(false);
  if (Array.isArray(value)) {
    value.forEach((entry) => expectFreshObjectGraph(entry, inputRefs));
    return;
  }

  Object.values(value).forEach((entry) =>
    expectFreshObjectGraph(entry, inputRefs),
  );
}

describe('normalizeOriginSnapshot', () => {
  it.each([
    ['mm', 'mm'],
    ['cm', 'cm'],
    ['inch', 'in'],
  ] as const)(
    'keeps page lengths stable for %s and emits %s units',
    (inputUnit, outputUnit) => {
      const input = createOriginSnapshot((snapshot) => {
        snapshot.page = {
          width: 3.5,
          height: 2.5,
          unit: inputUnit,
          background: '#ffffff',
        };
      });

      const output = normalizeOriginSnapshot(input);

      expect(output.page).toEqual({
        width: { value: 3.5, unit: outputUnit },
        height: { value: 2.5, unit: outputUnit },
        background: '#ffffff',
      });
    },
  );

  it('maps bottom-left percentages into top-origin panel frames without mutating input', () => {
    const input = createOriginSnapshot((snapshot) => {
      const templateLayer = structuredClone(snapshot.layers[0]!);
      snapshot.page = {
        width: 3.5,
        height: 2.5,
        unit: 'inch',
        background: '#ffffff',
      };
      snapshot.layers = [
        {
          ...structuredClone(templateLayer),
          layerId: 'layer-bottom',
          frame: {
            leftPct: -0,
            bottomPct: 0,
            widthPct: 25,
            heightPct: 20,
          },
        },
        {
          ...structuredClone(templateLayer),
          layerId: 'layer-top',
          frame: {
            leftPct: 50,
            bottomPct: 80,
            widthPct: 50,
            heightPct: 20,
          },
        },
        {
          ...structuredClone(templateLayer),
          layerId: 'layer-middle',
          frame: {
            leftPct: 10,
            bottomPct: 25,
            widthPct: 80,
            heightPct: 50,
          },
        },
      ];
    });
    const before = createSnapshotClone(input);

    const output = normalizeOriginSnapshot(input);

    expect(output.page).toEqual({
      width: { value: 3.5, unit: 'in' },
      height: { value: 2.5, unit: 'in' },
      background: '#ffffff',
    });
    expect(output.layers.map((layer) => layer.frame)).toEqual([
      { x: 0, y: 0.8, width: 0.25, height: 0.2 },
      { x: 0.5, y: 0, width: 0.5, height: 0.2 },
      { x: 0.1, y: 0.25, width: 0.8, height: 0.5 },
    ]);
    expect(Object.is(output.layers[0]!.frame.x, -0)).toBe(false);
    expect(Object.is(output.layers[1]!.frame.y, -0)).toBe(false);
    expect(input).toEqual(before);
  });

  it('keeps out-of-range percentages untouched apart from the coordinate formula', () => {
    const input = createOriginSnapshot((snapshot) => {
      snapshot.layers[0]!.frame = {
        leftPct: -10,
        bottomPct: 95,
        widthPct: 130,
        heightPct: 10,
      };
    });

    const output = normalizeOriginSnapshot(input);

    expect(output.layers[0]!.frame).toEqual({
      x: -0.1,
      y: -0.05,
      width: 1.3,
      height: 0.1,
    });
  });

  it('returns a fully fresh object graph and repeated normalization stays canonical', () => {
    const input = createOriginSnapshot((snapshot) => {
      snapshot.unknownProperties = {
        layout: {
          tags: ['origin', 'normalized'],
        },
      };
      snapshot.layers[0]!.unknownProperties = {
        frameHint: {
          anchors: ['left', 'bottom'],
        },
      };
      snapshot.layers[0]!.xAxis.unknownProperties = {
        ticks: {
          mode: 'major',
        },
      };
      snapshot.layers[0]!.plots[0]!.unknownProperties = {
        markerHints: [{ key: 'interior', value: 'open' }],
      };
      snapshot.layers[0]!.annotations = [
        {
          annotationId: 'note-1',
          coordinateSpace: 'page',
          kind: 'text',
          position: { x: 0.2, y: 0.3 },
          text: 'Note',
          format: 'plain',
          unknownProperties: {
            notes: ['keep'],
          },
        },
      ];
    });
    const before = createSnapshotClone(input);
    const inputRefs = collectReferences(input);

    const left = normalizeOriginSnapshot(input);
    const right = normalizeOriginSnapshot(input);

    expectFreshObjectGraph(left, inputRefs);
    expect(canonicalizeFigurePayload(left)).toBe(
      canonicalizeFigurePayload(right),
    );
    expect(left).toEqual(right);
    expect(left).not.toBe(right);
    expect(input).toEqual(before);
  });

  it('throws a stable TypeError when cloning would require touching accessors', () => {
    const input = createOriginSnapshot();
    let touched = false;

    delete (input as { name?: string }).name;
    Object.defineProperty(input, 'name', {
      enumerable: true,
      get() {
        touched = true;
        throw new Error('getter should not run');
      },
    });

    let error: unknown;
    try {
      normalizeOriginSnapshot(input as OriginTemplateSnapshotV1);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe(NORMALIZE_TYPE_ERROR_MESSAGE);
    expect(touched).toBe(false);
  });
});
