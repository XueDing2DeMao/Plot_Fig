// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('the real App commits a drag once, undoes it, and preserves double-click property editing', async () => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  render(<App />);
  const source = readFileSync(
    'tests/fixtures/m0/S1-three-xy.plotfig.json',
    'utf8',
  );
  const file = new File([source], 'm3.plotfig.json', {
    type: 'application/json',
  });
  Object.defineProperty(file, 'text', { value: async () => source });
  fireEvent.change(screen.getByLabelText('打开项目文件'), {
    target: { files: [file] },
  });
  await waitFor(() =>
    expect(
      screen.getByTestId('svg-preview').querySelector('svg'),
    ).not.toBeNull(),
  );
  const stage = screen.getByTestId('svg-preview');
  const svg = stage.querySelector('svg')!;
  const viewBox = svg.getAttribute('viewBox')!.split(' ').map(Number);
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: viewBox[2]!,
    height: viewBox[3]!,
    right: viewBox[2]!,
    bottom: viewBox[3]!,
    toJSON: () => ({}),
  });
  const text = () =>
    stage.querySelector('[data-annotation-id="m0-text"] text')!;
  const originalX = text().getAttribute('x');
  const history = within(screen.getByRole('group', { name: '编辑历史' }));
  expect(history.getByRole('button', { name: '撤销' })).toBeDisabled();
  fireEvent.pointerDown(text(), { button: 0, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(stage, { clientX: 125, clientY: 115 });
  expect(history.getByRole('button', { name: '撤销' })).toBeDisabled();
  expect(text().parentElement).toHaveAttribute('transform', 'translate(25 15)');
  fireEvent.pointerUp(stage, { clientX: 130, clientY: 120 });
  expect(Number(text().getAttribute('x')) - Number(originalX)).toBeCloseTo(
    30,
    4,
  );
  expect(screen.getByText('有未保存修改，请下载项目文件')).toBeVisible();
  fireEvent.click(history.getByRole('button', { name: '撤销' }));
  expect(text().getAttribute('x')).toBe(originalX);
  expect(history.getByRole('button', { name: '撤销' })).toBeDisabled();
  expect(history.getByRole('button', { name: '重做' })).toBeEnabled();
  // 新一轮点击解除拖动后残留的 click/dblclick 抑制。
  fireEvent.pointerDown(text(), { button: 0, clientX: 100, clientY: 100 });
  fireEvent.pointerUp(stage, { clientX: 100, clientY: 100 });
  fireEvent.doubleClick(text());
  const dialog = screen.getByRole('dialog', { name: '绘图细节 - 页面属性' });
  fireEvent.click(within(dialog).getByRole('tab', { name: '注释' }));
  expect(within(dialog).getByText('轻量注释与图例')).toBeVisible();
});
