// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import type { TemplateEntry } from '../templates/catalog.js';
import type { OriginNativeResult } from '../templates/origin-native-contract.js';
import { defaultTemplate } from '../state/default-template.js';
import { TemplateLibraryDialog } from './TemplateLibraryDialog.js';
import {
  checkOriginTemplateImport,
  importOriginTemplate,
} from '../browser/origin-template-import.js';
import { saveTemplate } from '../templates/library-storage.js';

let entries: TemplateEntry[] = [];
vi.mock('../templates/library-storage.js', async (original) => ({
  ...(await original<object>()),
  listTemplates: async () => structuredClone(entries),
  saveTemplate: vi.fn(async (template) => {
    const id = 'custom-native';
    entries.push({
      id,
      template: structuredClone(template),
      name: template.metadata.name,
      tags: template.metadata.tags,
      builtIn: false,
    });
    return id;
  }),
}));
vi.mock('../browser/origin-template-import.js', () => ({
  importOriginTemplate: vi.fn(),
  checkOriginTemplateImport: vi.fn(),
}));
function result(): OriginNativeResult {
  const template = defaultTemplate();
  template.metadata.name = 'Origin 原生示例';
  template.metadata.tags = ['origin', '光谱'];
  return {
    template,
    report: {
      originVersion: '2025b',
      mapped: ['页面尺寸', '曲线线型'],
      warnings: [{ path: '/layers/0/legend', message: '动态图例文字未转换' }],
    },
  };
}
beforeEach(() => {
  entries = [];
  vi.clearAllMocks();
  vi.mocked(importOriginTemplate).mockResolvedValue(result());
});
afterEach(cleanup);
function open() {
  const model = { template: defaultTemplate(), workspace: emptyWorkspace() };
  const onApply = vi.fn();
  return {
    ...render(
      <TemplateLibraryDialog
        model={model}
        onApply={onApply}
        onDismiss={vi.fn()}
      />,
    ),
    model,
    onApply,
  };
}
function selectFile() {
  const input = screen.getByLabelText('导入 Origin 模板（OTP / OTPU）');
  fireEvent.change(input, {
    target: { files: [new File(['binary'], 'test.otpu')] },
  });
  return input;
}
it('reviews the native conversion before saving, selects the new record and preserves the current figure', async () => {
  const { model, onApply } = open();
  const before = structuredClone(model);
  await screen.findByText('暂无模板');
  expect(checkOriginTemplateImport).not.toHaveBeenCalled();
  expect(importOriginTemplate).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('搜索模板或标签'), {
    target: { value: 'unmatched' },
  });
  expect(selectFile()).toHaveValue('');
  await screen.findByText('动态图例文字未转换');
  expect(screen.getByLabelText('Origin 导入模板示例')).toBeInTheDocument();
  expect(saveTemplate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '保存导入模板' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /Origin 原生示例.*我的模板/ }),
    ).toHaveAttribute('aria-pressed', 'true'),
  );
  expect(screen.getByLabelText('搜索模板或标签')).toHaveValue('');
  expect(screen.getByLabelText('模板名称')).toHaveValue('Origin 原生示例');
  expect(screen.getByLabelText('标签（逗号分隔）')).toHaveValue('origin, 光谱');
  expect(saveTemplate).toHaveBeenCalledTimes(1);
  expect(model).toEqual(before);
  expect(onApply).not.toHaveBeenCalled();
});
it('cancels conversion, ignores its late response and allows the same file to be selected again', async () => {
  let resolve!: (value: OriginNativeResult) => void;
  vi.mocked(importOriginTemplate).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  open();
  selectFile();
  const signal = vi.mocked(importOriginTemplate).mock.calls[0]![1]!;
  fireEvent.click(screen.getByRole('button', { name: '取消转换' }));
  expect(signal.aborted).toBe(true);
  await act(async () => resolve(result()));
  expect(
    screen.queryByRole('button', { name: '保存导入模板' }),
  ).not.toBeInTheDocument();
  expect(saveTemplate).not.toHaveBeenCalled();
  selectFile();
  expect(
    await screen.findByRole('button', { name: '保存导入模板' }),
  ).toBeEnabled();
  expect(importOriginTemplate).toHaveBeenCalledTimes(2);
});
it('aborts on dismissal and never saves a late conversion', async () => {
  let resolve!: (value: OriginNativeResult) => void;
  vi.mocked(importOriginTemplate).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const view = open();
  selectFile();
  const signal = vi.mocked(importOriginTemplate).mock.calls[0]![1]!;
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => resolve(result()));
  expect(saveTemplate).not.toHaveBeenCalled();
});
it('can discard a reviewed conversion without changing the library', async () => {
  open();
  selectFile();
  await screen.findByRole('button', { name: '保存导入模板' });
  fireEvent.click(screen.getByRole('button', { name: '放弃本次导入' }));
  expect(
    screen.queryByLabelText('Origin 导入模板示例'),
  ).not.toBeInTheDocument();
  expect(saveTemplate).not.toHaveBeenCalled();
});
it('checks the service on demand and displays the unavailable reason', async () => {
  vi.mocked(checkOriginTemplateImport).mockResolvedValue({
    available: false,
    reason: '本机未安装 Origin',
  });
  open();
  fireEvent.click(screen.getByRole('button', { name: '检测 Origin 导入服务' }));
  expect(await screen.findByText('本机未安装 Origin')).toBeInTheDocument();
  expect(importOriginTemplate).not.toHaveBeenCalled();
});
it('does not claim an Origin connection when only the local interface is available', async () => {
  vi.mocked(checkOriginTemplateImport).mockResolvedValue({ available: true });
  open();
  fireEvent.click(screen.getByRole('button', { name: '检测 Origin 导入服务' }));
  expect(
    await screen.findByText('本机导入接口可用；转换时检查 Origin。'),
  ).toBeInTheDocument();
  expect(importOriginTemplate).not.toHaveBeenCalled();
});
it('rejects a conversion with no renderable sample instead of offering an empty preview', async () => {
  const invalid = result();
  invalid.template.panels[0]!.plotSlots = [];
  vi.mocked(importOriginTemplate).mockResolvedValue(invalid);
  open();
  selectFile();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    '模板示例无法绘制',
  );
  expect(
    screen.queryByRole('button', { name: '保存导入模板' }),
  ).not.toBeInTheDocument();
  expect(saveTemplate).not.toHaveBeenCalled();
});
