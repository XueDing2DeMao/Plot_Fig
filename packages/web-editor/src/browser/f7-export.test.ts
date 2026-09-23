// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { prepareFigureExport, exportLayers } from './figure-export-options.js';
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><defs><pattern id="p" width="4" height="4"/></defs><rect data-role="page-background" width="100" height="80" fill="white"/><g data-role="panel" data-panel-id="one"><rect x="10" y="10" width="20" height="20" fill="url(#p)"/></g><g data-role="panel" data-panel-id="two"><circle cx="70" cy="40" r="5"/></g></svg>';
it('exports selected layers with exact pixels, shared definitions and transparent page', () => {
  expect(exportLayers(svg)).toEqual(['one', 'two']);
  const result = prepareFigureExport(svg, {
    panelIds: ['two'],
    transparent: true,
    width: 720,
    height: 480,
  });
  expect(result.svg).not.toContain('data-panel-id="one"');
  expect(result.svg).toContain('id="p"');
  expect(result.svg).not.toContain('data-role="page-background"');
  expect(result).toMatchObject({ width: 720, height: 480 });
});
it('rejects empty selection and excessive pixel allocation', () => {
  expect(() => prepareFigureExport(svg, { panelIds: [] })).toThrow();
  expect(() =>
    prepareFigureExport(svg, { width: 8000, height: 8000 }),
  ).toThrow();
});
