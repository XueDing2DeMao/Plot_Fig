// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlotSettingsPanel } from './PlotSettingsPanel.js';

describe('PlotSettingsPanel', () => {
  afterEach(cleanup);

  it('renders the three modes and the controlled selection', () => {
    render(<PlotSettingsPanel mode="line-markers" onModeChange={vi.fn()} />);

    const select = screen.getByLabelText('绘制方式');
    expect(select).toHaveValue('line-markers');
    expect(screen.getByRole('option', { name: '散点' })).toHaveValue('markers');
    expect(screen.getByRole('option', { name: '折线' })).toHaveValue('line');
    expect(screen.getByRole('option', { name: '折线 + 标记' })).toHaveValue(
      'line-markers',
    );
    expect(screen.getByText(/线条与数据标记/)).toBeInTheDocument();
  });

  it('emits a valid mode', () => {
    const onModeChange = vi.fn();
    render(<PlotSettingsPanel mode="markers" onModeChange={onModeChange} />);

    fireEvent.change(screen.getByLabelText('绘制方式'), {
      target: { value: 'line' },
    });

    expect(onModeChange).toHaveBeenCalledWith('line');
  });

  it('keeps a visible keyboard focus indicator contract', () => {
    render(<PlotSettingsPanel mode="line" onModeChange={vi.fn()} />);
    const select = screen.getByLabelText('绘制方式');

    select.focus();
    expect(select).toHaveFocus();
    expect(select).toHaveAttribute('aria-describedby', 'plot-mode-help');
  });
});
