// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { DataLabels, LabelOverrides } from '@plot-fig/figure-schema';
import { DataLabelFields } from './DataLabelFields.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
afterEach(cleanup);
it('柱图标签将来源说明为类别和柱值，颜色可跟随填充', () => {
  render(
    <DataLabelFields
      value={{ visible: true, source: 'y' }}
      onChange={() => {}}
      plotKind="bar"
    />,
  );
  expect(screen.getByRole('option', { name: '类别' })).toBeTruthy();
  expect(screen.getByRole('option', { name: '柱值' })).toBeTruthy();
  expect(screen.getByRole('option', { name: '跟随填充' })).toBeTruthy();
});
it('真实字段选择标签列、格式和负数草稿，单点覆盖可独立恢复', () => {
  let result: DataLabels | undefined,
    over: LabelOverrides | undefined,
    column = '';
  function App() {
    const [v, setV] = useState<DataLabels>(),
      [o, setO] = useState<LabelOverrides>(),
      [texts, setTexts] = useState<Record<string, string>>({});
    return (
      <PropertyNumberDraftContext.Provider
        value={{
          texts,
          setText: (k, t) => setTexts((p) => ({ ...p, [k]: t })),
        }}
      >
        <DataLabelFields
          value={v}
          onChange={(n) => {
            result = n;
            setV(n);
          }}
          columns={[{ id: 'label', name: '标签列' }]}
          labelColumnId={column}
          onLabelColumnChange={(v) => (column = v)}
          overrides={o}
          onOverridesChange={(n) => {
            over = n;
            setO(n);
          }}
          source={{
            tableId: 't',
            xColumnId: 'x',
            yColumnId: 'y',
            dataStartRow: 0,
            fingerprint: 'sha256:' + 'a'.repeat(64),
          }}
          rowCount={10}
        />
      </PropertyNumberDraftContext.Provider>
    );
  }
  render(<App />);
  fireEvent.click(screen.getByLabelText('显示数据标签'));
  fireEvent.change(screen.getByLabelText('标签来源'), {
    target: { value: 'column' },
  });
  fireEvent.change(screen.getByLabelText('标签数据列'), {
    target: { value: 'label' },
  });
  expect(column).toBe('label');
  const x = screen.getByLabelText('标签水平偏移');
  fireEvent.change(x, { target: { value: '-' } });
  expect((x as HTMLInputElement).value).toBe('-');
  expect(result?.offset?.x).toBeNaN();
  fireEvent.change(x, { target: { value: '-0.5' } });
  expect(result?.offset?.x).toBe(-0.5);
  fireEvent.change(screen.getByLabelText('标签原始行号'), {
    target: { value: '3' },
  });
  fireEvent.click(screen.getByLabelText('覆盖此行标签'));
  fireEvent.change(screen.getByLabelText('此行标签文字'), {
    target: { value: 'chosen' },
  });
  expect(over?.points[0]).toMatchObject({ row: 3, text: 'chosen' });
  fireEvent.click(screen.getByRole('button', { name: '恢复此行标签' }));
  expect(over).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: '恢复默认标签' }));
  expect(result).toBeUndefined();
});
it('来源变化明确暂停单点覆盖并保留清除入口', () => {
  const s = {
    tableId: 't',
    xColumnId: 'x',
    yColumnId: 'y',
    dataStartRow: 0,
    fingerprint: 'sha256:' + 'a'.repeat(64),
  };
  render(
    <DataLabelFields
      value={{ visible: true, source: 'y' }}
      onChange={() => {}}
      source={{ ...s, fingerprint: 'sha256:' + 'b'.repeat(64) }}
      overrides={{ source: s, points: [{ row: 1, text: 'old' }] }}
      onOverridesChange={() => {}}
    />,
  );
  expect(screen.getByText(/旧标签单点覆盖已暂停/)).toBeTruthy();
  expect(screen.getByRole('button', { name: '清除全部标签覆盖' })).toBeTruthy();
  expect(screen.queryByLabelText('覆盖此行标签')).toBeNull();
});
it('恢复单点覆盖后再次启用时清除旧偏移草稿，重新继承当前全局偏移', () => {
  const source = {
    tableId: 't',
    xColumnId: 'x',
    yColumnId: 'y',
    dataStartRow: 0,
    fingerprint: 'sha256:' + 'a'.repeat(64),
  };
  function App() {
    const [overrides, setOverrides] = useState<LabelOverrides>(),
      [texts, setTexts] = useState<Record<string, string>>({});
    return (
      <PropertyNumberDraftContext.Provider
        value={{
          texts,
          setText: (key, text) => setTexts((p) => ({ ...p, [key]: text })),
        }}
      >
        <DataLabelFields
          value={{
            visible: true,
            source: 'y',
            offset: { x: 5, y: 6, unit: 'pt' },
          }}
          onChange={() => {}}
          source={source}
          overrides={overrides}
          onOverridesChange={setOverrides}
        />
      </PropertyNumberDraftContext.Provider>
    );
  }
  render(<App />);
  fireEvent.click(screen.getByLabelText('覆盖此行标签'));
  fireEvent.change(screen.getByLabelText('此行标签水平偏移'), {
    target: { value: '-8' },
  });
  fireEvent.change(screen.getByLabelText('此行标签垂直偏移'), {
    target: { value: '-' },
  });
  fireEvent.click(screen.getByRole('button', { name: '恢复此行标签' }));
  fireEvent.click(screen.getByLabelText('覆盖此行标签'));
  expect(
    (screen.getByLabelText('此行标签水平偏移') as HTMLInputElement).value,
  ).toBe('5');
  expect(
    (screen.getByLabelText('此行标签垂直偏移') as HTMLInputElement).value,
  ).toBe('6');
});
