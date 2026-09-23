// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { defaultTemplate } from '../state/default-template.js';
import { useFigurePropertyDraft } from './use-figure-property-draft.js';
import { LineFields } from './SeriesFields.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
import { BatchPropertyField } from './BatchPropertyField.js';
import { customDashDraft, parseBatchField } from './batch-field-drafts.js';
import type { BatchField } from '../state/batch-property-fields.js';

afterEach(cleanup);
function Editor() {
  const draft = useFigurePropertyDraft(defaultTemplate());
  return (
    <>
      <button
        onClick={() =>
          draft.select({
            kind: 'plot',
            panelId: 'panel-main',
            plotSlotId: 'series-1',
          })
        }
      >
        曲线
      </button>
      <button
        onClick={() =>
          draft.select({
            kind: 'axis',
            panelId: 'panel-main',
            axisId: 'axis-x',
          })
        }
      >
        坐标轴
      </button>
      <PropertyNumberDraftContext.Provider
        value={{ texts: draft.numberTexts, setText: draft.setNumberText }}
      >
        {draft.value.kind === 'plot' && (
          <LineFields
            value={draft.value.settings}
            onChange={(settings) => draft.change({ kind: 'plot', settings })}
          />
        )}
      </PropertyNumberDraftContext.Provider>
      <button disabled={draft.errors.length > 0}>应用</button>
      <output aria-label="已验证模板">{JSON.stringify(draft.template)}</output>
    </>
  );
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function line() {
  return JSON.parse(screen.getByLabelText('已验证模板').textContent!).panels[0]
    .plotSlots[0].lineStyle;
}
it('preserves invalid custom text across object switching, blocks apply, accepts corrections and clears custom on preset selection', () => {
  render(<Editor />);
  fireEvent.click(screen.getByText('曲线'));
  change('线型', 'custom');
  for (const raw of ['8, 1e-', '8,3,', '8,,3', '8,3,1']) {
    change('虚线序列 (pt)', raw);
    expect(screen.getByLabelText('虚线序列 (pt)')).toHaveValue(raw);
    expect(screen.getByText('应用')).toBeDisabled();
    fireEvent.click(screen.getByText('坐标轴'));
    fireEvent.click(screen.getByText('曲线'));
    expect(screen.getByLabelText('虚线序列 (pt)')).toHaveValue(raw);
  }
  change('虚线序列 (pt)', '8，3 1, 3');
  change('虚线偏移 (pt)', '-');
  expect(screen.getByText('应用')).toBeDisabled();
  expect(screen.getByLabelText('虚线偏移 (pt)')).toHaveValue('-');
  change('虚线偏移 (pt)', '-0.75');
  expect(line().customDash).toEqual({
    lengthsPt: [8, 3, 1, 3],
    offsetPt: -0.75,
  });
  change('虚线序列 (pt)', '1e-');
  change('线型', 'dotted');
  expect(screen.getByText('应用')).toBeEnabled();
  expect(line()).not.toHaveProperty('customDash');
  change('线型', 'custom');
  expect(screen.getByLabelText('虚线序列 (pt)')).toHaveValue('6, 4');
});
it('handles decimal transparency, full invisibility and resetting invalid advanced drafts', () => {
  render(<Editor />);
  fireEvent.click(screen.getByText('曲线'));
  change('线条透明度 (%)', '37.5');
  expect(line().opacity).toBe(0.625);
  change('线条透明度 (%)', '100');
  expect(line().opacity).toBe(0);
  change('线条透明度 (%)', '100.1');
  expect(screen.getByText('应用')).toBeDisabled();
  change('尖角限制', '1e-');
  fireEvent.click(screen.getByText('恢复默认高级线条样式'));
  expect(screen.getByText('应用')).toBeEnabled();
  expect(line()).not.toHaveProperty('opacity');
  expect(line()).not.toHaveProperty('miterLimit');
  expect(screen.getByLabelText('尖角限制')).toHaveValue('4');
});
it('clears a batch custom pattern visibly and parses it as removing the override', () => {
  const field: BatchField = {
    key: 'customDash',
    label: '自定义虚线',
    type: 'custom-dash',
    optional: true,
  };
  function Batch() {
    const [text, setText] = useState<string>();
    return (
      <>
        <BatchPropertyField
          field={field}
          common={{
            mixed: false,
            value: { lengthsPt: [8, 3], offsetPt: -0.5 },
          }}
          text={text}
          onChange={setText}
          onReset={() => setText(undefined)}
          disabled={false}
        />
        <output>
          {text === undefined
            ? 'unchanged'
            : (JSON.stringify(parseBatchField(field, text)) ?? 'cleared')}
        </output>
      </>
    );
  }
  render(<Batch />);
  fireEvent.click(screen.getByText('清除自定义虚线'));
  expect(screen.getByLabelText('虚线序列 (pt)')).toHaveValue('');
  expect(screen.getByLabelText('虚线偏移 (pt)')).toHaveValue('');
  expect(screen.getByText('cleared')).toBeInTheDocument();
});
it('parses batch opacity and treats sequence plus offset as one validated draft', () => {
  const field: BatchField = {
    key: 'opacity',
    label: '透明度',
    type: 'opacity',
    optional: true,
  };
  expect(parseBatchField(field, '37.5')).toBe(0.625);
  expect(parseBatchField(field, '1e-')).toBeNaN();
  field.type = 'custom-dash';
  const draft = customDashDraft({ lengthsPt: [8, 3], offsetPt: -0.5 });
  expect(parseBatchField(field, JSON.stringify(draft))).toEqual({
    lengthsPt: [8, 3],
    offsetPt: -0.5,
  });
  expect(() =>
    parseBatchField(field, JSON.stringify({ pattern: '', offset: '-0.5' })),
  ).toThrow(/先填写/);
  expect(() =>
    parseBatchField(field, JSON.stringify({ pattern: '8,', offset: '' })),
  ).toThrow();
});
