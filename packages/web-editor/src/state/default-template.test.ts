import { describe, expect, it } from 'vitest';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import {
  defaultTemplate,
  loadCsvText,
  restoreProjectState,
} from './editor-state.js';
import { serializeProjectFile } from './project-file.js';

describe('modern Origin-inspired defaults', () => {
  it('uses automatic decimal labels and explicit Origin-style auto ranges', () => {
    const axes = defaultTemplate().panels[0]!.axes;
    for (const axis of axes) {
      expect(axis.range).toEqual({ mode: 'auto' });
      expect(axis.tickLabels).toMatchObject({
        notation: 'auto',
        precision: 6,
      });
    }
    for (const axis of axes.slice(0, 2))
      expect(axis.rescale).toEqual({
        mode: 'auto',
        nice: true,
        margin: { minPercent: 8, maxPercent: 8 },
      });
  });

  it.each([
    ['sub-unit', 'X,Y\n0.1,0.2\n0.3,0.8'],
    ['negative', 'X,Y\n-2.7,-0.9\n0.8,0.4'],
    ['large', 'X,Y\n0.1,1.2\n1000000.5,2000000.7'],
    ['constant', 'X,Y\n0.3,-0.3\n0.3,-0.3'],
  ])('默认%s数据使用自动位数且刻度标签保持唯一', (kind, csv) => {
    const { svg } = loadCsvText(csv, 'integer.csv', defaultTemplate());
    expect(svg).toBeDefined();
    for (const dimension of ['x', 'y']) {
      const axisSvg = svg!.match(
        new RegExp(`<g data-role="axis-${dimension}"[^>]*>(.*?)</g>`),
      )![1]!;
      const labels = [
        ...axisSvg.matchAll(/<text data-role="tick-label"[^>]*>(.*?)<\/text>/g),
      ].map((match) => match[1]!);
      expect(labels.length).toBeGreaterThanOrEqual(2);
      expect(labels.length).toBeLessThanOrEqual(10);
      expect(
        labels.every((label) => /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/.test(label)),
      ).toBe(true);
      expect(new Set(labels).size).toBe(labels.length);
      expect(labels).not.toContain('-0');
      if (kind === 'sub-unit')
        expect(labels.some((label) => label.includes('.'))).toBe(true);
    }
  });

  it('将 8% 自动边距向外对齐到合理的线性刻度范围', () => {
    const { svg } = loadCsvText(
      'X,Y\n0.1,0.2\n0.3,0.8',
      'nice-range.csv',
      defaultTemplate(),
    );
    const xAxis = svg!.match(/<g data-role="axis-x"[^>]*>(.*?)<\/g>/)![1]!;
    const labels = [
      ...xAxis.matchAll(/<text data-role="tick-label"[^>]*>(.*?)<\/text>/g),
    ].map((match) => match[1]!);
    expect(labels[0]).toBe('0.05');
    expect(labels.at(-1)).toBe('0.35');
  });

  it('允许手动切回小数刻度', () => {
    const template = defaultTemplate();
    const x = template.panels[0]!.axes[0]!;
    x.tickLabels.notation = 'fixed';
    x.tickLabels.precision = 2;
    x.range = { mode: 'fixed', min: 0.1, max: 0.3 };
    x.majorTicks.generation = { mode: 'increment', step: 0.1 };
    const { svg } = loadCsvText('X,Y\n0.1,1\n0.3,2', 'decimal.csv', template);
    expect(svg).toContain('>0.10</text>');
    expect(svg).toContain('>0.20</text>');
    expect(svg).toContain('>0.30</text>');
  });
  it('renders a monochrome framed plot with legible physical typography', () => {
    const template = defaultTemplate();
    expect(validateFigureTemplate(template).ok).toBe(true);
    const { svg } = loadCsvText('X,Y\n0,1\n1,2\n2,4', 'xy.csv', template);
    expect(svg).toContain('width="180mm" height="120mm"');
    expect(svg?.match(/data-role="axis-line"/g)).toHaveLength(4);
    expect(svg?.match(/data-role="axis-title"/g)).toHaveLength(2);
    expect(svg).toContain('font-family="Arial" font-size="10"');
    expect(svg).toContain('stroke="#515151"');
    expect(svg).toContain('<rect data-role="marker"');
    expect(svg).not.toContain('data-role="legend"');
  });

  it('keeps default templates independent and preserves saved custom styles', () => {
    const template = defaultTemplate();
    template.panels[0]!.axes[0]!.tickLabels.color = '#123456';
    template.page.size.width.value = 89;
    const data = loadCsvText('X,Y\n0,1\n1,2', 'xy.csv', template);
    const restored = restoreProjectState(
      serializeProjectFile(template, data.data!, data.sourceText!),
    );
    expect(restored.ok).toBe(true);
    if (!restored.ok) throw new Error('restore failed');
    expect(restored.template).toEqual(template);
    expect(defaultTemplate().panels[0]!.axes[0]!.tickLabels.color).toBe(
      '#000000',
    );
  });
});
