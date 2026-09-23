import { withoutAxisIdentityGroups } from '../../../tests/helpers/figure-payloads.js';
import { withoutMigratedPlainText } from '../../../tests/helpers/figure-payloads.js';
import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadFigurePayload } from './index.js';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
const location = new URL('../../../artifacts/F4-complete/', import.meta.url),
  baseline = JSON.parse(
    readFileSync(new URL('baseline-1.16.json', location), 'utf8'),
  );
it('完整F4迁移只更新1.16版本，已应用的符号细节和旧SVG保持', () => {
  const before = structuredClone(baseline.template),
    r = loadFigurePayload(before);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(withoutMigratedPlainText(r.value)).toEqual({
    ...before,
    schemaVersion: '1.22.0',
  });
  expect(before).toEqual(baseline.template);
  const svg = renderFigureSvg(r.value as never, baseline.data);
  expect(svg.ok).toBe(true);
  if (svg.ok)
    expect(withoutAxisIdentityGroups(svg.svg)).toBe(
      readFileSync(new URL('baseline-1.16.svg', location), 'utf8'),
    );
});
it('旧版本不能伪装新F4字段', () => {
  const t = structuredClone(baseline.template);
  t.panels[0].plotSlots[0].dataLabels = { visible: true, source: 'row' };
  expect(loadFigurePayload(t).ok).toBe(false);
});
