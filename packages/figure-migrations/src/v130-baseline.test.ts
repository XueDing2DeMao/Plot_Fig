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

// 固定 1.3.0 的增量、目标数量、对数锚点与端点刻度输出，后续迁移不能重写。
const LEGACY_GENERATION_SVG_SHA256 =
  '1b2a148ac92c965c79147bb3fcb9816d482956c66b87c96735ef1a27b453750c';

async function fixture(kind: 'template' | 'document') {
  return JSON.parse(
    await readFile(
      new URL(
        `../../../tests/fixtures/migrations/figure-${kind}-v1.3.0.json`,
        import.meta.url,
      ),
      'utf8',
    ),
  );
}

// 完整历史迁移链首次编译多个冻结校验器；本用例校验兼容内容和 SVG 摘要，不是性能阈值测试。
it(
  'preserves fixed 1.3 fixtures and their explicit tick generation SVG',
  { timeout: 15000 },
  async () => {
    const [template, document] = await Promise.all([
      fixture('template'),
      fixture('document'),
    ]);
    const original = structuredClone({ template, document });
    expect(template.schemaVersion).toBe('1.3.0');
    expect(document.schemaVersion).toBe('1.3.0');
    expect(document.templateSnapshot).toEqual(template);
    expect(
      template.panels[0].axes.map(
        (axis: { majorTicks: { generation: unknown } }) =>
          axis.majorTicks.generation,
      ),
    ).toEqual([
      { mode: 'increment', step: 0.2, anchor: 0.1 },
      { mode: 'count', count: 6, anchor: 0.2 },
      { mode: 'increment', step: 1, anchor: 1 },
      { mode: 'endpoints' },
    ]);

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
      throw new Error('Legacy 1.3 fixture loading failed');

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
    if (!rendered.ok) throw new Error('Legacy 1.3 rendering failed');
    expect(rendered.diagnostics).toEqual([]);
    expect(
      createHash('sha256')
        .update(withoutAxisIdentityGroups(rendered.svg))
        .digest('hex'),
    ).toBe(LEGACY_GENERATION_SVG_SHA256);
    expect(
      renderFigureSvg(loadedDocument.value.templateSnapshot, data),
    ).toEqual(rendered);
  },
);
