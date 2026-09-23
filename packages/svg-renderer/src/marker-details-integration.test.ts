import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadFigurePayload } from '@plot-fig/figure-migrations';
import {
  validateFigureTemplate,
  type FigureTemplate,
  type XyPlot,
} from '@plot-fig/figure-schema';
import { renderFigureSvg } from './index.js';
import { markerSourceForPlot } from './marker-mapped-plot.js';
const artifact = (f: string) =>
  new URL('../../../artifacts/F4.3C/' + f, import.meta.url);
const old = JSON.parse(
  readFileSync(artifact('formal-v1.15-baseline.json'), 'utf8'),
);
function setup() {
  const loaded = loadFigurePayload(old.template);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
  return {
    template: loaded.value as FigureTemplate,
    data: structuredClone(old.data),
  };
}
it('1.15迁移只升级版本且保持已有SVG逐字节不变', () => {
  const { template, data } = setup();
  expect(template).toEqual({ ...old.template, schemaVersion: '1.21.0' });
  const r = renderFigureSvg(template, data);
  expect(r.ok).toBe(true);
  if (r.ok)
    expect(r.svg).toBe(
      readFileSync(artifact('formal-v1.15-baseline.svg'), 'utf8'),
    );
  const forged = structuredClone(old.template);
  forged.panels[0].plotSlots[0].markerDetails = { fillOnlyOpacity: true };
  expect(loadFigurePayload(forged).ok).toBe(false);
});
it('正式主图及默认图例显示同一原行字符、图例映射值与尺寸', () => {
  const { template, data } = setup(),
    p = template.panels[0]!.plotSlots[0]! as XyPlot;
  p.legendEntry.visible = true;
  p.markerDetails = {
    fixedSize: { value: 0.5, unit: 'x-data' },
    fillOnlyOpacity: true,
    strokeRadiusPct: 20,
    character: { mode: 'row-number', fontFamily: 'Arial', outline: 'box' },
    overlap: { direction: 'horizontal', gapPt: 2, center: true },
    legend: { rows: [1, 3], sizePt: 12 },
  };
  expect(validateFigureTemplate(template).ok).toBe(true);
  const r = renderFigureSvg(template, data);
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.svg).toContain('data-role="character-glyph"');
    expect(r.svg).toContain('data-source-row="3"');
    expect(r.svg).toContain('强度=-1');
    expect(r.svg).toContain('data-role="overlap-center"');
    expect(r.svg).toContain('fill-opacity="0.45"');
  }
});
it('严格拒绝不合法细节，数据缺失原行给出可理解错误', () => {
  const { template, data } = setup(),
    p = template.panels[0]!.plotSlots[0]! as XyPlot;
  for (const bad of [
    { fixedSize: { value: -1, unit: 'x-data' } },
    {
      character: {
        mode: 'constant',
        text: '\uffff',
        fontFamily: 'Arial',
        outline: 'none',
      },
    },
    { legend: { rows: [1, 1], sizePt: 12 } },
    { unknown: true },
  ]) {
    p.markerDetails = bad as never;
    expect(validateFigureTemplate(template).ok).toBe(false);
  }
  p.markerDetails = { legend: { rows: [99], sizePt: 12 } };
  const result = renderFigureSvg(template, data);
  expect(result.ok).toBe(false);
  expect(
    result.diagnostics.some((d) => d.message.includes('原始第 99 行')),
  ).toBe(true);
});
it('页面图例与图层图例使用相同原行样式，抽样不改变图例；大边框适应布局', () => {
  const { template, data } = setup(),
    p = template.panels[0]!.plotSlots[0]! as XyPlot;
  p.markerDetails = {
    strokeRadiusPct: 100,
    legend: { rows: [1, 3], sizePt: 36 },
  };
  template.annotations.push({
    kind: 'legend',
    annotationId: 'page-legend',
    coordinateSpace: 'page',
    visible: true,
    position: { x: 0.2, y: 0.8 },
  });
  const full = renderFigureSvg(template, data);
  expect(full.ok).toBe(true);
  if (!full.ok) return;
  p.dataView = { sampling: { mode: 'every', step: 2 }, sampleExport: true };
  const sampled = renderFigureSvg(template, data, { purpose: 'export' });
  expect(sampled.ok).toBe(true);
  if (!sampled.ok) return;
  const legend = (s: string) => s.slice(s.indexOf('<g data-role="legend"'));
  expect(legend(sampled.svg)).toBe(legend(full.svg));
  expect(full.svg).toContain('data-annotation-id="page-legend"');
  expect(full.svg).toContain('r="18"');
  expect(full.svg).toContain('stroke-width="18"');
});
it('零尺寸或全局隐藏符号时，图例也不会恢复基础圆形或单点显示覆盖', () => {
  const { template, data } = setup(),
    p = template.panels[0]!.plotSlots[0]! as XyPlot;
  p.legendEntry.visible = true;
  delete p.markerMapping;
  delete p.markerOverrides;
  p.markerDetails = { fixedSize: { value: 0, unit: 'x-data' } };
  let r = renderFigureSvg(template, data);
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.svg).not.toContain('data-role="legend-marker"');
  p.markerDetails = {
    fillOnlyOpacity: true,
    legend: { rows: [1], sizePt: 12 },
  };
  p.markerStyle!.visible = false;
  p.markerOverrides = {
    source: markerSourceForPlot(p, data)!,
    points: [{ row: 1, style: { visible: true } }],
  };
  r = renderFigureSvg(template, data);
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.svg).not.toContain('data-role="legend-marker"');
});
