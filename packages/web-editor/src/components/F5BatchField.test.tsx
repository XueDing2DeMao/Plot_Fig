// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { F5BatchField } from './F5BatchField.js';
afterEach(cleanup);
it('删除参考线行后显示剩余行数值，并保存同一数值', () => {
  let saved = '';
  function Form() {
    const [text, setText] = useState<string>();
    saved = text ?? '';
    return (
      <F5BatchField
        field={{
          key: 'references',
          label: '参考线',
          type: 'f5-object',
          optional: true,
        }}
        common={{
          mixed: false,
          value: {
            items: [
              { id: 'a', kind: 'constant', value: 10 },
              { id: 'b', kind: 'constant', value: 20 },
            ],
          },
        }}
        text={text}
        disabled={false}
        onChange={setText}
        onReset={() => {}}
      />
    );
  }
  render(<Form />);
  fireEvent.change(screen.getByLabelText('参考线与填色 · 参考线 1 · 数值'), {
    target: { value: '12' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: '删除参考线与填色 · 参考线 1' }),
  );
  expect(screen.getByLabelText('参考线与填色 · 参考线 1 · 数值')).toHaveValue(
    '20',
  );
  expect(JSON.parse(saved).value.items[0].value).toBe(20);
});
