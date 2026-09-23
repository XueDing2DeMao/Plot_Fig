// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExportControls } from './ExportControls.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('export controls', () => {
  it('updates the resolution choices when the page aspect ratio changes', () => {
    const { rerender } = render(
      <ExportControls svg={'<svg viewBox="0 0 432 288"/>'} />,
    );
    expect(
      screen.getByRole('option', { name: '2× · 2000 × 1333' }),
    ).toBeInTheDocument();
    rerender(<ExportControls svg={'<svg viewBox="0 0 288 432"/>'} />);
    expect(
      screen.getByRole('option', { name: '2× · 2000 × 3000' }),
    ).toBeInTheDocument();
  });
  it('disables export when there is no valid preview', () => {
    render(<ExportControls svg={undefined} />);
    expect(screen.getByRole('button', { name: '下载 SVG' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '下载 PNG' })).toBeDisabled();
    expect(screen.getByLabelText('PNG 分辨率')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      '暂无可导出的图形，请先绑定数据并应用设置。',
    );
  });

  it('shows the custom dimensions instead of an inactive PNG scale', () => {
    render(<ExportControls svg={'<svg viewBox="0 0 432 288"/>'} />);
    fireEvent.click(screen.getByRole('button', { name: '范围与尺寸' }));
    fireEvent.click(screen.getByLabelText('精确像素尺寸'));
    fireEvent.change(screen.getByLabelText('输出宽度 (px)'), {
      target: { value: '2400' },
    });
    expect(screen.getByLabelText('PNG 分辨率')).toBeDisabled();
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent(
      '自定义 · 2400 × 1333',
    );
    fireEvent.click(screen.getByLabelText('精确像素尺寸'));
    expect(screen.getByLabelText('PNG 分辨率')).toBeEnabled();
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent(
      '2× · 2000 × 1333',
    );
  });

  it('shows an error and allows retry after a PNG failure', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:failed');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.stubGlobal(
      'Image',
      class {
        onerror: (() => void) | null = null;
        set src(_value: string) {
          queueMicrotask(() => this.onerror?.());
        }
      },
    );
    render(
      <ExportControls
        svg={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800"/>'}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '下载 PNG' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('加载'),
    );
    expect(screen.getByRole('button', { name: '下载 PNG' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '下载 SVG' })).toBeEnabled();
  });
});
