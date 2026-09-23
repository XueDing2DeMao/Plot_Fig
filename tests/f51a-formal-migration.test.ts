import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadFigurePayload } from '@plot-fig/figure-migrations';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
const base = new URL('../artifacts/F5.1A/', import.meta.url);
const fixtures = JSON.parse(
  readFileSync(new URL('baseline-1.17.json', base), 'utf8'),
);
it.each(fixtures)(
  '1.17 $scale 升级仅改版本，旧图SVG逐字不变',
  ({ scale, template, data }) => {
    const old = structuredClone(template),
      loaded = loadFigurePayload(old);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value).toEqual({ ...template, schemaVersion: '1.22.0' });
    expect(old).toEqual(template);
    const result = renderFigureSvg(loaded.value as never, data);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.svg).toBe(
        readFileSync(new URL(`baseline-1.17-${scale}.svg`, base), 'utf8'),
      );
  },
);
it('1.17不能伪装Log2或SymLog字段', () => {
  const t = structuredClone(fixtures[0].template);
  t.panels[0].axes[1].scale = 'log2';
  expect(loadFigurePayload(t).ok).toBe(false);
  t.panels[0].axes[1].scale = 'log10';
  t.panels[0].axes[1].symLog = { threshold: 1, linearLength: 1 };
  expect(loadFigurePayload(t).ok).toBe(false);
});
it('1.17图形文档和内嵌快照一起迁移，拒绝历史快照携带新字段', () => {
  const template = structuredClone(fixtures[0].template);
  const document = {
    kind: 'figure-document',
    schemaVersion: '1.17.0',
    documentId: 'f5-compat',
    templateSnapshot: template,
    dataSources: [
      {
        sourceId: 'source',
        name: 'data',
        sourceKind: 'external',
        mediaType: 'text/csv',
        contentHash: 'f5-baseline',
        columns: [
          { columnId: 'x', valueType: 'number' },
          { columnId: 'y', valueType: 'number' },
        ],
      },
    ],
    bindingSet: [
      { dataSlotId: 'slot-x', sourceId: 'source', columnId: 'x' },
      { dataSlotId: 'slot-y', sourceId: 'source', columnId: 'y' },
    ],
  };
  const result = loadFigurePayload(document);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (result.ok)
    expect(result.value).toEqual({
      ...document,
      schemaVersion: '1.22.0',
      templateSnapshot: { ...template, schemaVersion: '1.22.0' },
    });
  expect(document.schemaVersion).toBe('1.17.0');
  template.panels[0].axes[1].logTicks = { mode: 'logarithmic' };
  expect(loadFigurePayload(document).ok).toBe(false);
});
