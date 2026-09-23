import { expect, it } from 'vitest';
import { validTemplate } from '../../figure-schema/src/schema/fixtures.js';
import { loadFigurePayload } from './load.js';
import { readFile } from 'node:fs/promises';
it('1.6 升级至 1.7 不建链、不移动图层、不修改原值', () => {
  const old = { ...structuredClone(validTemplate), schemaVersion: '1.6.0' };
  Object.assign(old.panels[0]!, { name: '旧图', visible: false });
  const before = structuredClone(old);
  expect(loadFigurePayload(old)).toMatchObject({
    ok: true,
    migratedFrom: '1.6.0',
    value: { ...old, schemaVersion: '1.22.0' },
  });
  expect(old).toEqual(before);
});
it('1.6 中夹带 1.7 链接不能绕过旧版结构校验', () => {
  const old = { ...structuredClone(validTemplate), schemaVersion: '1.6.0' };
  Object.assign(old.panels[0]!, {
    frameLink: { parentPanelId: 'panel-main', width: 1 },
  });
  expect(loadFigurePayload(old)).toMatchObject({
    ok: false,
    diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
  });
});
it('1.6 文档的外层和快照同时迁移，并保留绑定', async () => {
  const old = JSON.parse(
    await readFile(
      new URL(
        '../../../tests/fixtures/migrations/figure-document-v1.4.0.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  old.schemaVersion = '1.6.0';
  old.templateSnapshot.schemaVersion = '1.6.0';
  const before = structuredClone(old),
    r = loadFigurePayload(old);
  expect(r).toMatchObject({
    ok: true,
    migratedFrom: '1.6.0',
    value: {
      ...old,
      schemaVersion: '1.22.0',
      templateSnapshot: { ...old.templateSnapshot, schemaVersion: '1.22.0' },
    },
  });
  expect(old).toEqual(before);
  old.templateSnapshot.panels[0].frameLink = { parentPanelId: 'missing', x: 0 };
  expect(loadFigurePayload(old)).toMatchObject({
    ok: false,
    diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
  });
});
