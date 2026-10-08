// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import App from './App.js';
import { confirmDataImport, confirmPlot } from './test-utils/import-data.js';

afterEach(cleanup);

it('closes an anchored action menu when the page scrolls', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
  expect(screen.getByRole('menu', { name: '坐标轴' })).toBeInTheDocument();
  fireEvent.scroll(window);
  expect(
    screen.queryByRole('menu', { name: '坐标轴' }),
  ).not.toBeInTheDocument();
});

it('groups drawing tools above the preview and export tools in the export area', () => {
  render(<App />);
  expect(
    screen.queryByRole('menubar', { name: 'Origin 菜单栏' }),
  ).not.toBeInTheDocument();
  const actions = screen.getByRole('group', { name: '绘图功能菜单' });
  expect(
    within(actions)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent),
  ).toEqual([
    '撤销',
    '重做',
    '图形属性',
    '坐标轴',
    '图层管理',
    '模板中心',
    '数据表批绘',
  ]);
  expect(
    screen.queryByRole('button', { name: '项目批处理' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: '图形预览' })).toContainElement(
    actions,
  );
  expect(
    screen.queryByRole('button', { name: '出版编辑' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '对象管理' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('region', { name: '对象管理器' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '分析' }),
  ).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: '导出图形' })).toHaveLength(1);
  expect(screen.getByRole('button', { name: '导出图形' })).toBeDisabled();
  expect(
    screen.queryByRole('button', { name: '下载 PNG' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '下载 SVG' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText('PNG 分辨率')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '批量导出…' }),
  ).not.toBeInTheDocument();
  expect(document.getElementById('export')).toContainElement(
    screen.getByRole('button', { name: '导出图形' }),
  );
});

it('keeps compact tool groups accessible and puts optional interaction help behind a disclosure', () => {
  render(<App />);
  const toolbar = within(screen.getByRole('group', { name: '预览工具栏' }));
  expect(
    toolbar.getByRole('group', { name: '图形设置工具' }),
  ).toBeInTheDocument();
  expect(
    toolbar.getByRole('group', { name: '模板与批量绘图' }),
  ).toBeInTheDocument();
  expect(toolbar.getByRole('group', { name: '图层格式' })).toBeInTheDocument();
  expect(toolbar.getByRole('group', { name: '图形缩放' })).toBeInTheDocument();
  expect(toolbar.getByRole('button', { name: '撤销' })).toHaveAttribute(
    'title',
    expect.stringContaining('Ctrl'),
  );
  expect(toolbar.getByRole('button', { name: '放大' })).toHaveAttribute(
    'title',
    expect.stringContaining('放大'),
  );
  const help = screen.getByText('操作提示').closest('details')!;
  expect(help).not.toHaveAttribute('open');
  expect(within(help).getByText(/滚轮：X 轴/)).not.toBeVisible();
});

it('opens the independent Y axis menu after using the worksheet', () => {
  render(<App />);
  fireEvent.mouseDown(screen.getByTestId('origin-worksheet-window'));
  fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Y 轴…' }));
  expect(
    screen.getByRole('dialog', { name: '坐标轴属性' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '标题' }));
  expect(screen.getByLabelText('Y 轴标题')).toBeInTheDocument();
});

it.each(['图层内容', '图表绘制', '图层管理'])(
  'opens %s through its independent layer menu',
  (name) => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '图层管理' }));
    fireEvent.click(
      screen.getByRole('menuitem', { name: new RegExp(`^${name}…`) }),
    );
    expect(screen.getByRole('dialog', { name })).toBeInTheDocument();
  },
);

it('removes theme management and releases its F7 shortcut', () => {
  render(<App />);
  expect(
    screen.queryByRole('button', { name: '主题管理' }),
  ).not.toBeInTheDocument();
  expect(fireEvent.keyDown(document, { key: 'F7' })).toBe(true);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('keeps popup keyboard navigation and page/layer shortcuts', async () => {
  render(<App />);
  const axes = screen.getByRole('button', { name: '坐标轴' });
  fireEvent.keyDown(axes, { key: 'ArrowDown' });
  await waitFor(() =>
    expect(screen.getByRole('menuitem', { name: 'X 轴…' })).toHaveFocus(),
  );
  fireEvent.keyDown(screen.getByRole('menuitem', { name: 'X 轴…' }), {
    key: 'Escape',
  });
  expect(axes).toHaveFocus();
  fireEvent.keyDown(document, { key: 'F2' });
  expect(screen.getByRole('dialog', { name: /绘图细节/ })).toBeInTheDocument();
  expect(
    within(screen.getByRole('dialog', { name: /绘图细节/ })).getByRole(
      'button',
      { name: /^图页 SZ/ },
    ),
  ).toHaveAttribute('aria-current', 'true');
  fireEvent.keyDown(document, { key: 'F12' });
  expect(
    screen.queryByRole('dialog', { name: '图层内容' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  fireEvent.keyDown(document, { key: 'F12' });
  expect(screen.getByRole('dialog', { name: '图层内容' })).toBeInTheDocument();
});

it('enables the independent export entry for a rendered graph', async () => {
  render(<App />);
  const csv = 'X,Y\n0,1\n1,2';
  const file = new File([csv], 'actions.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => csv });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await confirmDataImport();
  confirmPlot();
  await screen.findByRole('img', { name: '图形预览' });
  const output = screen.getByRole('button', { name: '导出图形' });
  expect(output).toBeEnabled();
  fireEvent.click(output);
  const dialog = screen.getByRole('dialog', { name: '导出图形' });
  expect(within(dialog).getByLabelText('DPI')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: '批量导出图层' }));
  expect(
    within(dialog).getByRole('button', { name: '导出并下载 ZIP' }),
  ).toBeEnabled();
  fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
  expect(
    screen.queryByRole('dialog', { name: '导出图形' }),
  ).not.toBeInTheDocument();
});
