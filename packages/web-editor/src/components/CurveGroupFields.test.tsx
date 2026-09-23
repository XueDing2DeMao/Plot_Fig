// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import type { CurveGroups } from '@plot-fig/figure-schema';
import { defaultTemplate } from '../state/default-template.js';
import { CurveGroupFields } from './CurveGroupFields.js';
afterEach(cleanup);
it('disables materializing a dependent group while another property draft is invalid', () => {
  const unlink = vi.fn();
  render(
    <CurveGroupFields
      value={[
        {
          groupId: 'g',
          name: '组',
          members: ['a'],
          mode: 'dependent',
          increment: 'synchronized',
          step: Number.NaN,
        },
      ]}
      plots={fixture()}
      onChange={vi.fn()}
      onUnlink={unlink}
      unlinkDisabled
    />,
  );
  const checkbox = screen.getByLabelText('组 1 依赖自动样式');
  expect(checkbox).toBeDisabled();
  fireEvent.click(checkbox);
  expect(unlink).not.toHaveBeenCalled();
});
function fixture() {
  const plot = defaultTemplate().panels[0]!.plotSlots[0]!;
  return ['a', 'b', 'c'].map((plotSlotId) => ({
    ...structuredClone(plot),
    plotSlotId,
    legendEntry: { ...plot.legendEntry, text: plotSlotId },
  }));
}
it('offers only compatible parents and prevents selecting a descendant as parent', () => {
  const plots = fixture();
  plots[2]!.yAxisId = 'other';
  const groups: CurveGroups = [
    {
      groupId: 'root',
      name: '父组',
      members: ['a'],
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
    },
    {
      groupId: 'child',
      name: '子组',
      members: ['b'],
      parentId: 'root',
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
    },
    {
      groupId: 'other',
      name: '另一坐标轴',
      members: ['c'],
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
    },
  ];
  render(<CurveGroupFields value={groups} plots={plots} onChange={vi.fn()} />);
  expect(
    within(screen.getByLabelText('组 1 父组'))
      .getAllByRole('option')
      .map((p) => p.textContent),
  ).toEqual(['无父组']);
  expect(
    within(screen.getByLabelText('组 2 父组'))
      .getAllByRole('option')
      .map((p) => p.textContent),
  ).toEqual(['无父组', '父组']);
});
it('leaves incompatible free curves unavailable as group members', () => {
  const plots = fixture();
  plots[2]!.yAxisId = 'other';
  render(
    <CurveGroupFields
      value={[
        {
          groupId: 'g',
          name: '组',
          members: ['a'],
          mode: 'dependent',
          increment: 'synchronized',
          step: 1,
        },
      ]}
      plots={plots}
      onChange={vi.fn()}
    />,
  );
  expect(screen.getByLabelText('组 1 成员 c')).toBeDisabled();
  expect(screen.getByLabelText('组 1 成员 b')).not.toBeDisabled();
});
it('unlinks through the materialization callback and removes the empty group collection', () => {
  const plots = fixture(),
    unlink = vi.fn();
  let current: CurveGroups | undefined;
  function App() {
    const [value, setValue] = useState<CurveGroups>();
    return (
      <CurveGroupFields
        value={value}
        plots={plots}
        onChange={(next) => {
          current = next;
          setValue(next);
        }}
        onUnlink={unlink}
      />
    );
  }
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '添加曲线组' }));
  expect(current?.[0]?.members).toEqual(['a', 'b', 'c']);
  fireEvent.click(screen.getByLabelText('组 1 依赖自动样式'));
  expect(unlink).toHaveBeenCalledWith('curve-group-1');
  fireEvent.click(screen.getByRole('button', { name: '删除组 1' }));
  expect(current).toBeUndefined();
});
