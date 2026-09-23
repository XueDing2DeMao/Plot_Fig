import { expect, it } from 'vitest';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { createCurrentDocument } from '../../../tests/helpers/figure-payloads.js';
import { renderFigureSvg } from './index.js';
import { loadFigurePayload } from '@plot-fig/figure-migrations';
import {
  validateFigureTemplate,
  validateFigureDocument,
} from '@plot-fig/figure-schema';
import { lineSymbolGapRadius } from './xy-line-extras.js';
import { advancedMarkerRadius } from './marker-appearance.js';

it('正式主图与图例使用扩展符号、旋转及跟随透明度', () => {
  const template = chartTemplate('xy'),
    plot = template.panels[0]!.plotSlots[0]!;
  Object.assign(plot, {
    mode: 'line-markers',
    lineStyle: {
      visible: true,
      color: '#224466',
      widthPt: 1,
      dash: 'solid',
      opacity: 0.6,
    },
    markerStyle: {
      visible: true,
      shape: 'star',
      sizePt: 8,
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidthPt: 1,
      rotationDeg: -22.5,
      opacity: 0.3,
      followLineOpacity: true,
    },
  });
  expect(validateFigureTemplate(template).ok).toBe(true);
  const result = renderFigureSvg(
    template,
    chartData({ x: [1, 2, 3], y: [2, 3, 2] }),
  );
  expect(result.svg).toContain('data-role="marker" transform="rotate(22.5');
  expect(result.svg).toMatch(/data-role="legend-marker"[^>]*opacity="0.6"/);
  expect(
    result.svg.match(/data-role="marker"[^>]*opacity="0.6"/g),
  ).toHaveLength(3);
});
it('自定义符号必须通过真实几何验证，文档快照也一样', () => {
  const template = chartTemplate('xy');
  Object.assign(template.panels[0]!.plotSlots[0]!.markerStyle!, {
    shape: 'custom',
    customVertices: [
      [-1, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
    ],
  });
  expect(validateFigureTemplate(template).ok).toBe(false);
  const doc = createCurrentDocument();
  doc.templateSnapshot = template;
  expect(validateFigureDocument(doc).ok).toBe(false);
});
it('从1.12迁移只改版本且保留旧图SVG，不允许新参数冒充旧格式', () => {
  const old = chartTemplate('xy');
  (old as any).schemaVersion = '1.12.0';
  const result = loadFigurePayload(old);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.schemaVersion).toBe('1.21.0');
  expect({ ...result.value, schemaVersion: '1.12.0' }).toEqual(old);
  Object.assign(old.panels[0]!.plotSlots[0]!.markerStyle!, { rotationDeg: 10 });
  expect(loadFigurePayload(old).ok).toBe(false);
});
it('旋转和自定义多边形的线条间隙覆盖完整描边', () => {
  const marker: any = {
    visible: true,
    shape: 'custom',
    customVertices: [
      [0, -1],
      [1, 1],
      [-1, 1],
    ],
    sizePt: 10,
    fill: 'none',
    stroke: '#000000',
    strokeWidthPt: 3,
    rotationDeg: 45,
  };
  const line = {
    visible: true,
    color: '#000000',
    widthPt: 2,
    dash: 'solid',
  } as const;
  expect(lineSymbolGapRadius(line, marker, 25)).toBeGreaterThan(
    advancedMarkerRadius(marker) + 2.5,
  );
});
