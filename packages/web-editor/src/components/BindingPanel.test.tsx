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
import { addSeries } from '../state/series-operations.js';
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

function twoSeriesFixture() {
  const { template, data } = fixture();
  const added = addSeries(template, {});
  if (!added.ok) throw new Error(added.message);
  return { template: added.value.template, data };
}

const noSeriesActions = {
  onAddSeries: () => undefined,
  onDuplicateSeries: () => undefined,
  onRemoveSeries: () => undefined,
  onMoveSeries: () => undefined,
};

describe('BindingPanel', () => {
  afterEach(cleanup);

  it('renders controlled DataSlot selectors and emits one binding change', () => {
    const onBindingChange = vi.fn();
    const { template, data } = fixture();
    render(
      <BindingPanel
        {...noSeriesActions}
        template={template}
        data={data}
        overrides={{}}
        onBindingChange={onBindingChange}
      />,
    );

    expect(screen.getByLabelText('曲线 1 X 数据列')).toHaveValue('');
    expect(
      screen.getByRole('option', { name: '自动匹配（X）' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('option', { name: 'Group · category' }),
    ).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('曲线 1 Y 数据列'), {
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
        {...noSeriesActions}
        template={template}
        data={invalid}
        overrides={{ 'slot-y': 'group' }}
        onBindingChange={() => undefined}
      />,
    );

    const select = screen.getByLabelText('曲线 1 Y 数据列');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveValue('group');
    expect(select).toHaveAccessibleDescription(/需要 number/);
  });

  it('groups bindings by series and emits series actions', () => {
    const { template, data } = twoSeriesFixture();
    const onAddSeries = vi.fn();
    const onDuplicateSeries = vi.fn();
    const onRemoveSeries = vi.fn();
    const onMoveSeries = vi.fn();
    render(
      <BindingPanel
        template={template}
        data={data}
        overrides={{}}
        onBindingChange={() => undefined}
        onAddSeries={onAddSeries}
        onDuplicateSeries={onDuplicateSeries}
        onRemoveSeries={onRemoveSeries}
        onMoveSeries={onMoveSeries}
      />,
    );

    expect(
      screen.getByRole('group', { name: '曲线 1 数据绑定' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: '曲线 2 数据绑定' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上移曲线 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '下移曲线 2' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
    fireEvent.click(screen.getByRole('button', { name: '复制曲线 2' }));
    fireEvent.click(screen.getByRole('button', { name: '删除曲线 2' }));
    fireEvent.click(screen.getByRole('button', { name: '上移曲线 2' }));

    expect(onAddSeries).toHaveBeenCalledOnce();
    expect(onDuplicateSeries).toHaveBeenCalledWith('series-2');
    expect(onRemoveSeries).toHaveBeenCalledWith('series-2');
    expect(onMoveSeries).toHaveBeenCalledWith('series-2', 'up');
  });

  it('disables deleting the last series', () => {
    const { template, data } = fixture();
    render(
      <BindingPanel
        {...noSeriesActions}
        template={template}
        data={data}
        overrides={{}}
        onBindingChange={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: '删除曲线 1' })).toBeDisabled();
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
