// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ErrorDetailFields } from './ErrorDetailFields.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
import type { ErrorDetails } from '../../../figure-schema/src/schema/error-details.js';
import type { XyPlot } from '@plot-fig/figure-schema';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { ErrorFields } from './ErrorFields.js';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
afterEach(cleanup);
let last: ErrorDetails;
function Form() {
  const [value, setValue] = useState<ErrorDetails>({}),
    [texts, setTexts] = useState<Record<string, string>>({});
  last = value;
  return (
    <PropertyNumberDraftContext.Provider
      value={{ texts, setText: (k, v) => setTexts((p) => ({ ...p, [k]: v })) }}
    >
      <ErrorDetailFields value={value} directions={['y']} onChange={setValue} />
    </PropertyNumberDraftContext.Provider>
  );
}
it('高级误差控件保留负基线输入中间态，切换显示及抽样模式', () => {
  render(<Form />);
  fireEvent.click(screen.getByLabelText('启用 Y 误差高级设置'));
  fireEvent.change(screen.getByLabelText('Y 误差方向'), {
    target: { value: 'away-baseline' },
  });
  for (const value of ['-', '-0.', '-0.5']) {
    fireEvent.change(screen.getByLabelText('Y 误差参考基线'), {
      target: { value },
    });
    expect(screen.getByLabelText('Y 误差参考基线')).toHaveValue(value);
  }
  expect(last.y?.baseline).toBe(-0.5);
  fireEvent.change(screen.getByLabelText('Y 误差绘制方式'), {
    target: { value: 'band' },
  });
  fireEvent.change(screen.getByLabelText('Y 误差抽样'), {
    target: { value: 'count' },
  });
  expect(last.y?.render).toBe('band');
  expect(last.y?.sampling).toEqual({ mode: 'count', count: 100 });
  expect(screen.getByLabelText('Y 误差参考基线')).toHaveValue('-0.5');
  fireEvent.click(screen.getByLabelText('启用 Y 误差高级设置'));
  expect(last).toEqual({});
  fireEvent.click(screen.getByLabelText('启用 Y 误差高级设置'));
  fireEvent.change(screen.getByLabelText('Y 误差方向'), {
    target: { value: 'away-baseline' },
  });
  expect(screen.getByLabelText('Y 误差参考基线')).toHaveValue('0');
});
it('出版和正式属性复用高级误差字段，独立入口保留负基线草稿且关闭误差同步清理', () => {
  let model!: WorkspaceEditor;
  function PublicationForm() {
    const [value, setValue] = useState<WorkspaceEditor>({ template: defaultTemplate(), workspace: emptyWorkspace() });
    model = value;
    return <ErrorFields model={value} plotId={value.template.panels[0]!.plotSlots[0]!.plotSlotId} onChange={setValue} />;
  }
  render(<PublicationForm />);
  fireEvent.change(screen.getByLabelText('Y 误差模式'), { target: { value: 'asymmetric' } });
  fireEvent.click(screen.getByLabelText('启用 Y 误差高级设置'));
  fireEvent.change(screen.getByLabelText('Y 误差方向'), { target: { value: 'away-baseline' } });
  for (const value of ['-', '-0.', '-0.5']) {
    fireEvent.change(screen.getByLabelText('Y 误差参考基线'), { target: { value } });
    expect(screen.getByLabelText('Y 误差参考基线')).toHaveValue(value);
  }
  expect((model.template.panels[0]!.plotSlots[0]! as XyPlot).errorDetails?.y?.baseline).toBe(-0.5);
  fireEvent.change(screen.getByLabelText('Y 误差模式'), { target: { value: 'off' } });
  expect((model.template.panels[0]!.plotSlots[0]! as XyPlot).errorDetails).toBeUndefined();
});
