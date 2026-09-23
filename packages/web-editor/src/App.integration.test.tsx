// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  confirmDataImport,
  confirmPlot,
  openDataPreview,
  closeDataPreview,
} from './test-utils/import-data.js';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App.js';

describe('web editor data pipeline', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderedPlot(preview: HTMLElement) {
    return {
      paths: preview.querySelectorAll('svg path'),
      markers: preview.querySelectorAll('[data-role="marker"]'),
    };
  }

  async function uploadCsv(csv: string) {
    const file = new File([csv], 'xy.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: async () => csv,
    });
    fireEvent.change(screen.getByLabelText('选择数据文件'), {
      target: { files: [file] },
    });
    await confirmDataImport();
    confirmPlot();
  }

  it('reads a local CSV and renders an SVG preview', async () => {
    render(<App />);
    await uploadCsv('X,Y\n0,1\n1,2');
    openDataPreview();
    expect(screen.getByRole('columnheader', { name: 'X' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Y' })).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: '数据表预览' }),
    ).not.toHaveTextContent(/\b(number|string|category)\b/);
    closeDataPreview();
    expect(screen.getByLabelText('曲线 1 Y 数据列')).not.toHaveTextContent(
      /\b(number|string|category)\b/,
    );
    await waitFor(() =>
      expect(screen.getByTestId('svg-preview')).toContainElement(
        screen.getByRole('img', { name: '图形预览' }),
      ),
    );
    expect(
      screen
        .getByTestId('svg-preview')
        .querySelectorAll('[data-role="marker"]'),
    ).toHaveLength(2);
  });

  it('使用曲线一选择的数据列名称作为默认横纵轴名称', async () => {
    render(<App />);
    await uploadCsv('时间,温度,序号\n0,10,1\n1,20,2');
    const preview = screen.getByTestId('svg-preview');

    await waitFor(() =>
      expect(
        Array.from(
          preview.querySelectorAll('[data-role="axis-title"]'),
          (element) => element.textContent,
        ),
      ).toEqual(expect.arrayContaining(['时间', '温度'])),
    );

    const xColumn = screen.getByLabelText('曲线 1 X 数据列');
    const sequence = within(xColumn).getByRole('option', {
      name: '序号',
    }) as HTMLOptionElement;
    fireEvent.change(xColumn, { target: { value: sequence.value } });
    confirmPlot();

    await waitFor(() =>
      expect(
        Array.from(
          preview.querySelectorAll('[data-role="axis-title"]'),
          (element) => element.textContent,
        ),
      ).toEqual(expect.arrayContaining(['序号', '温度'])),
    );
  });

  it('双击图片中的坐标轴名称后直接修改并保留手动名称', async () => {
    render(<App />);
    await uploadCsv('时间,温度,序号\n0,10,1\n1,20,2');
    const preview = screen.getByTestId('svg-preview');
    const axisTitle = () =>
      Array.from(preview.querySelectorAll('[data-role="axis-title"]')).find(
        (element) => element.textContent === '时间',
      );
    await waitFor(() => expect(axisTitle()).toBeDefined());

    fireEvent.doubleClick(axisTitle()!);
    const input = screen.getByLabelText('修改坐标轴名称');
    fireEvent.change(input, { target: { value: '采样时间' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(
        Array.from(
          preview.querySelectorAll('[data-role="axis-title"]'),
          (element) => element.textContent,
        ),
      ).toContain('采样时间'),
    );

    const xColumn = screen.getByLabelText('曲线 1 X 数据列');
    const sequence = within(xColumn).getByRole('option', {
      name: '序号',
    }) as HTMLOptionElement;
    fireEvent.change(xColumn, { target: { value: sequence.value } });
    confirmPlot();
    await waitFor(() =>
      expect(
        Array.from(
          preview.querySelectorAll('[data-role="axis-title"]'),
          (element) => element.textContent,
        ),
      ).toContain('采样时间'),
    );
  });

  it('applies valid bindings and preserves the previous graph for invalid bindings', async () => {
    render(<App />);
    await uploadCsv('X,Y,Time,Signal,Group\n0,1,10,7,A\n1,2,20,5,B');
    openDataPreview();
    fireEvent.click(screen.getByRole('button', { name: '设置 Group 列' }));
    fireEvent.change(screen.getByLabelText('列类型'), {
      target: { value: 'category' },
    });
    fireEvent.click(screen.getByRole('button', { name: '应用列设置' }));
    closeDataPreview();

    const preview = screen.getByTestId('svg-preview');
    const initialSvg = preview.querySelector('svg')?.outerHTML;
    fireEvent.change(screen.getByLabelText('曲线 1 Y 数据列'), {
      target: { value: 'signal' },
    });
    confirmPlot();
    await waitFor(() =>
      expect(preview.querySelector('svg')?.outerHTML).not.toBe(initialSvg),
    );

    fireEvent.change(screen.getByLabelText('曲线 1 Y 数据列'), {
      target: { value: 'group' },
    });
    confirmPlot();
    expect(preview.querySelector('svg')).not.toBeNull();
    expect(
      within(screen.getByRole('region', { name: '图形设置' })).getByRole(
        'alert',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('COLUMN_TYPE_CONFLICT')).toBeInTheDocument();
    expect(
      screen.getByLabelText('曲线 1 Y 数据列'),
    ).toHaveAccessibleDescription(/需要 number/);

    fireEvent.change(screen.getByLabelText('曲线 1 Y 数据列'), {
      target: { value: '' },
    });
    confirmPlot();
    await waitFor(() => expect(preview.querySelector('svg')).not.toBeNull());
  });

  it('preserves the other slot override', async () => {
    render(<App />);
    await uploadCsv('X,Y,Time,Signal\n0,1,10,7\n1,2,20,5');

    fireEvent.change(screen.getByLabelText('曲线 1 X 数据列'), {
      target: { value: 'time' },
    });
    confirmPlot();
    fireEvent.change(screen.getByLabelText('曲线 1 Y 数据列'), {
      target: { value: 'signal' },
    });
    confirmPlot();

    expect(screen.getByLabelText('曲线 1 X 数据列')).toHaveValue('time');
    expect(screen.getByLabelText('曲线 1 Y 数据列')).toHaveValue('signal');
  });

  it('adds, independently binds, reorders, and removes series', async () => {
    render(<App />);
    await uploadCsv('X,Y1,Y2\n0,1,10\n1,2,20');

    fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
    fireEvent.change(screen.getByLabelText('曲线 2 Y 数据列'), {
      target: { value: 'y2' },
    });
    confirmPlot();
    await waitFor(() =>
      expect(
        screen
          .getByTestId('svg-preview')
          .querySelectorAll('[data-role="plot-slot"]'),
      ).toHaveLength(2),
    );

    fireEvent.click(screen.getByRole('button', { name: '上移曲线 2' }));
    confirmPlot();
    const ordered = screen
      .getByTestId('svg-preview')
      .querySelectorAll('[data-role="plot-slot"]');
    expect(ordered[0]).toHaveAttribute('data-plot-slot-id', 'series-2');
    expect(screen.getByLabelText('曲线 1 Y 数据列')).toHaveValue('y2');

    fireEvent.click(screen.getByRole('button', { name: '删除曲线 1' }));
    confirmPlot();
    expect(screen.getByRole('button', { name: '删除曲线 1' })).toBeDisabled();
    expect(
      screen
        .getByTestId('svg-preview')
        .querySelectorAll('[data-role="plot-slot"]'),
    ).toHaveLength(1);
  });

  it('keeps valid series visible when another binding is invalid', async () => {
    render(<App />);
    await uploadCsv('X,Y,Group\n0,1,A\n1,2,B');
    openDataPreview();
    fireEvent.click(screen.getByRole('button', { name: '设置 Group 列' }));
    fireEvent.change(screen.getByLabelText('列类型'), {
      target: { value: 'category' },
    });
    fireEvent.click(screen.getByRole('button', { name: '应用列设置' }));
    closeDataPreview();
    fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
    fireEvent.change(screen.getByLabelText('曲线 2 Y 数据列'), {
      target: { value: 'group' },
    });
    confirmPlot();

    await waitFor(() =>
      expect(
        screen
          .getByTestId('svg-preview')
          .querySelectorAll('[data-role="plot-slot"]'),
      ).toHaveLength(1),
    );
    expect(screen.getByText('COLUMN_TYPE_CONFLICT')).toBeInTheDocument();
    expect(screen.getByLabelText('曲线 2 Y 数据列')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('duplicates the selected series with its independent binding', async () => {
    render(<App />);
    await uploadCsv('X,Y,Signal\n0,1,7\n1,2,5');
    fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
    fireEvent.change(screen.getByLabelText('曲线 2 Y 数据列'), {
      target: { value: 'signal' },
    });
    confirmPlot();
    fireEvent.click(screen.getByRole('button', { name: '复制曲线 2' }));
    confirmPlot();

    expect(screen.getByLabelText('曲线 3 Y 数据列')).toHaveValue('signal');
    expect(
      screen
        .getByTestId('svg-preview')
        .querySelectorAll('[data-role="plot-slot"]'),
    ).toHaveLength(3);
  });

  it('通过线型和标记符号切换预览中的线与数据点', async () => {
    render(<App />);
    await uploadCsv('X,Y\n0,1\n1,2');
    const preview = screen.getByTestId('svg-preview');

    await waitFor(() => expect(renderedPlot(preview).paths).toHaveLength(1));
    expect(renderedPlot(preview).markers).toHaveLength(2);

    fireEvent.click(screen.getByRole('radio', { name: '线型：无线条' }));
    confirmPlot();
    await waitFor(() => expect(renderedPlot(preview).paths).toHaveLength(0));
    expect(renderedPlot(preview).markers).toHaveLength(2);

    fireEvent.click(screen.getByRole('radio', { name: '线型：实线' }));
    fireEvent.click(screen.getByRole('radio', { name: '标记符号：无标记' }));
    confirmPlot();
    await waitFor(() => expect(renderedPlot(preview).paths).toHaveLength(1));
    expect(renderedPlot(preview).markers).toHaveLength(0);

    fireEvent.click(screen.getByRole('radio', { name: '标记符号：圆形' }));
    confirmPlot();
    await waitFor(() => expect(renderedPlot(preview).paths).toHaveLength(1));
    expect(renderedPlot(preview).markers).toHaveLength(2);
  });

  it('preserves DataSlot overrides while changing plot mode', async () => {
    render(<App />);
    await uploadCsv('X,Y,Time,Signal\n0,1,10,7\n1,2,20,5');
    fireEvent.change(screen.getByLabelText('曲线 1 X 数据列'), {
      target: { value: 'time' },
    });
    confirmPlot();
    fireEvent.click(screen.getByRole('radio', { name: '标记符号：无标记' }));
    confirmPlot();

    expect(screen.getByLabelText('曲线 1 X 数据列')).toHaveValue('time');
    expect(
      screen.getByRole('radio', { name: '标记符号：无标记' }),
    ).toBeChecked();
    expect(screen.getByTestId('svg-preview')).toContainElement(
      screen.getByRole('img', { name: '图形预览' }),
    );
  });

  it('allows selecting a mode before CSV load', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: '线型：无线条' }));
    confirmPlot();

    expect(screen.getByRole('radio', { name: '线型：无线条' })).toBeChecked();
    expect(screen.getByTestId('svg-preview').querySelector('svg')).toBeNull();
  });

  it('saves and reopens a project with the current mode and bindings', async () => {
    render(<App />);
    await uploadCsv('X,Y,Time\n0,1,10\n1,2,20');
    fireEvent.change(screen.getByLabelText('曲线 1 X 数据列'), {
      target: { value: 'time' },
    });
    confirmPlot();
    fireEvent.click(screen.getByRole('radio', { name: '线型：无线条' }));
    confirmPlot();
    expect(screen.getByRole('button', { name: '保存项目' })).toBeEnabled();

    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:project');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL');
    const blobConstructor = vi.spyOn(globalThis, 'Blob');
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: '保存项目' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:project');
    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    const serialized = String(blobConstructor.mock.calls[0]![0]![0]);
    expect(serialized).toContain('"kind": "plot-fig-project"');
    expect(serialized).toContain('"mode": "markers"');

    const projectFile = new File([serialized], 'saved.plotfig.json', {
      type: 'application/json',
    });
    fireEvent.change(screen.getByLabelText('打开项目文件'), {
      target: { files: [projectFile] },
    });
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: '线型：无线条' })).toBeChecked(),
    );
    expect(screen.getByLabelText('曲线 1 X 数据列')).toHaveValue('time');
    expect(
      screen.getByTestId('svg-preview').querySelector('svg'),
    ).not.toBeNull();
  });

  it('round trips multi-series order and independent bindings', async () => {
    render(<App />);
    await uploadCsv('X,Y1,Y2\n0,1,10\n1,2,20');
    fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
    fireEvent.change(screen.getByLabelText('曲线 2 Y 数据列'), {
      target: { value: 'y2' },
    });
    confirmPlot();
    fireEvent.click(screen.getByRole('button', { name: '上移曲线 2' }));
    confirmPlot();
    fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
    const dialog = within(screen.getByRole('dialog', { name: /绘图细节/ }));
    fireEvent.change(dialog.getByLabelText('线条颜色'), {
      target: { value: '#ff0000' },
    });
    fireEvent.click(dialog.getByRole('button', { name: '应用' }));
    fireEvent.click(dialog.getByRole('button', { name: '取消' }));

    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:multi-series');
    vi.spyOn(URL, 'revokeObjectURL');
    const blobConstructor = vi.spyOn(globalThis, 'Blob');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
    fireEvent.click(screen.getByRole('button', { name: '保存项目' }));
    const serialized = String(blobConstructor.mock.calls[0]![0]![0]);
    expect(serialized).toContain('"plotSlotId": "series-2"');

    fireEvent.click(screen.getByRole('button', { name: '删除曲线 1' }));
    confirmPlot();
    const projectFile = new File([serialized], 'multi.plotfig.json', {
      type: 'application/json',
    });
    fireEvent.change(screen.getByLabelText('打开项目文件'), {
      target: { files: [projectFile] },
    });
    fireEvent.click(screen.getByRole('button', { name: '放弃修改并打开' }));

    await waitFor(() =>
      expect(
        screen.getAllByRole('group', { name: /曲线 \d+ 数据绑定/ }),
      ).toHaveLength(2),
    );
    expect(screen.getByLabelText('曲线 1 Y 数据列')).toHaveValue('y2');
    await waitFor(() => {
      expect(
        screen
          .getByTestId('svg-preview')
          .querySelectorAll('[data-role="plot-slot"]'),
      ).toHaveLength(2);
      expect(
        screen
          .getByTestId('svg-preview')
          .querySelector('[data-role="plot-slot"] path'),
      ).toHaveAttribute('stroke', '#ff0000');
    });
  });

  it('retains the preview and shows a diagnostic for an invalid project', async () => {
    render(<App />);
    await uploadCsv('X,Y\n0,1\n1,2');
    const invalid = new File(['{"kind":"bad"}'], 'bad.plotfig.json', {
      type: 'application/json',
    });
    fireEvent.change(screen.getByLabelText('打开项目文件'), {
      target: { files: [invalid] },
    });
    fireEvent.click(screen.getByRole('button', { name: '放弃修改并打开' }));
    await waitFor(() =>
      expect(screen.getByText('PROJECT_INVALID')).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId('svg-preview').querySelector('svg'),
    ).not.toBeNull();
  });
});
