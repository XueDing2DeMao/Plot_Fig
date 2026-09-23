// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlotSettingsPanel } from './PlotSettingsPanel.js';

describe('PlotSettingsPanel', () => {
  afterEach(cleanup);

  it('用图示展示线型和标记符号，并反映当前选择', () => {
    render(
      <PlotSettingsPanel
        lineDash="dashed"
        markerShape="diamond"
        onLineDashChange={vi.fn()}
        onMarkerShapeChange={vi.fn()}
      />,
    );

    const line = screen.getByRole('radio', { name: '线型：虚线' });
    const marker = screen.getByRole('radio', { name: '标记符号：菱形' });
    expect(line).toBeChecked();
    expect(marker).toBeChecked();
    expect(line.closest('label')?.querySelector('svg')).toBeInTheDocument();
    expect(marker.closest('label')?.querySelector('svg')).toBeInTheDocument();
    for (const option of screen.getAllByRole('radio'))
      expect(option.closest('label')?.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByLabelText('绘制方式')).not.toBeInTheDocument();
  });

  it('分别提交线型和标记符号选择', () => {
    const onLineDashChange = vi.fn();
    const onMarkerShapeChange = vi.fn();
    render(
      <PlotSettingsPanel
        lineDash="none"
        markerShape="circle"
        onLineDashChange={onLineDashChange}
        onMarkerShapeChange={onMarkerShapeChange}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: '线型：点划线' }));
    fireEvent.click(screen.getByRole('radio', { name: '标记符号：五角星' }));

    expect(onLineDashChange).toHaveBeenCalledWith('dash-dot');
    expect(onMarkerShapeChange).toHaveBeenCalledWith('star');
  });

  it('保留键盘焦点和分组语义', () => {
    render(
      <PlotSettingsPanel
        lineDash="solid"
        markerShape="none"
        onLineDashChange={vi.fn()}
        onMarkerShapeChange={vi.fn()}
      />,
    );
    const line = screen.getByRole('radio', { name: '线型：实线' });

    line.focus();
    expect(line).toHaveFocus();
    expect(screen.getByRole('group', { name: '线型' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '标记符号' })).toBeInTheDocument();
  });

  it('图表类型全部使用中文，并保持多轴图的绘制方式可见', () => {
    const onChoice = vi.fn();
    render(
      <PlotSettingsPanel
        lineDash="solid"
        markerShape="circle"
        onLineDashChange={vi.fn()}
        onMarkerShapeChange={vi.fn()}
        choice="double-y"
        onChoice={onChoice}
      />,
    );

    const typeOptions = within(screen.getByLabelText('图表类型')).getAllByRole(
      'option',
    );
    expect(typeOptions.map((option) => option.textContent)).toEqual([
      '选择统一图表类型',
      '折线图',
      '散点图',
      '柱形图',
      '堆叠柱形图',
      '直方图',
      '箱线图',
      '面积图',
      '热力图',
      '等值线图',
      '双纵轴图',
      '三纵轴图',
      '四纵轴图',
      '上下共享横轴图',
    ]);
    expect(
      typeOptions.every((option) => !/[A-Za-z]/.test(option.textContent ?? '')),
    ).toBe(true);
    expect(screen.getByRole('group', { name: '线型' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '标记符号' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('图表类型'), {
      target: { value: 'quad-y' },
    });
    expect(onChoice).toHaveBeenCalledWith('quad-y');
  });

  it('二维曲线绘制方式不一致时仍显示外观选择器', () => {
    render(
      <PlotSettingsPanel
        lineDash="solid"
        markerShape="circle"
        onLineDashChange={vi.fn()}
        onMarkerShapeChange={vi.fn()}
        choice=""
        appearanceAvailable
      />,
    );

    expect(screen.getByRole('group', { name: '线型' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '标记符号' })).toBeInTheDocument();
  });
});
