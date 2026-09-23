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
import type { CurveTransform } from '@plot-fig/figure-schema';
import { defaultTemplate } from '../state/default-template.js';
import {
  CurveTransformFields,
  PanelStackFields,
} from './CurveTransformFields.js';
afterEach(cleanup);
it('offers visible fill targets on the current axes', () => {
  const plot = defaultTemplate().panels[0]!.plotSlots[0]!;
  const plots = ['a', 'b', 'c', 'd'].map((plotSlotId) => ({
    ...structuredClone(plot),
    plotSlotId,
    legendEntry: { ...plot.legendEntry, text: plotSlotId },
  }));
  plots[2]!.visible = false;
  plots[3]!.yAxisId = 'other';
  render(
    <CurveTransformFields
      value={{
        fill: {
          target: 'next',
          positiveColor: '#ff0000',
          negativeColor: '#0000ff',
          opacity: 0.3,
        },
      }}
      plots={plots}
      plotId="a"
      onChange={vi.fn()}
    />,
  );
  expect(
    within(screen.getByLabelText('填充目标曲线'))
      .getAllByRole('option')
      .map((p) => p.textContent),
  ).toEqual(['下一条同坐标轴曲线', 'b']);
});
it('preserves offset scope on mode changes and removes the final disabled object', () => {
  let current: CurveTransform | undefined;
  function App() {
    const [value, setValue] = useState<CurveTransform>();
    return (
      <CurveTransformFields
        value={value}
        onChange={(next) => {
          current = next;
          setValue(next);
        }}
      />
    );
  }
  render(<App />);
  fireEvent.click(screen.getByLabelText('启用 X 偏移'));
  fireEvent.change(screen.getByLabelText('X 偏移序号范围'), {
    target: { value: 'within-group' },
  });
  fireEvent.change(screen.getByLabelText('X 偏移方式'), {
    target: { value: 'auto' },
  });
  expect(current?.offsetX).toEqual({
    mode: 'auto',
    gap: 0.1,
    scope: 'within-group',
  });
  fireEvent.click(screen.getByLabelText('启用 X 偏移'));
  expect(current).toBeUndefined();
});
it('does not offer incompatible unchecked stack members', () => {
  const plot = defaultTemplate().panels[0]!.plotSlots[0]!;
  const plots = ['a', 'b', 'c'].map((plotSlotId) => ({
    ...structuredClone(plot),
    plotSlotId,
    legendEntry: { ...plot.legendEntry, text: plotSlotId },
  }));
  plots[2]!.yAxisId = 'other';
  render(
    <PanelStackFields
      value={{ mode: 'normal', members: ['a', 'b'] }}
      plots={plots}
      onChange={vi.fn()}
    />,
  );
  expect(screen.queryByLabelText('堆叠成员 c')).not.toBeInTheDocument();
});
