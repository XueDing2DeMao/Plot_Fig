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

// 冻结 1.4.0 的四侧外观与手动范围；后续范围策略迁移不能插入默认值或改变输出。
const LEGACY_APPEARANCE_SVG_SHA256 =
  'd1c85c9d0283fdd549f53a26cc603997a1d72522bf50b98f8b8f49758104cb32';

async function fixture(kind: 'template' | 'document') {
  return JSON.parse(
    await readFile(
      new URL(
        `../../../tests/fixtures/migrations/figure-${kind}-v1.4.0.json`,
        import.meta.url,
      ),
      'utf8',
    ),
  );
}

it('preserves fixed 1.4 fixtures, extension data and their four-side appearance SVG', async () => {
  const [template, document] = await Promise.all([
    fixture('template'),
    fixture('document'),
  ]);
  const original = structuredClone({ template, document });
  expect(template.schemaVersion).toBe('1.4.0');
  expect(document.schemaVersion).toBe('1.4.0');
  expect(document.templateSnapshot).toEqual(template);
  expect(
    template.panels[0].axes.map((axis: { position: string }) => axis.position),
  ).toEqual(['bottom', 'left', 'top', 'right']);

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
    throw new Error('Legacy 1.4 fixture loading failed');

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
  for (const axis of loadedTemplate.value.panels[0]!.axes)
    expect(Object.hasOwn(axis, 'rescale')).toBe(false);

  const data = chartData({
    x: [-0.2, 0, 0.2, 0.5],
    y: [-1, 0.5, 1.8, 2],
  });
  data.source.rowCount = 4;
  const rendered = renderFigureSvg(loadedTemplate.value, data);
  expect(rendered.ok).toBe(true);
  if (!rendered.ok) throw new Error('Legacy 1.4 rendering failed');
  expect(rendered.diagnostics).toEqual([]);
  expect(rendered.svg).toContain('data-role="minor-grid"');
  expect(rendered.svg).toContain('data-role="major-grid"');
  expect(rendered.svg).toContain('rotate(');
  expect(rendered.svg).toContain('font-weight="bold"');
  expect(rendered.svg).toContain('font-style="italic"');
  expect(
    createHash('sha256')
      .update(withoutAxisIdentityGroups(rendered.svg))
      .digest('hex'),
  ).toBe(LEGACY_APPEARANCE_SVG_SHA256);
  expect(renderFigureSvg(loadedDocument.value.templateSnapshot, data)).toEqual(
    rendered,
  );
  expect(withoutMigratedPlainText(loadedTemplate.value)).toEqual(
    expectedTemplate,
  );
  expect({ template, document }).toEqual(original);
});
