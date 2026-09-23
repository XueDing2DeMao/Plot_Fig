// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { defaultTemplate } from '../state/default-template.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
afterEach(cleanup);
it('keeps incomplete annotation numbers in a draft, blocks confirmation and isolates new notes', () => {
  render(
    <FigurePropertiesDialog
      template={defaultTemplate()}
      data={undefined}
      initialSelection={{ kind: 'page' }}
      onApply={() => {}}
      onDismiss={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole('tab', { name: '注释' }));
  fireEvent.click(screen.getByRole('button', { name: '新增注释' }));
  fireEvent.change(screen.getByRole('spinbutton', { name: '注释 X' }), {
    target: { value: '' },
  });
  expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
  fireEvent.change(screen.getByRole('spinbutton', { name: '注释 X' }), {
    target: { value: '.7' },
  });
  expect(screen.getByRole('spinbutton', { name: '注释 X' })).toHaveValue('.7');
  fireEvent.click(screen.getByRole('button', { name: '新增注释' }));
  expect(screen.getByRole('spinbutton', { name: '注释 X' })).toHaveValue(
    '0.25',
  );
});
