// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultTemplate } from '../state/default-template.js';
import { FigurePreview } from './FigurePreview.js';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
  <g data-panel-id="panel-main">
    <g data-axis-id="axis-x">
      <line data-role="axis-line" x1="0" y1="0" x2="100" y2="0" />
      <text data-role="axis-title" x="50" y="20">时间</text>
    </g>
    <g data-axis-id="frame-y">
      <text data-role="axis-title" x="430" y="150">右侧温度</text>
    </g>
    <g data-role="legend-entry" data-plot-slot-id="series-1">
      <rect width="10" height="10" />
      <text x="20" y="10">温度曲线</text>
    </g>
  </g>
</svg>`;

function setup() {
  const template = defaultTemplate();
  const axes = template.panels[0]!.axes;
  axes.find((axis) => axis.axisId === 'axis-x')!.title!.text = '时间';
  axes.find((axis) => axis.axisId === 'frame-y')!.title = {
    format: 'plain',
    text: '右侧温度',
    fontFamily: 'Arial',
    fontSizePt: 12,
    color: '#111111',
  };
  template.panels[0]!.plotSlots[0]!.legendEntry.visible = true;
  template.panels[0]!.plotSlots[0]!.legendEntry.text = '温度曲线';
  const onInlineTextChange = vi.fn();
  const onOpenObject = vi.fn();
  const view = render(
    <FigurePreview
      svg={svg}
      template={template}
      onInlineTextChange={onInlineTextChange}
      onOpenObject={onOpenObject}
    />,
  );
  return { ...view, onInlineTextChange, onOpenObject };
}

describe('图形图片内文字编辑', () => {
  afterEach(cleanup);

  it('双击坐标轴名称后显示输入框并按回车保存', () => {
    const { container, onInlineTextChange, onOpenObject } = setup();
    fireEvent.doubleClick(container.querySelector('[data-role="axis-title"]')!);

    const input = screen.getByLabelText('修改坐标轴名称');
    expect(input).toHaveValue('时间');
    fireEvent.change(input, { target: { value: '采样时间' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onInlineTextChange).toHaveBeenCalledWith(
      {
        kind: 'axis-title',
        panelId: 'panel-main',
        axisId: 'axis-x',
      },
      '采样时间',
    );
    expect(screen.queryByLabelText('修改坐标轴名称')).not.toBeInTheDocument();
    expect(onOpenObject).not.toHaveBeenCalled();
  });

  it('点击输入框外部时保存图例名称', () => {
    const { container, onInlineTextChange } = setup();
    fireEvent.doubleClick(
      container.querySelector('[data-role="legend-entry"] text')!,
    );
    const input = screen.getByLabelText('修改图例名称');
    expect(input).toHaveValue('温度曲线');

    fireEvent.change(input, { target: { value: '传感器一' } });
    fireEvent.blur(input);

    expect(onInlineTextChange).toHaveBeenCalledWith(
      {
        kind: 'legend-entry',
        panelId: 'panel-main',
        plotSlotId: 'series-1',
      },
      '传感器一',
    );
    expect(screen.queryByLabelText('修改图例名称')).not.toBeInTheDocument();
  });

  it('按退出键取消修改', () => {
    const { container, onInlineTextChange } = setup();
    fireEvent.doubleClick(container.querySelector('[data-role="axis-title"]')!);
    const input = screen.getByLabelText('修改坐标轴名称');
    fireEvent.change(input, { target: { value: '不保存' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onInlineTextChange).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('修改坐标轴名称')).not.toBeInTheDocument();
  });

  it('双击非文字图形对象时继续打开原属性界面', () => {
    const { container, onOpenObject } = setup();
    fireEvent.doubleClick(container.querySelector('[data-role="axis-line"]')!);

    expect(onOpenObject).toHaveBeenCalledWith({
      kind: 'axis',
      panelId: 'panel-main',
      axisId: 'axis-x',
    });
    expect(screen.queryByLabelText('修改坐标轴名称')).not.toBeInTheDocument();
  });

  it('坐标轴名称超出图形命中范围时仍可在可见文字处双击修改', () => {
    const { container, onInlineTextChange } = setup();
    const stage = screen.getByTestId('svg-preview');
    const rightTitle = container.querySelectorAll(
      '[data-role="axis-title"]',
    )[1]!;
    vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 400,
      top: 0,
      bottom: 300,
      width: 400,
      height: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(rightTitle, 'getBoundingClientRect').mockReturnValue({
      left: 420,
      right: 440,
      top: 140,
      bottom: 160,
      width: 20,
      height: 20,
      x: 420,
      y: 140,
      toJSON: () => ({}),
    });

    fireEvent.doubleClick(document.body, { clientX: 430, clientY: 150 });

    const input = screen.getByLabelText('修改坐标轴名称');
    expect(input).toHaveValue('右侧温度');
    fireEvent.change(input, { target: { value: '右轴名称' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onInlineTextChange).toHaveBeenCalledWith(
      {
        kind: 'axis-title',
        panelId: 'panel-main',
        axisId: 'frame-y',
      },
      '右轴名称',
    );
  });

  it('双击公式路径时编辑模型源码，并用 Ctrl+Enter 保存多行内容', () => {
    const template = defaultTemplate();
    template.panels[0]!.axes[0]!.title = {
      format: 'auto',
      text: String.raw`$E=mc^2$`,
      fontFamily: 'STIX Two Text',
      fontSizePt: 12,
      color: '#111111',
    };
    template.panels[0]!.plotSlots[0]!.legendEntry = {
      visible: true,
      text: String.raw`x_{1}`,
      format: 'auto',
    };
    const formulaSvg = `<svg xmlns="http://www.w3.org/2000/svg">
      <g data-panel-id="panel-main">
        <g data-axis-id="axis-x"><g data-role="axis-title"><svg><path data-formula="axis"/></svg></g></g>
        <g data-role="legend-entry" data-plot-slot-id="series-1"><rect data-role="legend-sample"/><g data-role="legend-label"><svg><path data-formula="legend"/></svg></g></g>
      </g>
    </svg>`;
    const onInlineTextChange = vi.fn();
    const { container } = render(
      <FigurePreview
        svg={formulaSvg}
        template={template}
        onInlineTextChange={onInlineTextChange}
      />,
    );

    fireEvent.doubleClick(container.querySelector('[data-formula="axis"]')!);
    const axisEditor = screen.getByLabelText('修改坐标轴名称');
    expect(axisEditor).toHaveValue(String.raw`$E=mc^2$`);
    fireEvent.change(axisEditor, {
      target: { value: '$E=mc^2$\n$\\text{J}$' },
    });
    fireEvent.keyDown(axisEditor, { key: 'Enter' });
    expect(onInlineTextChange).not.toHaveBeenCalled();
    fireEvent.keyDown(axisEditor, { key: 'Enter', ctrlKey: true });
    expect(onInlineTextChange).toHaveBeenCalledWith(
      { kind: 'axis-title', panelId: 'panel-main', axisId: 'axis-x' },
      '$E=mc^2$\n$\\text{J}$',
    );

    fireEvent.doubleClick(container.querySelector('[data-formula="legend"]')!);
    expect(screen.getByLabelText('修改图例名称')).toHaveValue(
      String.raw`x_{1}`,
    );
  });
});
