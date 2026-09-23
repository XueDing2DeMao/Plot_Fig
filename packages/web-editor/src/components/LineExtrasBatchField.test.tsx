// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LineExtrasBatchField } from './LineExtrasBatchField.js';
import { parseBatchField } from './batch-field-drafts.js';
afterEach(cleanup);
it.each(['curve-arrows', 'drop-line'] as const)(
  'can directly disable mixed %s without selecting another mode first',
  (type) => {
    const field = { key: 'effect', label: '效果', type, optional: true },
      onChange = vi.fn();
    render(
      <LineExtrasBatchField
        field={field}
        text={undefined}
        common={{ mixed: true }}
        disabled={false}
        onChange={onChange}
        onReset={vi.fn()}
      />,
    );
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('__mixed');
    fireEvent.change(select, { target: { value: 'none' } });
    expect(parseBatchField(field, onChange.mock.lastCall![0])).toBeUndefined();
  },
);
