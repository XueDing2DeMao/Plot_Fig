// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import {
  PropertyNumber,
  PropertyNumberDraftContext,
} from './PropertyInputs.js';
import { NumberListInput } from './ChartInputs.js';

afterEach(cleanup);

function Editor({ initial = 1 }: { initial?: number }) {
  const [value, setValue] = useState(initial);
  const [texts, setTexts] = useState<Record<string, string>>({});
  return (
    <PropertyNumberDraftContext.Provider
      value={{
        texts,
        setText: (label, text) =>
          setTexts((old) => ({ ...old, [label]: text })),
      }}
    >
      <PropertyNumber
        label="线宽"
        value={value}
        onChange={setValue}
        step={0.1}
      />
      <output aria-label="解析数值">
        {Number.isNaN(value) ? 'invalid' : value}
      </output>
    </PropertyNumberDraftContext.Provider>
  );
}

it('keeps numeric input text while parsing completed decimals and exponents', () => {
  render(<Editor />);
  const input = screen.getByLabelText('线宽');
  for (const text of ['-', '-0', '-0.', '-0.125', '1e', '1e-', '1e-3']) {
    fireEvent.change(input, { target: { value: text } });
    expect(input).toHaveValue(text);
    expect(screen.getByLabelText('解析数值')).toHaveTextContent(
      ['-', '1e', '1e-'].includes(text) ? 'invalid' : String(Number(text)),
    );
  }
});

it('keeps arrow-key stepping when using a text draft', () => {
  render(<Editor />);
  const input = screen.getByLabelText('线宽');
  fireEvent.keyDown(input, { key: 'ArrowUp' });
  expect(input).toHaveValue('1.1');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(input).toHaveValue('1');
});

it('does not truncate large finite decimals while stepping', () => {
  render(<Editor initial={100000000000000.1} />);
  fireEvent.keyDown(screen.getByLabelText('线宽'), { key: 'ArrowUp' });
  expect(screen.getByLabelText('线宽')).toHaveValue(
    String(100000000000000.1 + 0.1),
  );
});

it('keeps incomplete list input when the object fields remount', () => {
  function Lists() {
    const [value, setValue] = useState([1, 2]);
    const [revision, setRevision] = useState(0);
    const [texts, setTexts] = useState<Record<string, string>>({});
    return (
      <PropertyNumberDraftContext.Provider
        value={{
          texts,
          setText: (label, text) =>
            setTexts((old) => ({ ...old, [label]: text })),
        }}
      >
        <NumberListInput
          key={revision}
          label="层级"
          value={value}
          onChange={setValue}
        />
        <button onClick={() => setRevision((old) => old + 1)}>返回对象</button>
      </PropertyNumberDraftContext.Provider>
    );
  }
  render(<Lists />);
  fireEvent.change(screen.getByLabelText('层级'), {
    target: { value: '1, 1e-' },
  });
  fireEvent.click(screen.getByRole('button', { name: '返回对象' }));
  expect(screen.getByLabelText('层级')).toHaveValue('1, 1e-');
});
