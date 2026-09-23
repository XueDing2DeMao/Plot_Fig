// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import App from './App.js';
afterEach(cleanup);
it('keeps plotting actions available after worksheet interaction and opens a curve', async () => {
  render(<App />);
  fireEvent.mouseDown(screen.getByTestId('origin-worksheet-window'));
  expect(screen.getByRole('button', { name: '坐标轴' })).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '分析' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
  const dialog = await screen.findByRole('dialog', { name: /绘图细节/ });
  const curve = within(dialog).getByRole('button', { name: /^曲线 / });
  fireEvent.click(curve);
  expect(curve).toHaveAttribute('aria-current', 'true');
});
it('opens the Y axis from its independent menu', async () => {
  render(<App />);
  fireEvent.mouseDown(screen.getByRole('region', { name: '图形预览' }));
  fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
  fireEvent.click(screen.getByRole('menuitem', { name: /Y 轴/ }));
  expect(
    await screen.findByRole('dialog', { name: /坐标轴/ }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '标题' }));
  expect(screen.getByLabelText('Y 轴标题')).toBeInTheDocument();
});
