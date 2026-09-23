// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { createLayerBatch } from '../state/layer-batch.js';
import {
  exportFileBase,
  layerExportPlan,
  prepareOriginExport,
  runLayerExport,
} from './origin-export.js';

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="6in" height="4in" viewBox="0 0 432 288"><rect data-role="page-background" width="432" height="288" fill="white"/><path d="M0 0L10 10"/></svg>';
const settings = {
  format: 'png' as const,
  dpi: 300,
  transparent: false,
  automatic: true,
  width: 1800,
  height: 1200,
};
export function exportFixture() {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'a',
        source: { name: 'a.csv', kind: 'csv' },
        rows: [
          ['X', 'Y'],
          ['0', '1'],
          ['1', '2'],
        ],
      }),
    ],
  );
  return createLayerBatch(model, model, {
    mode: 'count',
    count: 2,
    keepExisting: true,
  });
}
it('numbers only selected layers in document order and preserves dots in the base name', () => {
  const model = exportFixture();
  const ids = model.template.panels.map((p) => p.panelId);
  expect(
    layerExportPlan(model, [ids[2]!, ids[0]!], 'Graph.v1.png', 'png').map(
      (p) => [p.id, p.fileName],
    ),
  ).toEqual([
    [ids[0], 'Graph.v1-01.png'],
    [ids[2], 'Graph.v1-02.png'],
  ]);
  expect(exportFileBase('  A/B:*?.svg ')).toBe('A_B___');
  expect(() => exportFileBase('  ')).toThrow('文件名');
});
it('derives pixels from physical size and DPI and removes only the page background', () => {
  const output = prepareOriginExport(svg, { ...settings, transparent: true });
  expect([output.width, output.height]).toEqual([1800, 1200]);
  expect(output.svg).not.toContain('page-background');
  expect(output.svg).toContain('<path');
  expect(prepareOriginExport(svg, { ...settings, dpi: 600 }).width).toBe(3600);
});
it('honors manual pixels, preserves SVG physical size and validates raster limits', () => {
  expect(
    prepareOriginExport(svg, {
      ...settings,
      automatic: false,
      width: 900,
      height: 600,
    }).width,
  ).toBe(900);
  expect(
    prepareOriginExport(svg, { ...settings, format: 'svg' }).svg,
  ).toContain('width="152.4mm"');
  expect(() =>
    prepareOriginExport(svg, { ...settings, automatic: false, width: 99999 }),
  ).toThrow('像素');
  expect(() => prepareOriginExport(svg, { ...settings, dpi: 0 })).toThrow(
    'DPI',
  );
});
it('extends the page background across letterboxing for manual aspect ratios', () => {
  const output = prepareOriginExport(svg, {
    ...settings,
    automatic: false,
    width: 1000,
    height: 1000,
  });
  const root = new DOMParser().parseFromString(
    output.svg,
    'image/svg+xml',
  ).documentElement;
  expect(root.getAttribute('viewBox')).toBe('0 -72 432 432');
  expect(
    root.querySelector('[data-role="page-background"]')?.getAttribute('y'),
  ).toBe('-72');
  expect(
    root.querySelector('[data-role="page-background"]')?.getAttribute('height'),
  ).toBe('432');
});
it('keeps planned suffixes when another layer fails and never mutates the project', async () => {
  const model = exportFixture(),
    before = structuredClone(model);
  const result = await runLayerExport(
    model,
    model.template.panels.map((p) => p.panelId).reverse(),
    'Graph1',
    { ...settings, format: 'svg' },
    { encoder: async (s) => new TextEncoder().encode(s) },
  );
  expect(Object.keys(result.files)).toEqual(['Graph1-01.svg']);
  expect(result.records.map((r) => r.status)).toEqual([
    'success',
    'failed',
    'failed',
  ]);
  expect(model).toEqual(before);
});
it('drops late export results after cancellation', async () => {
  const model = exportFixture(),
    controller = new AbortController();
  const result = await runLayerExport(
    model,
    [model.template.panels[0]!.panelId],
    'Graph1',
    settings,
    {
      signal: controller.signal,
      encoder: async () => {
        controller.abort();
        return new Uint8Array(1);
      },
    },
  );
  expect(Object.keys(result.files)).toHaveLength(0);
  expect(result.records[0]!.status).toBe('cancelled');
});
