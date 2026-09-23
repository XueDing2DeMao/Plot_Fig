// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it } from 'vitest';
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import App from './App.js';
import { confirmPlot } from './test-utils/import-data.js';
afterEach(cleanup);
it('uses one chart choice for all existing and newly added groups', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText('图表类型'), {
    target: { value: 'area' },
  });
  fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
  expect(screen.getByLabelText('图表类型')).toHaveValue('area');
  expect(
    screen.getAllByRole('group', { name: /曲线 \d+ 数据绑定/ }),
  ).toHaveLength(2);
  expect(screen.queryByLabelText('新增图表类型')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('曲线 1 图表类型')).not.toBeInTheDocument();
});
it('switches shared axes for all groups together', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
  fireEvent.change(screen.getByLabelText('图表类型'), {
    target: { value: 'bar' },
  });
  expect(screen.getByLabelText('图表类型')).toHaveValue('bar');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('switches chart type in a draft, binds samples, and edits histogram properties', async () => {
  render(<App />);
  const text = 'X,Y\n0,1\n1,2\n2,3';
  const file = new File([text], 'data.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => text });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '确认导入' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: '确认导入' }));
  fireEvent.change(screen.getByLabelText('图表类型'), {
    target: { value: 'histogram' },
  });
  expect(
    screen
      .getByTestId('svg-preview')
      .querySelector('[data-role="histogram-bin"]'),
  ).toBeNull();
  confirmPlot();
  expect(
    screen
      .getByTestId('svg-preview')
      .querySelector('[data-role="histogram-bin"]'),
  ).not.toBeNull();
  expect(screen.getByLabelText(/样本.*数据列/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
  fireEvent.change(screen.getByLabelText('分箱方式'), {
    target: { value: 'count' },
  });
  fireEvent.change(screen.getByLabelText('箱数'), { target: { value: '2' } });
  fireEvent.click(
    within(screen.getByRole('dialog', { name: /绘图细节/ })).getByRole(
      'button',
      { name: '确定' },
    ),
  );
  expect(
    screen
      .getByTestId('svg-preview')
      .querySelectorAll('[data-role="histogram-bin"]'),
  ).toHaveLength(2);
});
