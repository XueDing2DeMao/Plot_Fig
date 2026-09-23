import { describe, expect, it } from 'vitest';
import { defaultTemplate } from './default-template.js';
import { applyFigureDetails, readFigureDetails } from './figure-details.js';

describe('F7.1 文字布局属性往返', () => {
  it('保留轴标题、刻度标签和图例的格式与布局', () => {
    const source = defaultTemplate();
    const sourcePanel = source.panels[0]!;
    const plot = sourcePanel.plotSlots[0]!;
    const xAxis = sourcePanel.axes.find(
      (axis) => axis.axisId === plot.xAxisId,
    )!;
    xAxis.title = {
      ...xAxis.title!,
      format: 'latex',
      text: String.raw`E=mc^2`,
      layout: {
        align: 'center',
        wrapWidthPt: 120,
        lineHeight: 1.4,
        paddingPt: { top: 2, right: 3, bottom: 2, left: 3 },
        background: '#ffffff',
        border: { widthPt: 1, color: '#333333' },
      },
    };
    xAxis.tickLabels = {
      ...xAxis.tickLabels,
      textFormat: 'rich',
      layout: {
        align: 'right',
        paddingPt: { top: 1, right: 1, bottom: 1, left: 1 },
      },
    };
    plot.legendEntry = {
      ...plot.legendEntry,
      format: 'rich',
      text: String.raw`CO_{2}`,
    };

    const details = readFigureDetails(source, plot.plotSlotId);
    const target = defaultTemplate();
    applyFigureDetails(target, plot.plotSlotId, details);
    const resultPanel = target.panels[0]!;
    const resultPlot = resultPanel.plotSlots[0]!;
    const resultAxis = resultPanel.axes.find(
      (axis) => axis.axisId === resultPlot.xAxisId,
    )!;

    expect(resultAxis.title?.format).toBe(xAxis.title?.format);
    expect(resultAxis.title?.layout).toEqual(xAxis.title?.layout);
    expect(resultAxis.tickLabels).toEqual(xAxis.tickLabels);
    expect(resultPlot.legendEntry).toEqual(plot.legendEntry);
  });
});
