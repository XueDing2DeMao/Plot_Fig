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

  it('在标题旁展示应用状态，并保持待应用和错误提示及操作可见', () => {
    const onConfirm = vi.fn();
    const onReset = vi.fn();
    const props = {
      lineDash: 'solid' as const,
      markerShape: 'circle' as const,
      onLineDashChange: vi.fn(),
      onMarkerShapeChange: vi.fn(),
      onConfirm,
      onReset,
    };
    const view = render(<PlotSettingsPanel {...props} hasFigure pending />);

    expect(
      screen.getByRole('heading', { name: '图形设置', level: 2 }),
    ).toBeVisible();
    expect(screen.getByText('待应用', { exact: true })).toBeVisible();
    const help = screen.getByText('使用说明').closest('details')!;
    expect(help).not.toHaveAttribute('open');
    const pendingHint = screen.getByText(/设置尚未应用/);
    expect(pendingHint).toBeVisible();
    expect(help).not.toContainElement(pendingHint);
    const reset = screen.getByRole('button', { name: '重置待绘图设置' });
    expect(reset).toHaveTextContent(/^重置$/);
    expect(reset).toBeEnabled();
    fireEvent.click(reset);
    fireEvent.click(screen.getByRole('button', { name: '应用修改' }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();

    view.rerender(
      <PlotSettingsPanel {...props} hasFigure error="无法应用当前数据列" />,
    );
    expect(screen.getByText('应用失败', { exact: true })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('无法应用当前数据列');
    expect(screen.getByRole('alert')).toBeVisible();
    expect(help).not.toContainElement(screen.getByRole('alert'));
    expect(
      screen.getByRole('button', { name: '重置待绘图设置' }),
    ).toBeEnabled();

    view.rerender(<PlotSettingsPanel {...props} hasFigure />);
    expect(screen.getByText('已应用', { exact: true })).toBeVisible();
    expect(
      screen.getByRole('button', { name: '重置待绘图设置' }),
    ).toBeDisabled();
    view.rerender(<PlotSettingsPanel {...props} />);
    expect(screen.getByText('待生成', { exact: true })).toBeVisible();
    expect(screen.getByRole('button', { name: '生成图形' })).toBeEnabled();
  });

  it('默认收起使用说明并允许展开查看绘图规则', () => {
    render(
      <PlotSettingsPanel
        lineDash="solid"
        markerShape="circle"
        onLineDashChange={vi.fn()}
        onMarkerShapeChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    const summary = screen.getByText('使用说明');
    const help = summary.closest('details')!;
    expect(summary.tagName).toBe('SUMMARY');
    expect(help).not.toHaveAttribute('open');
    const appearanceHelp = within(help).getByText(/线型和标记符号可组合使用/);
    const applyHelp = within(help).getByText(/当前图层的数据组/);
    expect(appearanceHelp).not.toBeVisible();
    expect(applyHelp).not.toBeVisible();
    fireEvent.click(summary);
    expect(help).toHaveAttribute('open');
    expect(appearanceHelp).toBeVisible();
    expect(applyHelp).toBeVisible();
  });
});
