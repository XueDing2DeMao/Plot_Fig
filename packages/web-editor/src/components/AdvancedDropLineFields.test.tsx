// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { XyPlot } from '@plot-fig/figure-schema';
import { defaultTemplate } from '../state/default-template.js';
import { AdvancedDropLineFields } from './AdvancedDropLineFields.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';

afterEach(cleanup);
it('垂线位置列表保留负号、小数和指数中间态，再输入完整数值后恢复有效', () => {
  const panel = defaultTemplate().panels[0]!;
  let latest!: XyPlot;
  function App() {
    const [plot, setPlot] = useState(panel.plotSlots[0]! as XyPlot);
    latest = plot;
    return (
      <AdvancedDropLineFields panel={panel} plot={plot} onChange={setPlot} />
    );
  }
  render(<App />);
  fireEvent.click(screen.getByLabelText('垂直垂线指定插值位置'));
  const input = screen.getByLabelText(
    '垂直垂线插值位置列表',
  ) as HTMLInputElement;
  for (const value of ['-', '-0.', '-0.5, 1e', '-0.5, 1e2']) {
    fireEvent.change(input, { target: { value } });
    expect(input.value).toBe(value);
  }
  expect(latest.dropLines?.vertical?.selection?.values).toEqual([-0.5, 100]);
  expect(input.getAttribute('aria-invalid')).toBeNull();
  fireEvent.change(input, { target: { value: '1, 1' } });
  expect(input.getAttribute('aria-invalid')).toBe('true');
});
it('切换属性页后保留位置列表草稿，关闭重启选择则恢复默认位置', () => {
  const panel = defaultTemplate().panels[0]!;
  function App() {
    const [plot, setPlot] = useState(panel.plotSlots[0]! as XyPlot),
      [show, setShow] = useState(true),
      [texts, setTexts] = useState<Record<string, string>>({});
    return (
      <PropertyNumberDraftContext.Provider
        value={{
          texts,
          setText: (key, text) => setTexts((old) => ({ ...old, [key]: text })),
        }}
      >
        <button onClick={() => setShow((value) => !value)}>切换页</button>
        {show && (
          <AdvancedDropLineFields
            panel={panel}
            plot={plot}
            onChange={setPlot}
          />
        )}
      </PropertyNumberDraftContext.Provider>
    );
  }
  render(<App />);
  fireEvent.click(screen.getByLabelText('水平垂线指定插值位置'));
  fireEvent.change(screen.getByLabelText('水平垂线插值位置列表'), {
    target: { value: '-1, 2e' },
  });
  fireEvent.click(screen.getByText('切换页'));
  fireEvent.click(screen.getByText('切换页'));
  expect(
    (screen.getByLabelText('水平垂线插值位置列表') as HTMLInputElement).value,
  ).toBe('-1, 2e');
  fireEvent.click(screen.getByLabelText('水平垂线指定插值位置'));
  fireEvent.click(screen.getByLabelText('水平垂线指定插值位置'));
  expect(
    (screen.getByLabelText('水平垂线插值位置列表') as HTMLInputElement).value,
  ).toBe('0');
});
