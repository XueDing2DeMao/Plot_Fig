// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from './default-template.js';
import {
  inlineChartTextTarget,
  updateInlineChartText,
  type InlineChartTextTarget,
} from './inline-chart-text.js';
import type { WorkspaceEditor } from './workspace-editor.js';

function editor(): WorkspaceEditor {
  const template = defaultTemplate();
  const panel = template.panels[0]!;
  for (const axis of panel.axes) {
    axis.title = {
      format: 'plain',
      text: axis.position,
      fontFamily: '宋体',
      fontSizePt: 14,
      color: '#123456',
      bold: true,
    };
  }
  panel.plotSlots[0]!.legendEntry = { visible: true, text: '曲线一' };
  return { template, workspace: emptyWorkspace() };
}

function svgElement(markup: string, selector: string): Element {
  const document = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,
    'image/svg+xml',
  );
  return document.querySelector(selector)!;
}

describe('图片文字目标', () => {
  it('从轴标题子元素解析具体图层和坐标轴', () => {
    const model = editor();
    const element = svgElement(
      '<g data-panel-id="panel-main"><g data-axis-id="frame-y"><text data-role="axis-title"><tspan>右纵轴</tspan></text></g></g>',
      'tspan',
    );

    expect(inlineChartTextTarget(model.template, element)).toEqual({
      kind: 'axis-title',
      panelId: 'panel-main',
      axisId: 'frame-y',
    });
  });

  it('只在图例文字上解析对应曲线', () => {
    const model = editor();
    const text = svgElement(
      '<g data-panel-id="panel-main"><g data-role="legend-entry" data-plot-slot-id="series-1"><rect/><text>曲线一</text></g></g>',
      'text',
    );
    const marker = text.parentElement!.querySelector('rect')!;

    expect(inlineChartTextTarget(model.template, text)).toEqual({
      kind: 'legend-entry',
      panelId: 'panel-main',
      plotSlotId: 'series-1',
    });
    expect(inlineChartTextTarget(model.template, marker)).toBeNull();
  });

  it('从公式图例的路径子元素解析对应曲线', () => {
    const model = editor();
    const path = svgElement(
      '<g data-panel-id="panel-main"><g data-role="legend-entry" data-plot-slot-id="series-1"><rect data-role="legend-sample"/><g data-role="legend-label"><svg><path/></svg></g></g></g>',
      'path',
    );
    const marker = path
      .closest('[data-role="legend-entry"]')!
      .querySelector('[data-role="legend-sample"]')!;

    expect(inlineChartTextTarget(model.template, path)).toEqual({
      kind: 'legend-entry',
      panelId: 'panel-main',
      plotSlotId: 'series-1',
    });
    expect(inlineChartTextTarget(model.template, marker)).toBeNull();
  });
});

describe('图片文字更新', () => {
  it.each([
    ['axis-x', '下横轴'],
    ['frame-x', '上横轴'],
    ['axis-y', '左纵轴'],
    ['frame-y', '右纵轴'],
  ])('单独修改 %s 并保留标题样式', (axisId, text) => {
    const model = editor();
    const before = structuredClone(model.template.panels[0]!.axes);
    const target: InlineChartTextTarget = {
      kind: 'axis-title',
      panelId: 'panel-main',
      axisId,
    };

    const updated = updateInlineChartText(model, target, text);
    const axes = updated.template.panels[0]!.axes;
    const index = axes.findIndex((axis) => axis.axisId === axisId);

    expect(axes[index]!.title).toEqual({
      ...before[index]!.title,
      text,
    });
    expect(axes.filter((_, candidate) => candidate !== index)).toEqual(
      before.filter((_, candidate) => candidate !== index),
    );
    expect(updated).not.toBe(model);
  });

  it('手动修改轴名后清除自动名称标记并保留其他扩展', () => {
    const model = editor();
    const axis = model.template.panels[0]!.axes[0]!;
    axis.extensions = {
      origin: {
        future: { enabled: true },
        plotFigAutoAxisTitle: {
          plotSlotId: 'series-1',
          role: 'x',
          text: '自动名称',
        },
      },
    };

    const updated = updateInlineChartText(
      model,
      {
        kind: 'axis-title',
        panelId: 'panel-main',
        axisId: 'axis-x',
      },
      '手动名称',
    );
    const origin = updated.template.panels[0]!.axes[0]!.extensions!
      .origin as Record<string, unknown>;

    expect(origin).not.toHaveProperty('plotFigAutoAxisTitle');
    expect(origin.future).toEqual({ enabled: true });
  });

  it('只修改指定曲线的图例名称', () => {
    const model = editor();
    const panel = model.template.panels[0]!;
    const second = structuredClone(panel.plotSlots[0]!);
    second.plotSlotId = 'series-2';
    second.legendEntry.text = '曲线二';
    panel.plotSlots.push(second);

    const updated = updateInlineChartText(
      model,
      {
        kind: 'legend-entry',
        panelId: 'panel-main',
        plotSlotId: 'series-2',
      },
      '温度曲线',
    );

    expect(
      updated.template.panels[0]!.plotSlots.map(
        (plot) => plot.legendEntry.text,
      ),
    ).toEqual(['曲线一', '温度曲线']);
  });
});
