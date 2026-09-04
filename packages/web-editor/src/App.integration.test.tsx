// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App.js';

describe('web editor data pipeline', () => {
  afterEach(cleanup);

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
});
