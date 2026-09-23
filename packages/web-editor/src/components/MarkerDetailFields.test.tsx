// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MarkerDetailFields } from './MarkerDetailFields.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
import {
  validateMarkerDetails,
  type MarkerDetails,
} from '../../../svg-renderer/src/marker-detail-settings.js';
afterEach(cleanup);
let last: MarkerDetails;
function Form() {
  const [value, setValue] = useState<MarkerDetails>({}),
    [texts, setTexts] = useState<Record<string, string>>({});
  last = value;
  return (
    <PropertyNumberDraftContext.Provider
      value={{
        texts,
        setText: (label, text) => setTexts((p) => ({ ...p, [label]: text })),
      }}
    >
      <MarkerDetailFields value={value} onChange={setValue} />
    </PropertyNumberDraftContext.Provider>
  );
}
it('保留小数、负号输入中间态；关闭后重开不留下非法旧草稿', () => {
  render(<Form />);
  fireEvent.click(screen.getByLabelText('按数据单位固定尺寸'));
  for (const value of ['-', '-0.', '0.15']) {
    fireEvent.change(screen.getByLabelText('固定数据尺寸'), {
      target: { value },
    });
    expect(screen.getByLabelText('固定数据尺寸')).toHaveValue(value);
  }
  expect(last.fixedSize?.value).toBe(0.15);
  fireEvent.change(screen.getByLabelText('固定数据尺寸'), {
    target: { value: '-' },
  });
  fireEvent.click(screen.getByLabelText('按数据单位固定尺寸'));
  expect(() => validateMarkerDetails(last)).not.toThrow();
  fireEvent.click(screen.getByLabelText('按数据单位固定尺寸'));
  expect(screen.getByLabelText('固定数据尺寸')).toHaveValue('0.5');
});
it('字符切换清除另一构造方式的字段，图例行文本严格检查并能恢复', () => {
  render(<Form />);
  fireEvent.click(screen.getByLabelText('使用字符符号'));
  fireEvent.change(screen.getByLabelText('字符构造方式'), {
    target: { value: 'sequence' },
  });
  expect(last.character).toEqual({
    mode: 'sequence',
    alphabet: 'ABC',
    fontFamily: 'Arial',
    outline: 'none',
  });
  fireEvent.change(screen.getByLabelText('字符构造方式'), {
    target: { value: 'row-number' },
  });
  expect(last.character).not.toHaveProperty('alphabet');
  fireEvent.click(screen.getByLabelText('显示映射图例样本'));
  fireEvent.change(screen.getByLabelText('图例原始行号'), {
    target: { value: '1,1' },
  });
  expect(() => validateMarkerDetails(last)).toThrow();
  fireEvent.change(screen.getByLabelText('图例原始行号'), {
    target: { value: '1, 3' },
  });
  expect(last.legend?.rows).toEqual([1, 3]);
  fireEvent.click(screen.getByRole('button', { name: '恢复符号细节默认值' }));
  expect(last).toEqual({});
});
