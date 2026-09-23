// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { CurveSubset } from '@plot-fig/figure-schema';
import { SubsetFields } from './SubsetFields.js';
afterEach(cleanup);
it('switches subset discriminants without stale length and removes disabled settings', () => {
  let current: CurveSubset | undefined;
  function App() {
    const [value, setValue] = useState<CurveSubset>();
    return (
      <SubsetFields
        value={value}
        onChange={(next) => {
          current = next;
          setValue(next);
        }}
      />
    );
  }
  render(<App />);
  fireEvent.click(screen.getByLabelText('启用曲线内部子集'));
  fireEvent.change(screen.getByLabelText('子集划分方式'), {
    target: { value: 'group' },
  });
  expect(current).toEqual({
    mode: 'group',
    breakConnection: true,
    colors: ['#2166ac', '#b2182b'],
  });
  expect(screen.getByText(/缺少或无效的分组值会阻止应用/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('子集划分方式'), {
    target: { value: 'length' },
  });
  expect(current).toMatchObject({ mode: 'length', length: 10 });
  fireEvent.click(screen.getByLabelText('启用曲线内部子集'));
  expect(current).toBeUndefined();
});
