import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadFigurePayload } from '@plot-fig/figure-migrations';
import { bindWorkspace } from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { parseWorkspaceProject } from '../packages/web-editor/src/state/workspace-project.js';
const root = new URL('../artifacts/F5.1A/', import.meta.url);
it.each(['log2', 'symlog', 'log10', 'narrow'])(
  '1.18 %s 正式项目升级1.19只改版本，旧SVG逐字节不变',
  (name) => {
    const text = readFileSync(new URL(`formal-${name}.json`, root), 'utf8'),
      input = JSON.parse(text),
      old = structuredClone(input),
      loaded = parseWorkspaceProject(text);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(input).toEqual(old);
    expect(loaded.template).toEqual({
      ...input.template,
      schemaVersion: '1.22.0',
    });
    const rendered = renderFigureSvg(
      loaded.template,
      bindWorkspace(loaded.template, loaded.workspace),
    );
    expect(rendered.ok).toBe(true);
    if (rendered.ok)
      expect(rendered.svg).toBe(
        readFileSync(new URL(`formal-${name}-expected.svg`, root), 'utf8'),
      );
    input.template.panels[0].axes[0].advanced = { arrow: 'end' };
    expect(loadFigurePayload(input.template).ok).toBe(false);
  },
);
it('1.18 图形文档同步升级内嵌快照，拒绝在历史版本偷带新尺度', () => {
  const project = JSON.parse(
      readFileSync(new URL('formal-log2.json', root), 'utf8'),
    ),
    snapshot = project.template;
  const document = {
    kind: 'figure-document',
    schemaVersion: '1.18.0',
    documentId: 'compat-f5',
    templateSnapshot: snapshot,
    dataSources: [
      {
        sourceId: 'data',
        name: 'data',
        sourceKind: 'external',
        mediaType: 'text/csv',
        contentHash: 'f5',
        columns: [
          { columnId: 'x', valueType: 'number' },
          { columnId: 'y', valueType: 'number' },
        ],
      },
    ],
    bindingSet: [
      { dataSlotId: 'slot-x', sourceId: 'data', columnId: 'x' },
      { dataSlotId: 'slot-y', sourceId: 'data', columnId: 'y' },
    ],
  };
  const migrated = loadFigurePayload(document);
  expect(migrated.ok, JSON.stringify(migrated)).toBe(true);
  if (migrated.ok)
    expect(migrated.value).toEqual({
      ...document,
      schemaVersion: '1.22.0',
      templateSnapshot: { ...snapshot, schemaVersion: '1.22.0' },
    });
  snapshot.panels[0].axes[0].scale = 'probability';
  expect(loadFigurePayload(document).ok).toBe(false);
});
