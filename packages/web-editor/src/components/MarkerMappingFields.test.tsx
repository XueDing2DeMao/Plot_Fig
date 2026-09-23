// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  MarkerMappingFields,
  type MarkerMappingSettings,
} from './MarkerMappingFields.js';
import { MarkerPointFields } from './MarkerPointFields.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
import type { MarkerStyle } from '@plot-fig/figure-schema';
afterEach(cleanup);
const base: MarkerStyle = {
  visible: true,
  shape: 'circle',
  sizePt: 4,
  fill: '#111111',
  stroke: '#111111',
  strokeWidthPt: 1,
};
let last: MarkerMappingSettings;
function Mapping() {
  const [value, setValue] = useState<MarkerMappingSettings>({
      mapping: {},
      columns: {},
    }),
    [texts, setTexts] = useState<Record<string, string>>({});
  last = value;
  return (
    <PropertyNumberDraftContext.Provider
      value={{
        texts,
        setText: (label, text) => setTexts((p) => ({ ...p, [label]: text })),
      }}
    >
      <MarkerMappingFields
        value={value}
        columns={[
          {
            columnId: 'c',
            name: '数值',
            valueType: 'number',
            index: 0,
            values: [-1, 2],
          },
        ]}
        onChange={setValue}
      />
    </PropertyNumberDraftContext.Provider>
  );
}
it('保存负数和小数的输入中间态，关闭范围清除非法值', () => {
  render(<Mapping />);
  fireEvent.click(screen.getByLabelText('启用颜色映射'));
  fireEvent.click(screen.getByLabelText('指定颜色输入范围'));
  const input = screen.getByLabelText('颜色输入起点');
  for (const text of ['-', '-0.', '-0.15']) {
    fireEvent.change(input, { target: { value: text } });
    expect(input).toHaveValue(text);
  }
  expect(last.mapping.color!.domain!.min).toBe(-0.15);
  fireEvent.change(input, { target: { value: '-' } });
  expect(Number.isNaN(last.mapping.color!.domain!.min)).toBe(true);
  fireEvent.click(screen.getByLabelText('指定颜色输入范围'));
  expect(last.mapping.color!.domain).toBeUndefined();
  fireEvent.click(screen.getByLabelText('指定颜色输入范围'));
  expect(screen.getByLabelText('颜色输入起点')).toHaveValue('0');
});
it('映射各自启停，恢复基础样式不会清除其他分类前误用旧输入', () => {
  render(<Mapping />);
  fireEvent.click(screen.getByLabelText('启用大小映射'));
  fireEvent.click(screen.getByLabelText('启用形状映射'));
  fireEvent.change(screen.getByLabelText('最小符号尺寸'), {
    target: { value: '-' },
  });
  fireEvent.click(screen.getByLabelText('启用大小映射'));
  expect(last.mapping.size).toBeUndefined();
  expect(last.mapping.shape).toBeDefined();
  fireEvent.click(screen.getByLabelText('启用大小映射'));
  expect(screen.getByLabelText('最小符号尺寸')).toHaveValue('4');
  fireEvent.click(screen.getByRole('button', { name: '恢复全部基础符号样式' }));
  expect(last).toEqual({ mapping: {}, columns: {} });
});
it('单点撤销某一属性保留其余补丁，全部恢复得到空补丁', () => {
  let latest: Partial<MarkerStyle> = {};
  function Point() {
    const [value, setValue] = useState<Partial<MarkerStyle>>({
      fill: '#ff0000',
      rotationDeg: 30,
    });
    latest = value;
    return <MarkerPointFields base={base} value={value} onChange={setValue} />;
  }
  render(<Point />);
  fireEvent.click(screen.getByLabelText('覆盖填充颜色'));
  expect(latest).toEqual({ rotationDeg: 30 });
  fireEvent.click(screen.getByRole('button', { name: '恢复此点全部继承' }));
  expect(latest).toEqual({});
  cleanup();
  render(
    <MarkerPointFields
      base={base}
      value={{
        shape: 'custom',
        customVertices: [
          [0, -1],
          [1, 1],
          [-1, 1],
        ],
      }}
      onChange={(value) => {
        latest = value;
      }}
    />,
  );
  expect(screen.getByLabelText('单点符号形状')).toHaveValue('custom');
  fireEvent.change(screen.getByLabelText('单点符号形状'), {
    target: { value: 'square' },
  });
  expect(latest).toEqual({ shape: 'square' });
});
