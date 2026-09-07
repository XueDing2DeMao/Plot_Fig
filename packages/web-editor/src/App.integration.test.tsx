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
import App from './App.js';

describe('web editor data pipeline', () => {
  afterEach(cleanup);

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
    fireEvent.change(screen.getByLabelText('选择 CSV 文件'), {
      target: { files: [file] },
    });
    await waitFor(() => expect(screen.getByText('xy.csv')).toBeInTheDocument());
  }

  it('reads a local CSV and renders an SVG preview', async () => {
    render(<App />);
    await uploadCsv('X,Y\n0,1\n1,2');
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('svg-preview')).toContainElement(
        screen.getByRole('img', { name: 'XY 图形预览' }),
      ),
    );
    expect(
      screen
        .getByTestId('svg-preview')
        .querySelectorAll('[data-role="marker"]'),
    ).toHaveLength(2);
  });

  it('rebinds slots and refreshes or clears the preview', async () => {
    render(<App />);
    await uploadCsv('X,Y,Time,Signal,Group\n0,1,10,7,A\n1,2,20,5,B');

    const preview = screen.getByTestId('svg-preview');
    const initialSvg = preview.querySelector('svg')?.outerHTML;
    fireEvent.change(screen.getByLabelText('Y 数据列'), {
      target: { value: 'signal' },
    });
    await waitFor(() =>
      expect(preview.querySelector('svg')?.outerHTML).not.toBe(initialSvg),
    );

    fireEvent.change(screen.getByLabelText('Y 数据列'), {
      target: { value: 'group' },
    });
    await waitFor(() => expect(preview.querySelector('svg')).toBeNull());
    expect(screen.getByText('COLUMN_TYPE_CONFLICT')).toBeInTheDocument();
    expect(screen.getByLabelText('Y 数据列')).toHaveAccessibleDescription(
      /需要 number/,
    );

    fireEvent.change(screen.getByLabelText('Y 数据列'), {
      target: { value: '' },
    });
    await waitFor(() => expect(preview.querySelector('svg')).not.toBeNull());
  });

  it('preserves the other slot override', async () => {
    render(<App />);
    await uploadCsv('X,Y,Time,Signal\n0,1,10,7\n1,2,20,5');

    fireEvent.change(screen.getByLabelText('X 数据列'), {
      target: { value: 'time' },
    });
    fireEvent.change(screen.getByLabelText('Y 数据列'), {
      target: { value: 'signal' },
    });

    expect(screen.getByLabelText('X 数据列')).toHaveValue('time');
    expect(screen.getByLabelText('Y 数据列')).toHaveValue('signal');
  });

  it('switches SVG output among markers, line, and line-markers', async () => {
    render(<App />);
    await uploadCsv('X,Y\n0,1\n1,2');
    const preview = screen.getByTestId('svg-preview');
    const mode = screen.getByLabelText('绘制方式');

    await waitFor(() => expect(renderedPlot(preview).paths).toHaveLength(1));
    expect(renderedPlot(preview).markers).toHaveLength(2);

    fireEvent.change(mode, { target: { value: 'markers' } });
    await waitFor(() => expect(renderedPlot(preview).paths).toHaveLength(0));
    expect(renderedPlot(preview).markers).toHaveLength(2);

    fireEvent.change(mode, { target: { value: 'line' } });
    await waitFor(() => expect(renderedPlot(preview).paths).toHaveLength(1));
    expect(renderedPlot(preview).markers).toHaveLength(0);

    fireEvent.change(mode, { target: { value: 'line-markers' } });
    await waitFor(() => expect(renderedPlot(preview).paths).toHaveLength(1));
    expect(renderedPlot(preview).markers).toHaveLength(2);
  });

  it('preserves DataSlot overrides while changing plot mode', async () => {
    render(<App />);
    await uploadCsv('X,Y,Time,Signal\n0,1,10,7\n1,2,20,5');
    fireEvent.change(screen.getByLabelText('X 数据列'), {
      target: { value: 'time' },
    });
    fireEvent.change(screen.getByLabelText('绘制方式'), {
      target: { value: 'line' },
    });

    expect(screen.getByLabelText('X 数据列')).toHaveValue('time');
    expect(screen.getByLabelText('绘制方式')).toHaveValue('line');
    expect(screen.getByTestId('svg-preview')).toContainElement(
      screen.getByRole('img', { name: 'XY 图形预览' }),
    );
  });

  it('allows selecting a mode before CSV load', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('绘制方式'), {
      target: { value: 'markers' },
    });

    expect(screen.getByLabelText('绘制方式')).toHaveValue('markers');
    expect(screen.getByTestId('svg-preview').querySelector('svg')).toBeNull();
  });

  it('saves and reopens a project with the current mode and bindings', async () => {
    render(<App />);
    await uploadCsv('X,Y,Time\n0,1,10\n1,2,20');
    fireEvent.change(screen.getByLabelText('X 数据列'), {
      target: { value: 'time' },
    });
    fireEvent.change(screen.getByLabelText('绘制方式'), {
      target: { value: 'markers' },
    });
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
      expect(screen.getByLabelText('绘制方式')).toHaveValue('markers'),
    );
    expect(screen.getByLabelText('X 数据列')).toHaveValue('time');
    expect(
      screen.getByTestId('svg-preview').querySelector('svg'),
    ).not.toBeNull();
  });

  it('clears the preview and shows a diagnostic for an invalid project', async () => {
    render(<App />);
    await uploadCsv('X,Y\n0,1\n1,2');
    const invalid = new File(['{"kind":"bad"}'], 'bad.plotfig.json', {
      type: 'application/json',
    });
    fireEvent.change(screen.getByLabelText('打开项目文件'), {
      target: { files: [invalid] },
    });
    await waitFor(() =>
      expect(screen.getByText('PROJECT_INVALID')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('svg-preview').querySelector('svg')).toBeNull();
  });
});
