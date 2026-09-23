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
import { OriginExportDialog } from './OriginExportDialog.js';
import { downloadBlob } from '../browser/figure-export.js';

vi.mock('../browser/figure-export.js', async (original) => ({
  ...(await original<object>()),
  downloadBlob: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="6in" height="4in" viewBox="0 0 432 288"><rect data-role="page-background" width="432" height="288" fill="white"/></svg>';
it('presents physical size and automatic DPI dimensions with editable manual pixels', () => {
  render(<OriginExportDialog svg={svg} name="Graph1" onDismiss={() => {}} />);
  expect(screen.getByLabelText('DPI')).toHaveValue(300);
  expect(screen.getByLabelText('像素宽度')).toHaveValue(1800);
  expect(screen.getByLabelText('像素高度')).toHaveValue(1200);
  expect(screen.getByLabelText('像素宽度')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('DPI'), { target: { value: '600' } });
  expect(screen.getByLabelText('像素宽度')).toHaveValue(3600);
  fireEvent.click(screen.getByLabelText('自动计算像素尺寸'));
  expect(screen.getByLabelText('像素宽度')).toBeEnabled();
});
it('previews and downloads the named SVG with the selected background', async () => {
  render(<OriginExportDialog svg={svg} name="Graph1" onDismiss={() => {}} />);
  fireEvent.change(screen.getByLabelText('图像类型'), {
    target: { value: 'svg' },
  });
  fireEvent.change(screen.getByLabelText('文件名'), {
    target: { value: 'Results.v2' },
  });
  fireEvent.click(screen.getByLabelText('透明页面背景'));
  fireEvent.click(screen.getByRole('button', { name: '预览' }));
  await waitFor(() =>
    expect(
      document.querySelector('[aria-label="导出预览"]'),
    ).toBeInTheDocument(),
  );
  expect(
    document.querySelector('[data-role="page-background"]'),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '导出 SVG' }));
  await waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce());
  expect(vi.mocked(downloadBlob).mock.calls[0]!.slice(1)).toEqual([
    'Results.v2.svg',
    'svg',
  ]);
});
it('blocks empty filenames and missing previews', () => {
  render(
    <OriginExportDialog svg={undefined} name="Graph1" onDismiss={() => {}} />,
  );
  expect(screen.getByRole('button', { name: '导出 PNG' })).toBeDisabled();
});
it('rejects an empty file name and invalid manual sizes without exporting', () => {
  render(<OriginExportDialog svg={svg} name="Graph1" onDismiss={() => {}} />);
  fireEvent.change(screen.getByLabelText('文件名'), {
    target: { value: '   ' },
  });
  expect(screen.getByRole('button', { name: '导出 PNG' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('请输入文件名');
  fireEvent.change(screen.getByLabelText('文件名'), {
    target: { value: 'Graph1' },
  });
  fireEvent.click(screen.getByLabelText('自动计算像素尺寸'));
  fireEvent.change(screen.getByLabelText('像素宽度'), {
    target: { value: '99999' },
  });
  expect(screen.getByRole('button', { name: '导出 PNG' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('像素尺寸');
  expect(downloadBlob).not.toHaveBeenCalled();
});
