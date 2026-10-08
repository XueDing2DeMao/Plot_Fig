// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { listTemplates } from '../templates/library-storage.js';
import { exportBatchBytes } from '../batch/export-bytes.js';
import { DatasetBatchDialog } from './DatasetBatchDialog.js';

vi.mock('../templates/library-storage.js', () => ({
  listTemplates: vi.fn(async () => []),
}));
vi.mock('../batch/export-bytes.js', () => ({
  exportBatchBytes: vi.fn(async (svg: string) => new TextEncoder().encode(svg)),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function fixture() {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'a',
        source: { name: 'a.csv', kind: 'csv' },
        rows: [
          ['x', 'y'],
          [1, 2],
          [2, 3],
        ],
      }),
    ],
  );
  const template = defaultTemplate(),
    panel = template.panels[0]!;
  template.page.background = '#f2ecde';
  panel.axes.forEach((axis) => {
    axis.tickLabels.fontFamily = 'Georgia';
  });
  const plot = panel.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('Expected XY fixture');
  plot.lineStyle!.color = '#ba1234';
  vi.mocked(listTemplates).mockResolvedValueOnce([
    { id: 'saved', name: '格式参考', tags: [], template, builtIn: false },
  ]);
  return model;
}

async function chooseTemplate() {
  await screen.findByRole('option', { name: '格式参考' });
  fireEvent.change(screen.getByLabelText('绘图依据'), {
    target: { value: 'saved' },
  });
}

it('selects multiple formats, refreshes preview and export, and clears results after scope changes', async () => {
  const model = fixture(),
    original = structuredClone(model);
  render(<DatasetBatchDialog model={model} onDismiss={() => {}} />);
  await chooseTemplate();
  expect(screen.getByLabelText('复用格式')).toHaveValue('default');
  fireEvent.change(screen.getByLabelText('复用格式'), {
    target: { value: 'custom' },
  });
  for (const name of [
    '页面背景',
    '图例格式',
    '图层背景',
    '图层尺寸',
    '刻度与范围',
    '颜色',
    '字体',
  ])
    expect(screen.getByRole('checkbox', { name })).toBeInTheDocument();
  for (const name of ['图例格式', '图层背景', '字体'])
    fireEvent.click(screen.getByRole('checkbox', { name }));
  const preview = () => screen.getByLabelText('批量模板预览');
  expect(
    preview().querySelector('[data-role="plot-slot"] [stroke="#ba1234"]'),
  ).not.toBeNull();
  expect(preview().querySelector('[font-family="Georgia"]')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '开始批处理' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: '下载已完成文件 ZIP' }),
    ).toBeEnabled(),
  );
  const svg = vi.mocked(exportBatchBytes).mock.calls[0]![0];
  expect(svg).toContain('#ba1234');
  expect(svg).not.toContain('Georgia');
  fireEvent.click(screen.getByRole('checkbox', { name: '字体' }));
  expect(preview().querySelector('[font-family="Georgia"]')).not.toBeNull();
  expect(
    screen.getByRole('button', { name: '下载已完成文件 ZIP' }),
  ).toBeDisabled();
  expect(screen.queryByText('成功')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: '颜色' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '字体' }));
  expect(preview().querySelector('[stroke="#ba1234"]')).toBeNull();
  expect(
    screen.getByText('未勾选格式时，保留当前图形格式。'),
  ).toBeInTheDocument();
  expect(model).toEqual(original);
});

it('offers appearance and all presets, and explains full template reuse', async () => {
  render(<DatasetBatchDialog model={fixture()} onDismiss={() => {}} />);
  await chooseTemplate();
  fireEvent.change(screen.getByLabelText('复用格式'), {
    target: { value: 'styles' },
  });
  expect(
    screen
      .getByLabelText('批量模板预览')
      .querySelector('[font-family="Georgia"]'),
  ).not.toBeNull();
  fireEvent.change(screen.getByLabelText('复用格式'), {
    target: { value: 'all' },
  });
  expect(
    screen.getByLabelText('批量模板预览').querySelector('[fill="#f2ecde"]'),
  ).not.toBeNull();
  fireEvent.change(screen.getByLabelText('套用范围'), {
    target: { value: 'full' },
  });
  expect(screen.queryByLabelText('复用格式')).not.toBeInTheDocument();
  expect(
    screen.getByText(/完整模板会复用整个模板的结构和格式/),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('套用范围'), {
    target: { value: 'style' },
  });
  expect(screen.getByLabelText('复用格式')).toHaveValue('all');
});
