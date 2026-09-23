// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AxisPropertiesDialog } from './AxisPropertiesDialog.js';
import { defaultTemplate } from '../state/default-template.js';

afterEach(cleanup);

it('shows the right-side drawing preview by default and allows it to collapse', () => {
  render(
    <AxisPropertiesDialog
      template={defaultTemplate()}
      panelId="panel-main"
      axisId="axis-x"
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );

  const dialog = screen.getByRole('dialog', { name: '坐标轴属性' });
  const body = dialog.querySelector('.property-dialog-body')!;
  const editor = body.querySelector('.axis-properties-dialog__editor')!;
  const preview = screen.getByLabelText('修改后的图形预览');
  expect(dialog).toHaveClass('property-dialog');
  expect(dialog).toHaveClass('has-preview');
  expect(body.children[0]).toBe(editor);
  expect(body.children[1]).toBe(preview);
  expect(preview).not.toHaveAttribute('hidden');

  fireEvent.click(screen.getByRole('button', { name: '收起预览' }));
  expect(dialog).not.toHaveClass('has-preview');
  expect(preview).toHaveAttribute('hidden');
});

it('uses the ten native categories, switches axes without losing edits, and disables Apply after applying', () => {
  const template = defaultTemplate();
  const onApply = vi.fn();
  render(
    <AxisPropertiesDialog
      template={template}
      panelId="panel-main"
      axisId="axis-x"
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );
  expect(
    within(screen.getByRole('tablist', { name: '坐标轴属性分类' }))
      .getAllByRole('tab')
      .map((tab) => tab.textContent),
  ).toEqual([
    '显示',
    '刻度',
    '刻度线标签',
    '标题',
    '网格',
    '轴线和刻度线',
    '特殊刻度线',
    '参照线',
    '断点',
    '轴须',
  ]);
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByRole('tab', { name: '标题' }));
  expect(screen.getByLabelText('X 轴标题文字格式')).toHaveValue('auto');
  fireEvent.change(screen.getByLabelText('X 轴标题'), {
    target: { value: '新 X 标题' },
  });
  fireEvent.click(screen.getByRole('button', { name: '左轴' }));
  fireEvent.change(screen.getByLabelText('Y 轴标题'), {
    target: { value: '新 Y 标题' },
  });
  fireEvent.click(screen.getByRole('button', { name: '下轴' }));
  expect(screen.getByLabelText('X 轴标题')).toHaveValue('新 X 标题');
  fireEvent.click(screen.getByRole('tab', { name: '刻度线标签' }));
  expect(
    within(screen.getByRole('tablist', { name: '刻度线标签分类' }))
      .getAllByRole('tab')
      .map((tab) => tab.textContent),
  ).toEqual(['显示', '格式', '表格式刻度标签', '次刻度线标签']);
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const axes = onApply.mock.calls[0]![0].panels[0].axes;
  expect(
    axes.find((axis: { axisId: string }) => axis.axisId === 'axis-x').title
      .text,
  ).toBe('新 X 标题');
  expect(
    axes.find((axis: { axisId: string }) => axis.axisId === 'axis-y').title
      .text,
  ).toBe('新 Y 标题');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
});

it('独立坐标轴窗口取消不会提交草稿', async () => {
  const template = defaultTemplate();
  const onApply = vi.fn();
  render(
    <AxisPropertiesDialog
      template={template}
      panelId="panel-main"
      axisId="axis-y"
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );
  await waitFor(() =>
    expect(
      screen.getByRole('dialog', { name: '坐标轴属性' }),
    ).toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole('tab', { name: '标题' }));
  const title = screen.getByLabelText('Y 轴标题');
  await screen.findByLabelText('Y 轴标题');
  fireEvent.change(title, { target: { value: '临时标题' } });
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(onApply).not.toHaveBeenCalled();
});

it('独立坐标轴窗口应用只更新指定轴', async () => {
  const template = defaultTemplate();
  const onApply = vi.fn();
  render(
    <AxisPropertiesDialog
      template={template}
      panelId="panel-main"
      axisId="axis-y"
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('tab', { name: '标题' }));
  await screen.findByLabelText('Y 轴标题');
  fireEvent.change(screen.getByLabelText('Y 轴标题'), {
    target: { value: 'Y 标题' },
  });
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  const applied = onApply.mock.calls[0]?.[0];
  expect(
    applied.panels[0].axes.find((a: any) => a.axisId === 'axis-y').title.text,
  ).toBe('Y 标题');
  expect(
    applied.panels[0].axes.find((a: any) => a.axisId === 'axis-x').title.text,
  ).not.toBe('Y 标题');
});

it('刻度页分别列出上下 X 轴和左右 Y 轴，并只修改选中的物理轴', () => {
  const template = defaultTemplate();
  const onApply = vi.fn();
  render(
    <AxisPropertiesDialog
      template={template}
      panelId="panel-main"
      axisId="axis-x"
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );

  const selector = screen.getByRole('navigation', { name: '坐标轴选择' });
  expect(
    within(selector)
      .getAllByRole('button')
      .map((button) => button.textContent),
  ).toEqual(['下 X 轴', '上 X 轴', '左 Y 轴', '右 Y 轴']);

  fireEvent.click(within(selector).getByRole('button', { name: '上 X 轴' }));
  fireEvent.change(screen.getByLabelText('X 轴最小值'), {
    target: { value: '10' },
  });
  fireEvent.change(screen.getByLabelText('X 轴最大值'), {
    target: { value: '20' },
  });
  fireEvent.click(within(selector).getByRole('button', { name: '右 Y 轴' }));
  fireEvent.change(screen.getByLabelText('Y 轴最小值'), {
    target: { value: '-5' },
  });
  fireEvent.change(screen.getByLabelText('Y 轴最大值'), {
    target: { value: '5' },
  });
  fireEvent.click(screen.getByRole('tab', { name: '轴线和刻度线' }));
  fireEvent.click(within(selector).getByRole('button', { name: '上轴' }));
  fireEvent.change(screen.getByLabelText('X 轴主刻度长度 (pt)'), {
    target: { value: '7' },
  });
  fireEvent.click(screen.getByRole('button', { name: '应用' }));

  const axes = onApply.mock.calls[0]![0].panels[0].axes;
  expect(axes.find((axis: any) => axis.axisId === 'frame-x').range).toEqual({
    mode: 'fixed',
    min: 10,
    max: 20,
  });
  expect(axes.find((axis: any) => axis.axisId === 'frame-y').range).toEqual({
    mode: 'fixed',
    min: -5,
    max: 5,
  });
  expect(axes.find((axis: any) => axis.axisId === 'axis-x').range).toEqual({
    mode: 'auto',
  });
  expect(axes.find((axis: any) => axis.axisId === 'axis-y').range).toEqual({
    mode: 'auto',
  });
  expect(
    axes.find((axis: any) => axis.axisId === 'frame-x').majorTicks.lengthPt,
  ).toBe(7);
  expect(
    axes.find((axis: any) => axis.axisId === 'axis-x').majorTicks.lengthPt,
  ).toBe(4);
});

it('刻度标签公式位于刻度页原尺度换算位置', () => {
  const template = defaultTemplate();
  const onApply = vi.fn();
  render(
    <AxisPropertiesDialog
      template={template}
      panelId="panel-main"
      axisId="axis-x"
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );

  expect(screen.queryByText('对侧轴尺度换算')).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText('X 轴使用对侧轴尺度换算'),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('X 轴刻度标签公式'), {
    target: { value: 'globalThis.process.exit()' },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('X 轴刻度标签公式'), {
    target: { value: 'abs(x)*2' },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));

  const bottom = onApply.mock.lastCall![0].panels[0].axes.find(
    (axis: { axisId: string }) => axis.axisId === 'axis-x',
  );
  expect(bottom.tickLabels.formula).toBe('abs(x)*2');
  expect(bottom.advanced?.link).toBeUndefined();

  fireEvent.click(screen.getByRole('tab', { name: '刻度线标签' }));
  expect(screen.queryByLabelText('X 轴刻度标签公式')).not.toBeInTheDocument();
});
