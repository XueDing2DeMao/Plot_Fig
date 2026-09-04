// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  bindDataSlots,
  inferDataBindingSet,
  parseCsvText,
} from '@plot-fig/data-binding';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultTemplate } from '../state/editor-state.js';
import { BindingPanel } from './BindingPanel.js';
import { ColumnSummary } from './ColumnSummary.js';

function fixture() {
  const parsed = parseCsvText('X,Y,Group\n0,1,A\n1,2,B', 'sample.csv');
  if (!parsed.ok) throw new Error('fixture must parse');
  const template = defaultTemplate();
  const data = bindDataSlots(
    template,
    inferDataBindingSet(parsed.rows, 'sample.csv'),
  );
  return { template, data };
}

describe('BindingPanel', () => {
  afterEach(cleanup);

  it('renders controlled DataSlot selectors and emits one binding change', () => {
    const onBindingChange = vi.fn();
    const { template, data } = fixture();
    render(
      <BindingPanel
        template={template}
        data={data}
        overrides={{}}
        onBindingChange={onBindingChange}
      />,
    );

    expect(screen.getByLabelText('X 数据列')).toHaveValue('');
    expect(
      screen.getByRole('option', { name: '自动匹配（X）' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('option', { name: 'Group · category' }),
    ).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('Y 数据列'), {
      target: { value: 'group' },
    });
    expect(onBindingChange).toHaveBeenCalledWith({
      dataSlotId: 'slot-y',
      columnId: 'group',
    });
  });

  it('associates invalid slot text with the selector', () => {
    const { template, data } = fixture();
    const invalid = bindDataSlots(template, data, { 'slot-y': 'group' });
    render(
      <BindingPanel
        template={template}
        data={invalid}
        overrides={{ 'slot-y': 'group' }}
        onBindingChange={() => undefined}
      />,
    );

    const select = screen.getByLabelText('Y 数据列');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveValue('group');
    expect(select).toHaveAccessibleDescription(/需要 number/);
  });

  it('shows the read-only column overview with bound roles', () => {
    const { data } = fixture();
    render(<ColumnSummary data={data} />);

    expect(
      screen.getByRole('region', { name: '可用数据列' }),
    ).toBeInTheDocument();
    expect(screen.getByText('X · number')).toBeInTheDocument();
    expect(screen.getByText('Group · category')).toBeInTheDocument();
  });
});
