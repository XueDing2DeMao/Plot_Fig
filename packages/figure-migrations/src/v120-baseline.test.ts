import { withoutAxisIdentityGroups } from '../../../tests/helpers/figure-payloads.js';
import { withoutMigratedPlainText } from '../../../tests/helpers/figure-payloads.js';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  CURRENT_SCHEMA_VERSION,
  validateFigureDocument,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { expect, it } from 'vitest';
import { chartData } from '../../../tests/helpers/chart-fixtures.js';
import { loadFigurePayload } from './load.js';

// 此 hash 采自 1.2.0 的原始自动刻度渲染；升级协议时保留样本和 hash。
const LEGACY_AUTO_SVG_SHA256 =
  '388836753fae8582441abacb6586cccfec11f5cc38203383ea07f890de0ff916';

async function fixture(kind: 'template' | 'document') {
  return JSON.parse(
    await readFile(
      new URL(
        `../../../tests/fixtures/migrations/figure-${kind}-v1.2.0.json`,
        import.meta.url,
      ),
      'utf8',
    ),
  );
}

it('preserves fixed 1.2 fixtures and their four-axis automatic SVG', async () => {
  const [template, document] = await Promise.all([
    fixture('template'),
    fixture('document'),
  ]);
  const original = structuredClone({ template, document });
  expect(template.schemaVersion).toBe('1.2.0');
  expect(document.schemaVersion).toBe('1.2.0');
  expect(document.templateSnapshot).toEqual(template);
  expect(
    template.panels[0].axes.map((axis: { position: string }) => axis.position),
  ).toEqual(['bottom', 'left', 'top', 'right']);
  for (const axis of template.panels[0].axes)
    expect(axis.majorTicks).not.toHaveProperty('generation');

  const loadedTemplate = loadFigurePayload(template);
  const loadedDocument = loadFigurePayload(document);
  expect(loadedTemplate.ok).toBe(true);
  expect(loadedDocument.ok).toBe(true);
  if (
    !loadedTemplate.ok ||
    loadedTemplate.value.kind !== 'figure-template' ||
    !loadedDocument.ok ||
    loadedDocument.value.kind !== 'figure-document'
  )
    throw new Error('Legacy fixture loading failed');

  const expectedTemplate = {
    ...template,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  expect(withoutMigratedPlainText(loadedTemplate.value)).toEqual(
    expectedTemplate,
  );
  expect(withoutMigratedPlainText(loadedDocument.value)).toEqual({
    ...document,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    templateSnapshot: expectedTemplate,
  });
  expect(validateFigureTemplate(loadedTemplate.value).ok).toBe(true);
  expect(validateFigureDocument(loadedDocument.value).ok).toBe(true);
  expect({ template, document }).toEqual(original);

  const data = chartData({
    x: [-0.2, 0, 0.2, 0.5],
    y: [-1, 0.5, 1.8, 2],
  });
  data.source.rowCount = 4;
  const rendered = renderFigureSvg(loadedTemplate.value, data);
  expect(rendered.ok).toBe(true);
  if (!rendered.ok) throw new Error('Legacy automatic rendering failed');
  expect(rendered.diagnostics).toEqual([]);
  expect(
    createHash('sha256')
      .update(withoutAxisIdentityGroups(rendered.svg))
      .digest('hex'),
  ).toBe(LEGACY_AUTO_SVG_SHA256);
  expect(renderFigureSvg(loadedDocument.value.templateSnapshot, data)).toEqual(
    rendered,
  );
});
