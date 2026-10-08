// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Panel } from '@plot-fig/figure-schema';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { LayerStackFields } from './LayerStackFields.js';

afterEach(cleanup);
function show(kind: 'xy' | 'bar' = 'xy') {
  const panel = chartTemplate(kind).panels[0]!;
  const source = panel.plotSlots[0]!;
  panel.plotSlots = [0, 1, 2].map((i) => ({
    ...structuredClone(source),
    plotSlotId: `curve-${i}`,
    legendEntry: { ...source.legendEntry, text: `Curve ${i}` },
  }));
  const change = vi.fn<(panel: Panel) => void>();
  function Harness() {
    const [value, setValue] = useState(panel);
    return (
      <LayerStackFields
        panel={value}
        onChange={(next) => {
          change(next);
          setValue(next);
        }}
      />
    );
  }
  render(<Harness />);
  return change;
}
it('keeps all six Origin offset modes and inactive main controls visible', () => {
  show();
  for (const label of ['无', '累积', '增量', '常量', '自动', '单独'])
    expect(screen.getByRole('radio', { name: label })).toBeVisible();
  expect(screen.getByLabelText('常量偏移数列')).toBeDisabled();
  expect(screen.getByLabelText('间距 (%)')).toBeDisabled();
  expect(screen.getByLabelText('保持绘图在非线性刻度下的比例')).toBeDisabled();
  expect(screen.getByLabelText('X')).toBeDisabled();
  expect(screen.getByLabelText('Y')).toBeDisabled();
});
it.each([
  ['无', false, false, false, false, false],
  ['累积', true, false, true, true, false],
  ['增量', false, true, true, false, false],
  ['常量', false, false, false, false, true],
  ['自动', false, false, false, false, true],
  ['单独', false, false, false, false, true],
] as const)(
  'shows the Origin option availability for %s',
  (mode, sort, overlap, within, totals, relative) => {
    show('bar');
    fireEvent.click(screen.getByRole('radio', { name: mode }));
    const enabled = (label: string, expected: boolean) =>
      expected
        ? expect(screen.getByLabelText(label)).toBeEnabled()
        : expect(screen.getByLabelText(label)).toBeDisabled();
    if (mode === '增量') enabled('显示被覆盖的柱状图/条形图', overlap);
    else enabled('按大小排序显示柱状图/条形图', sort);
    enabled('对使用“累积”/“增量”的图应用“子组内偏移”设置', within);
    enabled('显示总标签在堆叠柱状/条形上', totals);
    enabled('按相对位置自定义附加线', relative);
  },
);
it('edits stack subgroups and disables connectors while subgroup offsets apply', () => {
  const change = show('bar');
  fireEvent.click(screen.getByRole('radio', { name: '累积' }));
  fireEvent.click(
    screen.getByLabelText('显示堆积或浮动柱状图/条形图各层的连接线'),
  );
  fireEvent.click(
    screen.getByLabelText('对使用“累积”/“增量”的图应用“子组内偏移”设置'),
  );
  expect(
    screen.getByLabelText('显示堆积或浮动柱状图/条形图各层的连接线'),
  ).toBeDisabled();
  expect(
    screen.getByLabelText('显示堆积或浮动柱状图/条形图各层的连接线'),
  ).toBeChecked();
  fireEvent.change(screen.getByLabelText('堆叠子组 Curve 0'), {
    target: { value: 'new' },
  });
  const group = change.mock.lastCall![0].layerStack!.subgroups.find((group) =>
    group.members.includes('curve-0'),
  )!;
  fireEvent.change(screen.getByLabelText('堆叠子组 Curve 1'), {
    target: { value: group.groupId },
  });
  expect(
    change.mock.lastCall![0].layerStack!.subgroups.find(
      (item) => item.groupId === group.groupId,
    )!.members,
  ).toEqual(['curve-0', 'curve-1']);
});
it('writes automatic gap as a fraction and retains dormant settings across mode changes', () => {
  const change = show();
  fireEvent.click(screen.getByRole('radio', { name: '自动' }));
  expect(screen.getByLabelText('间距 (%)')).toHaveValue(8);
  fireEvent.change(screen.getByLabelText('间距 (%)'), {
    target: { value: '12' },
  });
  fireEvent.click(screen.getByLabelText('保持绘图在非线性刻度下的比例'));
  fireEvent.click(screen.getByRole('radio', { name: '常量' }));
  fireEvent.change(screen.getByLabelText('常量偏移数列'), {
    target: { value: '0 10 -5' },
  });
  fireEvent.click(screen.getByLabelText('绝对偏移'));
  expect(change.mock.lastCall![0]).toMatchObject({
    layerStack: {
      mode: 'constant',
      constant: { values: [0, 10, -5], absolute: true },
      auto: { gap: 0.12, preserveScale: true },
    },
  });
  fireEvent.click(screen.getByRole('radio', { name: '自动' }));
  expect(screen.getByLabelText('间距 (%)')).toHaveValue(12);
});
