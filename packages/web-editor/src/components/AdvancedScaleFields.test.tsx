// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { AdvancedScaleFields } from './AdvancedScaleFields.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
import type { NumericScaleSpec } from '../../../svg-renderer/src/advanced-scale.js';
import type { NumericTickOptions } from '../../../svg-renderer/src/advanced-scale-ticks.js';
afterEach(cleanup);
let latest: NumericScaleSpec, ticks: NumericTickOptions;
function Form() {
  const [value, setValue] = useState<NumericScaleSpec>({ kind: 'log10' }),
    [options, setOptions] = useState<NumericTickOptions>({
      logPolicy: 'origin-log10',
      minorCount: 8,
    }),
    [texts, setTexts] = useState<Record<string, string>>({});
  latest = value;
  ticks = options;
  return (
    <PropertyNumberDraftContext.Provider
      value={{
        texts,
        setText: (label, text) => setTexts((p) => ({ ...p, [label]: text })),
      }}
    >
      <AdvancedScaleFields
        value={value}
        onChange={setValue}
        ticks={options}
        onTicksChange={setOptions}
      />
    </PropertyNumberDraftContext.Provider>
  );
}
it('切换尺度清理不适用的对数策略，SymLog可关闭并恢复有效默认值', () => {
  render(<Form />);
  fireEvent.click(screen.getByLabelText('对称对数（SymLog）'));
  expect(ticks.logPolicy).toBe('legacy');
  fireEvent.change(screen.getByLabelText('线性范围阈值'), {
    target: { value: '-' },
  });
  expect(screen.getByLabelText('线性范围阈值')).toHaveValue('-');
  expect(Number.isNaN(latest.symLog?.threshold)).toBe(true);
  fireEvent.click(screen.getByLabelText('对称对数（SymLog）'));
  expect(latest).not.toHaveProperty('symLog');
  fireEvent.click(screen.getByLabelText('对称对数（SymLog）'));
  expect(screen.getByLabelText('线性范围阈值')).toHaveValue('1');
  fireEvent.change(screen.getByLabelText('数值尺度'), {
    target: { value: 'linear' },
  });
  expect(latest).toEqual({ kind: 'linear' });
});
it('小数与指数中间态保留，最终数值及主刻度锚点正确更新', () => {
  render(<Form />);
  fireEvent.click(screen.getByLabelText('对称对数（SymLog）'));
  for (const value of ['0.', '0.1', '1e-', '1e-3'])
    fireEvent.change(screen.getByLabelText('线性范围阈值'), {
      target: { value },
    });
  expect(latest.symLog?.threshold).toBe(0.001);
  fireEvent.change(screen.getByLabelText('主刻度方式'), {
    target: { value: 'increment' },
  });
  fireEvent.change(screen.getByLabelText('主刻度锚点'), {
    target: { value: '-2.5' },
  });
  expect(ticks.major).toEqual({ mode: 'increment', step: 1, anchor: -2.5 });
});
