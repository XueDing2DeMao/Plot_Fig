// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { OriginAxisFields } from './OriginAxisFields.js';
import { defaultTemplate } from '../state/default-template.js';
import { readPropertyObjectSettings } from '../state/property-object-settings.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
afterEach(cleanup);
const template = defaultTemplate(),
  axes = template.panels[0]!.axes;
let latest: any;
function Form() {
  const [value, setValue] = useState(() =>
    readPropertyObjectSettings(template, {
      kind: 'axis',
      panelId: 'panel-main',
      axisId: 'axis-y',
    }),
  );
  const [texts, setTexts] = useState<Record<string, string>>({});
  latest = value;
  if (value.kind !== 'axis') return null;
  return (
    <PropertyNumberDraftContext.Provider
      value={{
        texts,
        setText: (label, text) =>
          setTexts((old) => ({ ...old, [label]: text })),
      }}
    >
      <OriginAxisFields
        value={value}
        onChange={setValue}
        onResetRange={() => {}}
        tab="scale"
        axes={axes}
        axis={axes[1]!}
      />
    </PropertyNumberDraftContext.Provider>
  );
}
it('正式尺度页启用SymLog原子清理策略，保留数字草稿并可切回线性', () => {
  render(<Form />);
  fireEvent.change(screen.getByLabelText('Y 轴尺度'), {
    target: { value: 'log2' },
  });
  expect(latest.details.scale).toBe('log2');
  fireEvent.click(screen.getByLabelText('Y 轴对称对数（SymLog）'));
  fireEvent.change(screen.getByLabelText('Y 轴线性范围阈值'), {
    target: { value: '0.' },
  });
  expect(screen.getByLabelText('Y 轴线性范围阈值')).toHaveValue('0.');
  fireEvent.change(screen.getByLabelText('Y 轴线性范围阈值'), {
    target: { value: '0.1' },
  });
  expect(latest.details.symLog.threshold).toBe(0.1);
  fireEvent.change(screen.getByLabelText('Y 轴尺度'), {
    target: { value: 'linear' },
  });
  expect(latest.details).not.toHaveProperty('symLog');
  expect(latest.details).not.toHaveProperty('logTicks');
});
