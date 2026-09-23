// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { TemplateLibraryDialog } from './TemplateLibraryDialog.js';

vi.mock('../templates/library-storage.js', async (original) => ({
  ...(await original<object>()),
  listTemplates: async () => [],
}));

afterEach(cleanup);

it('shows an empty template center while keeping create and import actions', async () => {
  render(
    <TemplateLibraryDialog
      model={{ template: defaultTemplate(), workspace: emptyWorkspace() }}
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );

  expect(await screen.findByText('暂无模板')).toBeInTheDocument();
  expect(screen.queryByText('单图 · 学术折线')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '保存预览为我的模板' }),
  ).toBeEnabled();
  expect(screen.getByLabelText('导入模板 JSON')).toBeInTheDocument();
});
