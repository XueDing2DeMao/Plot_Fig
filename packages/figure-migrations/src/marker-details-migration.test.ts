import { withoutMigratedPlainText } from '../../../tests/helpers/figure-payloads.js';
import { expect, it } from 'vitest';
import { createCurrentDocument } from '../../../tests/helpers/figure-payloads.js';
import { loadFigurePayload } from './index.js';
it('1.15文档与模板只迁移版本、输入不变且拒绝旧版本伪装新字段', () => {
  const document = createCurrentDocument();
  document.schemaVersion = '1.15.0';
  document.templateSnapshot.schemaVersion = '1.15.0';
  const before = structuredClone(document);
  const migrated = loadFigurePayload(document);
  expect(migrated.ok).toBe(true);
  if (migrated.ok)
    expect(withoutMigratedPlainText(migrated.value)).toEqual({
      ...document,
      schemaVersion: '1.22.0',
      templateSnapshot: {
        ...document.templateSnapshot,
        schemaVersion: '1.22.0',
      },
    });
  expect(document).toEqual(before);
  Object.assign(document.templateSnapshot.panels[0]!.plotSlots[0]!, {
    markerDetails: { fillOnlyOpacity: true },
  });
  expect(loadFigurePayload(document).ok).toBe(false);
});
