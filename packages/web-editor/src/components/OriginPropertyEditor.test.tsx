// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { confirmDataImport } from '../test-utils/import-data.js';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App.js';

afterEach(cleanup);
describe('Origin category workflow', () => {
  it('applies page and curve drafts separately from axis drafts', async () => {
    render(<App />);
    const csv = 'X,Y\n1,2\n10,4';
    const file = new File([csv], 'plot.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { value: async () => csv });
    fireEvent.change(screen.getByLabelText('选择数据文件'), {
      target: { files: [file] },
    });
    await confirmDataImport();
    await screen.findByRole('img', { name: '图形预览' });
    fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
    const ui = within(screen.getByRole('dialog', { name: /绘图细节/ }));
    expect(
      ui.getByRole('navigation', { name: '属性对象' }),
    ).toBeInTheDocument();
    expect(
      ui.queryByRole('button', { name: '下 X 轴' }),
    ).not.toBeInTheDocument();
    fireEvent.change(ui.getByLabelText('线条颜色'), {
      target: { value: '#222222' },
    });
    fireEvent.click(ui.getByRole('button', { name: /^图页 / }));
    fireEvent.click(ui.getByRole('tab', { name: '显示' }));
    fireEvent.change(ui.getByLabelText('图页背景颜色'), {
      target: { value: '#fafafa' },
    });
    fireEvent.click(ui.getByRole('button', { name: '应用' }));
    expect(
      screen.getByTestId('svg-preview').querySelector('path'),
    ).toHaveAttribute('stroke', '#222222');
    fireEvent.click(ui.getByRole('button', { name: '取消' }));
    fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /X 轴/ }));
    const axis = within(screen.getByRole('dialog', { name: '坐标轴属性' }));
    fireEvent.click(axis.getByRole('tab', { name: '标题' }));
    fireEvent.change(axis.getByLabelText('X 轴标题'), {
      target: { value: 'Time' },
    });
    fireEvent.click(axis.getByRole('button', { name: '应用' }));
    expect(screen.getByTestId('svg-preview')).toHaveTextContent('Time');
    fireEvent.change(axis.getByLabelText('X 轴标题'), {
      target: { value: 'discard' },
    });
    fireEvent.click(axis.getByRole('button', { name: '取消' }));
    expect(screen.getByTestId('svg-preview')).toHaveTextContent('Time');
    expect(screen.getByTestId('svg-preview')).not.toHaveTextContent('discard');
  });

  it('hides symbols with the visibility checkbox and supports empty fills', async () => {
    render(<App />);
    const csv = 'X,Y\n1,2\n2,4';
    const file = new File([csv], 'plot.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { value: async () => csv });
    fireEvent.change(screen.getByLabelText('选择数据文件'), {
      target: { files: [file] },
    });
    await confirmDataImport();
    await screen.findByRole('img', { name: '图形预览' });
    fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
    const dialog = screen.getByRole('dialog', { name: /绘图细节/ });
    const ui = within(dialog);
    const draft = ui.getByLabelText('修改后的图形预览');

    fireEvent.click(ui.getByRole('tab', { name: '符号' }));
    fireEvent.click(ui.getByLabelText('显示符号'));
    expect(ui.getByLabelText('显示符号')).not.toBeChecked();
    expect(draft.querySelector('[data-role="marker"]')).toBeNull();
    fireEvent.click(ui.getByRole('button', { name: '应用' }));
    expect(
      screen.getByTestId('svg-preview').querySelector('[data-role="marker"]'),
    ).toBeNull();

    fireEvent.click(ui.getByLabelText('显示符号'));
    fireEvent.change(ui.getByLabelText('符号形状'), {
      target: { value: 'square' },
    });
    fireEvent.click(ui.getByLabelText('符号无填充'));
    expect(draft.querySelector('[data-role="marker"]')).toHaveAttribute(
      'fill',
      'none',
    );

    fireEvent.click(ui.getByRole('button', { name: /^图页 / }));
    fireEvent.click(ui.getByRole('tab', { name: '显示' }));
    fireEvent.click(ui.getByLabelText('图页背景无填充'));
    expect(
      draft.querySelector('[data-role="page-background"]'),
    ).toHaveAttribute('fill', 'none');
    fireEvent.click(ui.getByRole('button', { name: '应用' }));
    expect(
      screen.getByTestId('svg-preview').querySelector('[data-role="marker"]'),
    ).toHaveAttribute('fill', 'none');
    expect(
      screen
        .getByTestId('svg-preview')
        .querySelector('[data-role="page-background"]'),
    ).toHaveAttribute('fill', 'none');
  });

  it('switches between series without leaking draft styles', async () => {
    render(<App />);
    const csv = 'X,Y1,Y2\n1,2,20\n2,4,40';
    const file = new File([csv], 'plot.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { value: async () => csv });
    fireEvent.change(screen.getByLabelText('选择数据文件'), {
      target: { files: [file] },
    });
    await confirmDataImport();
    await screen.findByRole('img', { name: '图形预览' });
    fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
    fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
    const dialog = screen.getByRole('dialog', { name: /绘图细节/ });
    const ui = within(dialog);

    expect(
      ui.getAllByRole('button', { name: /^曲线 / })[0]!,
    ).toBeInTheDocument();
    fireEvent.click(ui.getAllByRole('button', { name: /^曲线 / })[1]!);
    fireEvent.change(ui.getByLabelText('线条颜色'), {
      target: { value: '#ff0000' },
    });
    fireEvent.click(ui.getAllByRole('button', { name: /^曲线 / })[0]!);
    expect(ui.getByLabelText('线条颜色')).not.toHaveValue('#ff0000');
    fireEvent.click(ui.getAllByRole('button', { name: /^曲线 / })[1]!);
    expect(ui.getByLabelText('线条颜色')).toHaveValue('#ff0000');
    fireEvent.click(ui.getByRole('button', { name: '应用' }));

    const plots = screen
      .getByTestId('svg-preview')
      .querySelectorAll('[data-role="plot-slot"]');
    expect(plots[0]!.querySelector('path')).not.toHaveAttribute(
      'stroke',
      '#ff0000',
    );
    expect(plots[1]!.querySelector('path')).toHaveAttribute(
      'stroke',
      '#ff0000',
    );
  });
});
