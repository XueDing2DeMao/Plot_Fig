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
import App from './App.js';
import { confirmDataImport } from './test-utils/import-data.js';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from './state/default-template.js';
import { serializeWorkspaceProject } from './state/workspace-project.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function loadData() {
  const csv = 'Time,Control,Treatment\n0,1,2\n1,3,5';
  const file = new File([csv], 'review.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => csv });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await confirmDataImport();
}
function applyPlot() {
  fireEvent.click(
    within(screen.getByRole('region', { name: '图形设置' })).getByRole(
      'button',
      { name: /生成图形|应用修改|^确定$/ },
    ),
  );
}
function changeY(value: string) {
  fireEvent.change(screen.getByLabelText('曲线 1 Y 数据列'), {
    target: { value },
  });
}
function unload() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

it('protects pending and applied work until the current project is downloaded', async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:review');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<App />);
  expect(unload()).toBe(false);
  await loadData();
  expect(unload()).toBe(true);
  expect(screen.getByText(/未保存修改/)).toBeInTheDocument();
  applyPlot();
  expect(unload()).toBe(true);
  changeY('treatment');
  fireEvent.click(screen.getByRole('button', { name: '保存项目' }));
  expect(screen.getByTestId('svg-preview')).toHaveTextContent('Treatment');
  expect(screen.getByText(/已发起项目下载/)).toBeInTheDocument();
  expect(unload()).toBe(false);
  changeY('control');
  expect(unload()).toBe(true);
});

it('keeps unsaved work when opening another project is cancelled', async () => {
  render(<App />);
  await loadData();
  const file = new File(['{}'], 'other.plotfig.json', {
    type: 'application/json',
  });
  fireEvent.change(screen.getByLabelText('打开项目文件'), {
    target: { files: [file] },
  });
  const dialog = screen.getByRole('dialog', { name: '打开其他项目' });
  fireEvent.click(within(dialog).getByRole('button', { name: '继续编辑' }));
  expect(
    screen.queryByRole('dialog', { name: '打开其他项目' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '预览文件 review.csv' }),
  ).toBeInTheDocument();
  expect(unload()).toBe(true);
});

it('blocks stale exports and applies pending bindings before opening the exporter', async () => {
  render(<App />);
  await loadData();
  applyPlot();
  changeY('treatment');
  expect(screen.getByTestId('svg-preview')).toHaveTextContent('Control');
  expect(screen.getByText('有未应用修改')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '下载 SVG' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '导出图形' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '导出图形' }));
  const exporter = screen.getByRole('dialog', { name: '导出图形' });
  expect(
    within(exporter).getByRole('button', { name: '导出 PNG' }),
  ).toBeEnabled();
  expect(screen.getByTestId('svg-preview')).toHaveTextContent('Treatment');
});

it('preserves edits made while another project is being read', async () => {
  render(<App />);
  await loadData();
  applyPlot();
  let finishReading!: (value: string) => void;
  const file = new File(['project'], 'slow.plotfig.json');
  Object.defineProperty(file, 'text', {
    value: () =>
      new Promise<string>((resolve) => {
        finishReading = resolve;
      }),
  });
  fireEvent.change(screen.getByLabelText('打开项目文件'), {
    target: { files: [file] },
  });
  fireEvent.click(screen.getByRole('button', { name: '放弃修改并打开' }));
  changeY('treatment');
  finishReading(serializeWorkspaceProject(defaultTemplate(), emptyWorkspace()));
  await screen.findByText(/读取期间工作区有新修改/);
  expect(screen.getByLabelText('曲线 1 Y 数据列')).toHaveValue('treatment');
  expect(
    screen.getByRole('button', { name: '预览文件 review.csv' }),
  ).toBeInTheDocument();
  expect(unload()).toBe(true);
});

it('does not export if pending bindings fail validation', async () => {
  render(<App />);
  await loadData();
  applyPlot();
  fireEvent.change(screen.getByLabelText('曲线 1 数据表'), {
    target: { value: '' },
  });
  fireEvent.click(screen.getByRole('button', { name: '导出图形' }));
  expect(
    screen.queryByRole('dialog', { name: '导出图形' }),
  ).not.toBeInTheDocument();
  expect(
    within(screen.getByRole('region', { name: '图形设置' })).getByRole('alert'),
  ).toBeInTheDocument();
});

it('allows exporting valid layers while the selected layer is empty', async () => {
  render(<App />);
  await loadData();
  applyPlot();
  fireEvent.click(screen.getByRole('button', { name: '新建图层' }));
  expect(
    screen.getByTestId('svg-preview').querySelector('[data-role="plot-slot"]'),
  ).toBeNull();
  expect(screen.getByRole('button', { name: '导出图形' })).toBeEnabled();
});

it('returns to the invalid numeric field across property tabs', async () => {
  render(<App />);
  await loadData();
  applyPlot();
  fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
  fireEvent.change(screen.getByRole('spinbutton', { name: '线宽 (pt)' }), {
    target: { value: 'abc' },
  });
  fireEvent.click(screen.getByRole('tab', { name: '符号' }));
  fireEvent.click(screen.getByRole('button', { name: '修正 曲线 Control' }));
  await waitFor(() =>
    expect(screen.getByRole('spinbutton', { name: '线宽 (pt)' })).toHaveFocus(),
  );
  expect(screen.getByRole('tab', { name: '线条' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(
    screen.getByRole('spinbutton', { name: '线宽 (pt)' }),
  ).toHaveAccessibleDescription(/有效数字/);
  fireEvent.click(screen.getByRole('tab', { name: '符号' }));
  expect(screen.getByRole('tab', { name: '符号' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

it('associates property tabs with their current panel and preserves arrow navigation', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
  const line = screen.getByRole('tab', { name: '线条' });
  const panel = document.getElementById(
    line.getAttribute('aria-controls') ?? '',
  );
  expect(panel).toHaveAttribute('role', 'tabpanel');
  expect(panel).toHaveAttribute('aria-labelledby', line.id);
  fireEvent.keyDown(line, { key: 'ArrowRight' });
  const symbol = screen.getByRole('tab', { name: '符号' });
  expect(symbol).toHaveFocus();
  expect(panel).toHaveAttribute('aria-labelledby', symbol.id);
});

it('keeps project actions in the header and export actions with the preview', () => {
  render(<App />);
  const project = screen.getByRole('region', { name: '项目文件' });
  expect(
    screen.getByRole('heading', { level: 1 }).closest('header'),
  ).toContainElement(project);
  expect(
    within(project).getByRole('button', { name: '保存项目' }),
  ).toBeInTheDocument();
  expect(within(project).getByLabelText('打开项目文件')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: '图形预览' })).toContainElement(
    screen.getByRole('button', { name: '导出图形' }),
  );
});

it('offers palette previews in the color panel and restores the trigger on Escape', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
  const trigger = screen.getByRole('button', { name: '打开线条颜色面板' });
  const originalColor = screen.getByLabelText('线条颜色').getAttribute('value');
  fireEvent.click(trigger);
  const panel = screen.getByRole('dialog', { name: '线条颜色面板' });
  fireEvent.click(within(panel).getByRole('tab', { name: '按点' }));
  expect(
    within(panel).getByRole('button', { name: '调色板 Viridis（紫绿黄）' }),
  ).toBeInTheDocument();
  fireEvent.keyDown(panel, { key: 'Escape' });
  expect(
    screen.queryByRole('dialog', { name: '线条颜色面板' }),
  ).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(screen.getByLabelText('线条颜色')).toHaveValue(originalColor);
  expect(screen.getByRole('dialog', { name: /绘图细节/ })).toBeVisible();
});

it('keeps uncommon markers available through progressive disclosure', () => {
  render(<App />);
  expect(
    screen.queryByRole('radio', { name: '标记符号：自定义多边形' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '更多标记' }));
  fireEvent.click(
    screen.getByRole('radio', { name: '标记符号：自定义多边形' }),
  );
  fireEvent.click(screen.getByRole('button', { name: '收起更多标记' }));
  expect(
    screen.getByRole('radio', { name: '标记符号：自定义多边形' }),
  ).toBeChecked();
});
