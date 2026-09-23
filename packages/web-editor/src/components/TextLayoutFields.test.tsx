// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TextLayoutFields } from './TextLayoutFields.js';

it('edits alignment, padding, background and border as one layout value', () => {
  const onChange = vi.fn();
  const view = render(
    <TextLayoutFields
      prefix="标题"
      fieldPath="details.title.layout"
      value={undefined}
      onChange={onChange}
    />,
  );
  fireEvent.change(screen.getByLabelText('标题行对齐'), {
    target: { value: 'center' },
  });
  expect(onChange).toHaveBeenLastCalledWith({ align: 'center' });
  view.rerender(
    <TextLayoutFields
      prefix="标题"
      fieldPath="details.title.layout"
      value={{ align: 'center' }}
      onChange={onChange}
    />,
  );
  fireEvent.change(screen.getByLabelText('标题上内距 (pt)'), {
    target: { value: '2' },
  });
  expect(onChange).toHaveBeenLastCalledWith({
    align: 'center',
    paddingPt: { top: 2, right: 0, bottom: 0, left: 0 },
  });
  fireEvent.click(screen.getByLabelText('标题背景'));
  expect(onChange).toHaveBeenLastCalledWith({
    align: 'center',
    background: '#ffffff',
  });
  fireEvent.change(screen.getByLabelText('标题边框宽度 (pt)'), {
    target: { value: '1' },
  });
  expect(onChange).toHaveBeenLastCalledWith({
    align: 'center',
    border: { widthPt: 1, color: '#333333' },
  });
});
