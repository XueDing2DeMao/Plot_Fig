// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { defaultTemplate } from '../state/default-template.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
afterEach(cleanup);
it('shows native page and layer categories and keeps background/geometry editable', () => {
  render(
    <FigurePropertiesDialog
      template={defaultTemplate()}
      data={undefined}
      initialSelection={{ kind: 'page' }}
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  const categories = () =>
    within(screen.getByRole('tablist', { name: '属性分类' }))
      .getAllByRole('tab')
      .map((tab) => tab.textContent);
  expect(categories()).toEqual([
    '打印/尺寸',
    '其他',
    '图层',
    '显示',
    '图例/标题',
  ]);
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByRole('tab', { name: '显示' }));
  expect(screen.getByLabelText('图页背景颜色')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^图层 / }));
  expect(categories()).toEqual(['背景', '大小', '显示/速度', '堆叠']);
  expect(
    screen.queryByRole('region', { name: '修改后的图形预览' }),
  ).not.toBeInTheDocument();
});
it('uses the point-line categories and adds Pattern only after enabling fill', () => {
  render(
    <FigurePropertiesDialog
      template={defaultTemplate()}
      data={undefined}
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  const categories = () =>
    within(screen.getByRole('tablist', { name: '属性分类' }))
      .getAllByRole('tab')
      .map((tab) => tab.textContent);
  expect(categories()).toEqual([
    '显示',
    '线条',
    '符号',
    '子集',
    '分格',
    '垂直线',
    '标签',
  ]);
  expect(screen.queryByRole('tab', { name: '图案' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('曲线下填充区域'));
  fireEvent.click(screen.getByRole('tab', { name: '图案' }));
  expect(screen.getByLabelText('正向填充颜色')).toBeInTheDocument();
});
