import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { describe, expect, it } from 'vitest';
import { mapOriginSnapshot } from '../../packages/origin-compat/src/map.js';
import { normalizeOriginSnapshot } from '../../packages/origin-compat/src/normalize.js';
import { buildCompatibilityReport } from '../../packages/origin-compat/src/report.js';
import { createOriginSnapshot } from './fixture-factory.js';

describe('Origin Snapshot mapper', () => {
  it('maps page, layer, slots and plot mode into FigureTemplate IR', () => {
    const result = mapOriginSnapshot(
      normalizeOriginSnapshot(createOriginSnapshot()),
      'test-importer',
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.value.panels[0]?.plotSlots[0]?.mode).toBe('line-markers');
    expect(result.value.dataSlots).toEqual([
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
    ]);
    expect(validateFigureTemplate(result.value).ok).toBe(true);
    expect(buildCompatibilityReport(result.items).counts.mapped).toBe(2);
  });

  it('preserves unknown properties and reports slot conflicts', () => {
    const snapshot = createOriginSnapshot((value) => {
      value.unknownProperties = { customPage: { enabled: true } };
      value.layers[0]!.plots[0]!.unknownProperties = { customPlot: 1 };
      value.layers[0]!.plots[0]!.bindings.y = {
        slotId: 'slot-x',
        name: 'Y-as-X',
        valueType: 'number',
      };
    });
    const result = mapOriginSnapshot(
      normalizeOriginSnapshot(snapshot),
      'test-importer',
    );
    expect(
      result.diagnostics.some(
        (item) => item.code === 'ORIGIN_INVALID_REFERENCE',
      ),
    ).toBe(true);
    expect(
      result.diagnostics.some(
        (item) => item.code === 'ORIGIN_UNSUPPORTED_PROPERTY',
      ),
    ).toBe(true);
    expect(result.value.extensions).toEqual({
      origin: { customPage: { enabled: true } },
    });
    expect(result.value.panels[0]?.plotSlots[0]?.extensions).toEqual({
      origin: { customPlot: 1 },
    });
    expect(
      buildCompatibilityReport(result.items).counts.preservedInExtensions,
    ).toBe(2);
  });

  it('maps layer coordinates to panel and data annotation scopes', () => {
    const snapshot = createOriginSnapshot((value) => {
      value.layers[0]!.annotations = [
        {
          annotationId: 'a1',
          coordinateSpace: 'layer',
          kind: 'text',
          position: { x: 0.2, y: 0.3 },
          text: 'hello',
          format: 'plain',
        },
        {
          annotationId: 'a2',
          coordinateSpace: 'data',
          kind: 'reference-line',
          orientation: 'x',
          value: 1,
        },
      ];
    });
    const result = mapOriginSnapshot(
      normalizeOriginSnapshot(snapshot),
      'test-importer',
    );
    expect(result.value.annotations[0]).toMatchObject({
      coordinateSpace: 'panel',
      panelId: 'layer-main',
    });
    expect(result.value.annotations[1]).toMatchObject({
      coordinateSpace: 'data',
      panelId: 'layer-main',
      xAxisId: 'layer-main-x',
      yAxisId: 'layer-main-y',
    });
    expect(validateFigureTemplate(result.value).ok).toBe(true);
  });
});
