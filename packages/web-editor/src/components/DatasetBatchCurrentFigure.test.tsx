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
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { markAxisTitleManual } from '../state/axis-title-bindings.js';
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
        source: { kind: 'csv', name: 'a.csv' },
        rows: [
          ['angle', 'intensity'],
          [10, 2],
          [20, 4],
        ],
      }),
      createDataTable({
        tableId: 'b',
        source: { kind: 'csv', name: 'b.csv' },
        rows: [
          ['position', 'counts'],
          [100, 3],
          [120, 6],
        ],
      }),
    ],
  );
  model.template.page.background = '#fff1dc';
  model.template.page.size.width.value = 210;
  const panel = model.template.panels[0]!;
  const x = panel.axes[0]!;
  x.range = { mode: 'fixed', min: -50, max: 50 };
  x.majorTicks.generation = { mode: 'count', count: 3 };
  x.tickLabels.fontFamily = 'Georgia';
  x.tickLabels.fontSizePt = 14;
  x.title!.text = 'Manual angle';
  markAxisTitleManual(x);
  panel.axes[1]!.title!.text = 'Manual intensity';
  markAxisTitleManual(panel.axes[1]!);
  const plot = panel.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('Expected XY');
  plot.lineStyle = {
    ...plot.lineStyle!,
    color: '#bd1976',
    widthPt: 2,
    dash: 'dashed',
  };
  return model;
}

function drawingBasis() {
  return screen
    .getAllByRole('combobox')
    .find((select) => select.querySelector('option[value="current-style"]'))!;
}

function expectCurrentFormat(svg: Element) {
  expect(svg.getAttribute('width')).toBe('210mm');
  expect(
    svg.querySelector('[data-role="page-background"]')!.getAttribute('fill'),
  ).toBe('#fff1dc');
  expect(
    svg.querySelector('[data-role="plot-slot"] [stroke="#bd1976"]'),
  ).not.toBeNull();
  expect(
    svg.querySelector(
      '[data-axis-id="axis-x"] [font-family="Georgia"][font-size="14"]',
    ),
  ).not.toBeNull();
  expect(svg.textContent).toContain('Manual angle');
  expect(svg.textContent).toContain('Manual intensity');
}

function svgDocument(svg: string) {
  return new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
}

function xTicks(svg: Element) {
  return Array.from(
    svg.querySelectorAll(
      '[data-role="axes"] [data-axis-id="axis-x"] [data-role="tick-label"]',
    ),
    (element) => element.textContent!.replaceAll('−', '-'),
  );
}

async function startBatch() {
  fireEvent.click(screen.getByRole('button', { name: '开始批处理' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: '下载已完成文件 ZIP' }),
    ).toBeEnabled(),
  );
}

it('runs the current figure directly while the template library is pending and preserves its format for automatically mapped tables', async () => {
  vi.mocked(listTemplates).mockReturnValueOnce(new Promise(() => {}));
  const model = fixture();
  const before = structuredClone(model);
  render(<DatasetBatchDialog model={model} onDismiss={() => {}} />);
  expect(drawingBasis()).toHaveValue('');
  expect(
    screen.getByRole('checkbox', { name: '自动识别两列 XY' }),
  ).toBeChecked();
  expectCurrentFormat(screen.getByLabelText('批量模板预览'));
  fireEvent.change(screen.getByLabelText('预览项目'), {
    target: { value: 'b' },
  });
  expectCurrentFormat(screen.getByLabelText('批量模板预览'));
  await startBatch();
  expect(screen.getAllByText('成功')).toHaveLength(2);
  expect(exportBatchBytes).toHaveBeenCalledTimes(2);
  for (const [svg] of vi.mocked(exportBatchBytes).mock.calls)
    expectCurrentFormat(svgDocument(svg));
  const results = within(screen.getByRole('region', { name: '批次结果' }));
  expect(
    results.getByText(/001-a.svg.*001-a.plotfig.json/),
  ).toBeInTheDocument();
  expect(
    results.getByText(/002-b.svg.*002-b.plotfig.json/),
  ).toBeInTheDocument();
  expect(drawingBasis()).toHaveValue('');
  expect(model).toEqual(before);
});

it('offers current-figure format selection immediately even if the template library fails', async () => {
  vi.mocked(listTemplates).mockRejectedValueOnce(new Error('模板库暂不可用'));
  render(<DatasetBatchDialog model={fixture()} onDismiss={() => {}} />);
  expect(screen.getByLabelText('绘图依据')).toHaveValue('');
  const formats = screen.getByLabelText('复用格式');
  expect(formats).toHaveValue('default');
  expect(
    within(formats).getByRole('option', { name: '沿用当前图形格式' }),
  ).toHaveValue('default');
  fireEvent.change(formats, { target: { value: 'custom' } });
  const choices = within(screen.getByRole('group', { name: '自定义复用格式' }));
  expect(choices.getAllByRole('checkbox')).toHaveLength(7);
  for (const name of [
    '页面背景',
    '图例格式',
    '图层背景',
    '图层尺寸',
    '刻度与范围',
    '颜色',
    '字体',
  ])
    expect(choices.getByRole('checkbox', { name })).toBeInTheDocument();
  await screen.findByText(/模板库暂不可用/);
  expect(screen.getByRole('button', { name: '开始批处理' })).toBeEnabled();
});

it('returns from a full template to current-figure style reuse and restores the default', async () => {
  const model = fixture();
  const before = structuredClone(model);
  render(<DatasetBatchDialog model={model} onDismiss={() => {}} />);
  fireEvent.change(drawingBasis(), { target: { value: 'current-style' } });
  fireEvent.change(screen.getByLabelText('套用范围'), {
    target: { value: 'full' },
  });
  fireEvent.change(drawingBasis(), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('复用格式'), {
    target: { value: 'custom' },
  });
  const choices = within(screen.getByRole('group', { name: '自定义复用格式' }));
  const ticks = choices.getByRole('checkbox', { name: '刻度与范围' });
  for (const checkbox of choices.getAllByRole('checkbox')) {
    const wantTicks = checkbox === ticks;
    if ((checkbox as HTMLInputElement).checked !== wantTicks)
      fireEvent.click(checkbox);
  }
  fireEvent.change(screen.getByLabelText('预览项目'), {
    target: { value: 'b' },
  });
  const preview = screen.getByLabelText('批量模板预览');
  expectCurrentFormat(preview);
  expect(xTicks(preview)).toContain('-50');
  await startBatch();
  expect(screen.getAllByText('成功')).toHaveLength(2);
  for (const [svg] of vi.mocked(exportBatchBytes).mock.calls) {
    expectCurrentFormat(svgDocument(svg));
    expect(xTicks(svgDocument(svg))).toContain('-50');
  }

  fireEvent.change(screen.getByLabelText('复用格式'), {
    target: { value: 'default' },
  });
  expect(xTicks(screen.getByLabelText('批量模板预览'))).not.toContain('-50');
  expect(
    screen.getByRole('button', { name: '下载已完成文件 ZIP' }),
  ).toBeDisabled();
  await startBatch();
  const defaultExports = vi.mocked(exportBatchBytes).mock.calls.slice(2);
  expect(defaultExports).toHaveLength(2);
  expect(xTicks(svgDocument(defaultExports[0]![0]))).toContain('-50');
  expect(xTicks(svgDocument(defaultExports[1]![0]))).not.toContain('-50');

  expect(model).toEqual(before);
});
