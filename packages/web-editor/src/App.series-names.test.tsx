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
import { emptyWorkspace } from '@plot-fig/data-binding';
import { WorkspaceBindingPanel } from './components/WorkspaceBindingPanel.js';
import { defaultTemplate } from './state/default-template.js';
import App from './App.js';
import {
  confirmDataImport,
  confirmPlot,
  openCurveBinding,
} from './test-utils/import-data.js';

afterEach(cleanup);

async function loadData() {
  render(<App />);
  const text = 'Time,Control,Treatment\n0,1,2\n1,3,5';
  const file = new File([text], 'names.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => text });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await confirmDataImport();
  confirmPlot();
}

it('keeps a custom curve name across rebinding and copying and applies it to the legend', async () => {
  await loadData();
  const preview = screen.getByTestId('svg-preview');
  const before = preview.innerHTML;
  const name = screen.getByRole('textbox', { name: '曲线 1 名称' });
  expect(name).toHaveValue('Control');
  fireEvent.change(name, { target: { value: '  Sample A  ' } });
  fireEvent.blur(name);
  expect(
    screen.getByRole('button', { name: '收起曲线 1 数据绑定' }),
  ).toHaveTextContent('Sample A');
  expect(preview.innerHTML).toBe(before);
  fireEvent.change(screen.getByLabelText('曲线 1 Y 数据列'), {
    target: { value: 'treatment' },
  });
  expect(screen.getByRole('textbox', { name: '曲线 1 名称' })).toHaveValue(
    'Sample A',
  );
  fireEvent.click(screen.getByRole('button', { name: '复制曲线 1' }));
  expect(screen.getByRole('textbox', { name: '曲线 2 名称' })).toHaveValue(
    'Sample A',
  );
  const copiedName = screen.getByRole('textbox', { name: '曲线 2 名称' });
  fireEvent.change(copiedName, { target: { value: '对照样品' } });
  fireEvent.blur(copiedName);
  openCurveBinding(1);
  expect(screen.getByRole('textbox', { name: '曲线 1 名称' })).toHaveValue(
    'Sample A',
  );
  confirmPlot();
  fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
  fireEvent.click(screen.getByRole('button', { name: '图页 SZ-Plot XY' }));
  fireEvent.click(screen.getByRole('tab', { name: '图例/标题' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '显示图例 series-1' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '显示图例 series-2' }));
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  const legends = Array.from(
    preview.querySelectorAll('[data-role="legend-entry"]'),
  ).map((entry) => entry.textContent);
  expect(legends.join(' ')).toContain('Sample A');
  expect(legends.join(' ')).toContain('对照样品');
});

it('preserves an existing multiline legend when its name is not edited or editing is cancelled', () => {
  const template = defaultTemplate();
  template.panels[0]!.plotSlots[0]!.legendEntry.text = 'First\nSecond';
  const onName = vi.fn();
  const ignore = () => {};
  render(
    <WorkspaceBindingPanel
      template={template}
      workspace={emptyWorkspace()}
      data={undefined}
      onName={onName}
      onTable={ignore}
      onColumn={ignore}
      onSeries={ignore}
    />,
  );
  const input = screen.getByRole('textbox', { name: '曲线 1 名称' });
  input.focus();
  fireEvent.blur(input);
  expect(onName).not.toHaveBeenCalled();
  input.focus();
  fireEvent.change(input, { target: { value: 'discard' } });
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(onName).not.toHaveBeenCalled();
});

it('supports Enter to save, Escape to cancel, and resetting a pending name', async () => {
  await loadData();
  let name = screen.getByRole('textbox', { name: '曲线 1 名称' });
  name.focus();
  fireEvent.change(name, { target: { value: '取消此名称' } });
  fireEvent.keyDown(name, { key: 'Escape' });
  expect(name).toHaveValue('Control');
  expect(screen.getByRole('button', { name: '重置待绘图设置' })).toBeDisabled();
  name.focus();
  fireEvent.change(name, { target: { value: '样品 A' } });
  fireEvent.keyDown(name, { key: 'Enter' });
  expect(
    screen.getByRole('button', { name: '收起曲线 1 数据绑定' }),
  ).toHaveTextContent('样品 A');
  fireEvent.click(screen.getByRole('button', { name: '重置待绘图设置' }));
  name = screen.getByRole('textbox', { name: '曲线 1 名称' });
  expect(name).toHaveValue('Control');
});

it('keeps renaming in the plot-setup dialog transactional', async () => {
  await loadData();
  const openSetup = () => {
    fireEvent.click(screen.getByRole('button', { name: '图层管理' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '图表绘制…' }));
    return within(screen.getByRole('dialog', { name: '图表绘制' }));
  };
  let dialog = openSetup();
  let name = dialog.getByRole('textbox', { name: '曲线 1 名称' });
  fireEvent.change(name, { target: { value: 'Cancelled' } });
  fireEvent.blur(name);
  fireEvent.click(dialog.getByRole('button', { name: '取消' }));
  expect(screen.getByRole('textbox', { name: '曲线 1 名称' })).toHaveValue(
    'Control',
  );
  dialog = openSetup();
  name = dialog.getByRole('textbox', { name: '曲线 1 名称' });
  fireEvent.change(name, { target: { value: 'Confirmed' } });
  fireEvent.blur(name);
  fireEvent.click(dialog.getByRole('button', { name: '确定' }));
  expect(screen.getByRole('textbox', { name: '曲线 1 名称' })).toHaveValue(
    'Confirmed',
  );
});
