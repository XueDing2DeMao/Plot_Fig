// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { confirmDataImport } from '../test-utils/import-data.js';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function captureDownload() {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:palette-test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const blobs = vi.spyOn(globalThis, 'Blob');
  return () => {
    const part = blobs.mock.calls.at(-1)?.[0]?.[0];
    return part instanceof Uint8Array
      ? new TextDecoder().decode(part)
      : String(part);
  };
}

async function loadData() {
  const csv = 'X,Y,Time\n0,1,10\n1,2,20';
  const file = new File([csv], 'xy.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => csv });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await confirmDataImport();
  await screen.findByRole('img', { name: '图形预览' });
}

function openPalettes() {
  fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
  fireEvent.click(screen.getByRole('tab', { name: '配色' }));
}

function selectNature() {
  fireEvent.change(screen.getByLabelText('内置配色'), {
    target: { value: 'sci-nature-1' },
  });
}

function expectPlotColor(element: HTMLElement, color: string) {
  expect(element.querySelector('path')).toHaveAttribute('stroke', color);
  expect(element.querySelector('[data-role="marker"]')).toHaveAttribute(
    'fill',
    color,
  );
  expect(element.querySelector('[data-role="marker"]')).toHaveAttribute(
    'stroke',
    color,
  );
}

describe('academic palette workflow', () => {
  it('exports the selected color and restores its palette from a saved project', async () => {
    render(<App />);
    await loadData();
    openPalettes();
    selectNature();
    fireEvent.click(
      screen.getByRole('button', { name: '使用颜色 2：#4DBBD5' }),
    );
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    const downloadText = captureDownload();
    fireEvent.click(screen.getByRole('button', { name: '导出图形' }));
    fireEvent.change(screen.getByLabelText('图像类型'), {
      target: { value: 'svg' },
    });
    fireEvent.click(screen.getByRole('button', { name: '导出 SVG' }));
    await screen.findByText(/^已发起下载：/);
    expect(downloadText()).toContain('stroke="#4DBBD5"');
    expect(downloadText()).toContain('fill="#4DBBD5"');
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    fireEvent.click(screen.getByRole('button', { name: '保存项目' }));
    const saved = downloadText();
    expect(JSON.parse(saved).version).toBe('2.0.0');
    expect(JSON.parse(saved).template.theme.palette).toEqual([
      '#E64B35',
      '#4DBBD5',
      '#00A087',
      '#3C5488',
      '#F39B7F',
      '#8491B4',
    ]);
    openPalettes();
    fireEvent.click(
      screen.getByRole('button', { name: '使用颜色 1：#E64B35' }),
    );
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    expectPlotColor(screen.getByTestId('svg-preview'), '#E64B35');
    const file = new File([saved], 'saved.plotfig.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', { value: async () => saved });
    fireEvent.change(screen.getByLabelText('打开项目文件'), {
      target: { files: [file] },
    });
    await waitFor(() =>
      expectPlotColor(screen.getByTestId('svg-preview'), '#4DBBD5'),
    );
    openPalettes();
    expect(screen.getByLabelText('内置配色')).toHaveValue('sci-nature-1');
  });

  it('keeps the selected source entry when different palettes share the same colors', () => {
    render(<App />);
    openPalettes();
    const selector = screen.getByLabelText('内置配色');
    fireEvent.change(selector, { target: { value: 'ppt-data-focus' } });
    expect(selector).toHaveValue('ppt-data-focus');
    expect(
      screen.getByRole('link', { name: '来源：颜色代码表 · Data Focus' }),
    ).toHaveAttribute(
      'href',
      'https://www.ysdaima.com/palettes/ppt-data-focus',
    );
  });

  it('previews and applies a palette or individual swatch without losing bindings', async () => {
    render(<App />);
    await loadData();
    fireEvent.change(screen.getByLabelText('曲线 1 X 数据列'), {
      target: { value: 'time' },
    });
    const preview = screen.getByTestId('svg-preview');
    const original = preview.innerHTML;
    openPalettes();
    selectNature();
    const draft = screen.getByLabelText('修改后的图形预览');
    expectPlotColor(draft, '#E64B35');
    expect(preview.innerHTML).toBe(original);
    fireEvent.click(
      screen.getByRole('button', { name: '使用颜色 2：#4DBBD5' }),
    );
    expectPlotColor(draft, '#4DBBD5');
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expectPlotColor(preview, '#4DBBD5');
    expect(screen.getByLabelText('曲线 1 X 数据列')).toHaveValue('time');
    expect(screen.getByLabelText('绘制方式')).toHaveValue('line-markers');
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    openPalettes();
    expect(screen.getByLabelText('内置配色')).toHaveValue('sci-nature-1');
    expect(
      screen.getByRole('button', { name: '使用颜色 2：#4DBBD5' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('searches names and tags and keeps the applied palette when the query has no matches', () => {
    render(<App />);
    openPalettes();
    selectNature();
    const search = screen.getByLabelText('搜索配色');
    fireEvent.change(search, { target: { value: '  ORIGIN  ' } });
    expect(
      screen.getByRole('option', { name: 'Origin Default · 6 色' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Viridis Heatmap · 6 色' }),
    ).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: '不存在的色板' } });
    expect(
      screen.getByText('没有匹配的配色，请尝试其他名称或标签。'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('内置配色')).toHaveValue('sci-nature-1');
    fireEvent.change(search, { target: { value: '' } });
    expect(
      within(screen.getByLabelText('内置配色')).getAllByRole('option'),
    ).toHaveLength(261);
  });

  it('discards palette drafts on cancel and supports selection before loading data', async () => {
    render(<App />);
    openPalettes();
    selectNature();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    openPalettes();
    expect(screen.getByLabelText('内置配色')).toHaveValue('');
    selectNature();
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    await loadData();
    expectPlotColor(screen.getByTestId('svg-preview'), '#E64B35');
  });

  it('keeps hollow markers when recoloring and permits manual color overrides', async () => {
    render(<App />);
    await loadData();
    openPalettes();
    fireEvent.click(screen.getByRole('tab', { name: '符号' }));
    fireEvent.click(screen.getByLabelText('符号无填充'));
    fireEvent.click(screen.getByRole('tab', { name: '配色' }));
    selectNature();
    const draft = screen.getByLabelText('修改后的图形预览');
    expect(draft.querySelector('[data-role="marker"]')).toHaveAttribute(
      'fill',
      'none',
    );
    expect(draft.querySelector('[data-role="marker"]')).toHaveAttribute(
      'stroke',
      '#E64B35',
    );
    fireEvent.click(screen.getByRole('tab', { name: '线条' }));
    fireEvent.change(screen.getByLabelText('线条颜色'), {
      target: { value: '#123456' },
    });
    fireEvent.click(screen.getByRole('tab', { name: '配色' }));
    expect(
      screen.getByRole('button', { name: '使用颜色 1：#E64B35' }),
    ).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    expect(
      screen.getByTestId('svg-preview').querySelector('path'),
    ).toHaveAttribute('stroke', '#123456');
  });
});
