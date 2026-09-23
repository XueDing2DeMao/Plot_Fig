import { describe, expect, it } from 'vitest';
import { defaultTemplate } from './default-template.js';
import { assertTemplate } from './publication-utils.js';
import { layerBounds } from './page-geometry.js';
import {
  convertLength,
  pageRect,
  contentRect,
  resizePageLayers,
  readFrame,
  writeFrame,
  fitPageToBounds,
  fitLayersToBounds,
} from './page-geometry.js';

describe('图页与图层几何', () => {
  it('适配排除隐藏图层并保留其归一化位置', () => {
    const template = defaultTemplate();
    const hidden = structuredClone(template.panels[0]!);
    hidden.panelId = 'hidden';
    hidden.visible = false;
    hidden.frame = { x: 0, y: 0, width: 1, height: 1 };
    template.panels.push(hidden);
    expect(layerBounds(template)).toHaveLength(1);
    expect(
      fitPageToBounds(template, layerBounds(template)[0]!).panels[1]!.frame,
    ).toEqual(hidden.frame);
    expect(
      fitLayersToBounds(template, layerBounds(template)[0]!, true).panels[1]!
        .frame,
    ).toEqual(hidden.frame);
  });
  it('零边距适配不因归一化舍入误差被判越界', () => {
    const template = defaultTemplate();
    template.page.size.width.value = 74;
    const next = fitPageToBounds(template, layerBounds(template)[0]!);
    expect(() => assertTemplate(next)).not.toThrow();
    expect(next.panels[0]!.frame).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });
  it('所有单位往返保持物理尺寸', () => {
    for (const unit of ['mm', 'cm', 'in', 'px'] as const) {
      const length = convertLength({ value: 25.4, unit: 'mm' }, unit);
      expect(convertLength(length, 'in').value).toBeCloseTo(1, 12);
    }
  });
  it('切换单位不修改图层；保留尺寸模式维持实际位置与宽高', () => {
    const before = defaultTemplate(),
      next = structuredClone(before);
    next.page.size.width.value *= 2;
    const preserved = resizePageLayers(before, next, true);
    expect(preserved.panels[0]!.frame.x).toBeCloseTo(
      before.panels[0]!.frame.x / 2,
    );
    expect(preserved.panels[0]!.frame.width).toBeCloseTo(
      before.panels[0]!.frame.width / 2,
    );
    expect(resizePageLayers(before, next, false).panels).toEqual(before.panels);
    expect(before).toEqual(defaultTemplate());
  });
  it('边距参考与绝对单位往返；换参考不改变底层坐标', () => {
    const template = defaultTemplate();
    for (const reference of ['page', 'content'] as const)
      for (const unit of ['%', 'mm', 'cm', 'in', 'px'] as const) {
        const value = readFrame(
          template.panels[0]!.frame,
          template.page,
          unit,
          reference,
        );
        const frame = writeFrame(value, template.page, unit, reference);
        for (const key of ['x', 'y', 'width', 'height'] as const)
          expect(frame[key]).toBeCloseTo(template.panels[0]!.frame[key], 12);
      }
  });
  it('拒绝边距耗尽页面', () => {
    const template = defaultTemplate();
    template.page.margins.left = pageRect(template.page).width;
    expect(() => contentRect(template.page)).toThrow('边距');
  });
  it('图页适配保留物理图层大小且包含图层边框', () => {
    const template = defaultTemplate();
    const old = readFrame(
      template.panels[0]!.frame,
      template.page,
      'px',
      'page',
    );
    const next = fitPageToBounds(template, {
      x: -20,
      y: -10,
      width: 2100,
      height: 1500,
    });
    const current = readFrame(next.panels[0]!.frame, next.page, 'px', 'page');
    expect(current.width).toBeCloseTo(old.width);
    expect(current.height).toBeCloseTo(old.height);
    expect(current.x).toBeGreaterThan(old.x);
  });
  it('图页适配平移页级注释，图层适配保留页级注释与样式', () => {
    const template = defaultTemplate();
    template.annotations.push({
      annotationId: 'page-text',
      kind: 'text',
      coordinateSpace: 'page',
      position: { x: 0.25, y: 0.75 },
      text: 'Title',
      format: 'plain',
    });
    const before = pageRect(template.page),
      m = template.page.margins;
    const next = fitPageToBounds(template, {
      x: -20,
      y: -10,
      width: 2100,
      height: 1500,
    });
    const annotation = next.annotations[0]!;
    if (annotation.kind !== 'text') throw new Error('expected text');
    expect(annotation.position.x * pageRect(next.page).width).toBeCloseTo(
      0.25 * before.width + 20 + m.left,
    );
    expect(
      (1 - annotation.position.y) * pageRect(next.page).height,
    ).toBeCloseTo(0.25 * before.height + 10 + m.top);
    expect(
      fitLayersToBounds(
        template,
        { x: 0, y: 0, width: 2000, height: 2000 },
        false,
      ).annotations,
    ).toEqual(template.annotations);
  });
  it('图层适配保持页面与坐标轴范围，支持保持比例', () => {
    const template = defaultTemplate();
    const bounds = { x: 0, y: 0, width: 1000, height: 1000 };
    const result = fitLayersToBounds(template, bounds, true);
    expect(result.page).toEqual(template.page);
    expect(result.panels[0]!.axes).toEqual(template.panels[0]!.axes);
    const old = template.panels[0]!.frame,
      next = result.panels[0]!.frame;
    expect(next.width / old.width).toBeCloseTo(next.height / old.height);
  });
});
