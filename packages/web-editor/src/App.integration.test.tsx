// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.js';

describe('web editor data pipeline', () => {
  it('reads a local CSV and renders an SVG preview', async () => {
    render(<App />);
    const file = new File(['X,Y\n0,1\n1,2'], 'xy.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: async () => 'X,Y\n0,1\n1,2',
    });
    fireEvent.change(screen.getByLabelText('选择 CSV 文件'), {
      target: { files: [file] },
    });
    await waitFor(() => expect(screen.getByText('xy.csv')).toBeInTheDocument());
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('svg-preview')).toContainElement(
        screen.getByRole('img', { name: 'XY 图形预览' }),
      ),
    );
  });
});
