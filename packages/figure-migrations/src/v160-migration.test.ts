import { expect, it } from 'vitest';
import { validTemplate } from '../../figure-schema/src/schema/fixtures.js';
import { loadFigurePayload } from './load.js';

it('1.5 模板迁移只改变版本且不修改原值', () => {
  const old = { ...structuredClone(validTemplate), schemaVersion: '1.5.0' };
  const snapshot = structuredClone(old);
  const read = loadFigurePayload(old);
  expect(read).toMatchObject({
    ok: true,
    migratedFrom: '1.5.0',
    value: { ...old, schemaVersion: '1.22.0' },
  });
  expect(old).toEqual(snapshot);
});
it.each(['name', 'visible', 'appearance', 'clipMargins', 'plotVisible'])(
  '旧版本不能夹带字段 %s',
  (field) => {
    const old = { ...structuredClone(validTemplate), schemaVersion: '1.5.0' };
    const panel = old.panels[0]!;
    if (field === 'plotVisible')
      Object.assign(panel.plotSlots[0]!, { visible: false });
    else
      Object.assign(panel, {
        [field]: field === 'name' ? 'layer' : field === 'visible' ? false : {},
      });
    expect(loadFigurePayload(old)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
    });
  },
);
