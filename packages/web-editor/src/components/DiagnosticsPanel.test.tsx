// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { DataDiagnostic } from '@plot-fig/data-binding';
import { DiagnosticsPanel } from './DiagnosticsPanel.js';

afterEach(cleanup);

it('shows a compact empty state without an extra status role or empty list', () => {
  render(<DiagnosticsPanel diagnostics={[]} />);
  const panel = screen.getByRole('region', { name: '诊断信息' });
  expect(panel).toHaveAttribute('aria-live', 'polite');
  expect(
    within(panel).getByRole('heading', { name: '诊断信息' }),
  ).toBeVisible();
  expect(within(panel).getByText('暂无诊断')).toBeVisible();
  expect(within(panel).queryByRole('list')).not.toBeInTheDocument();
  expect(within(panel).queryByRole('status')).not.toBeInTheDocument();
});

it('shows severity counts and complete diagnostic codes and messages, then returns to the empty state', () => {
  const message = '第一行诊断说明\n' + '很长的数据列名与修复说明'.repeat(20);
  const view = render(
    <DiagnosticsPanel
      diagnostics={[
        {
          code: 'PROJECT_INVALID',
          severity: 'error',
          sourcePath: '/',
          message,
        },
        {
          code: 'RENDER_NOT_IMPLEMENTED',
          severity: 'warning',
          sourcePath: '/panels/0',
          message: '部分图形格式暂未支持。',
        },
        {
          code: 'TABLE_IMPORT_WARNING',
          severity: 'info',
          sourcePath: '/tables/0',
          message: '已按原始列顺序读取。',
        },
      ]}
    />,
  );
  const panel = screen.getByRole('region', { name: '诊断信息' });
  for (const label of ['错误 1', '警告 1', '提示 1'])
    expect(within(panel).getByText(label)).toBeVisible();
  const items = within(panel).getAllByRole('listitem');
  expect(items).toHaveLength(3);
  expect(within(items[0]!).getByText('错误')).toBeVisible();
  expect(within(items[0]!).getByText('PROJECT_INVALID')).toBeVisible();
  expect(items[0]!.textContent).toContain(message);
  expect(within(items[1]!).getByText('RENDER_NOT_IMPLEMENTED')).toBeVisible();
  expect(within(items[2]!).getByText('TABLE_IMPORT_WARNING')).toBeVisible();
  view.rerender(<DiagnosticsPanel diagnostics={[]} />);
  expect(within(panel).getByText('暂无诊断')).toBeVisible();
  expect(within(panel).queryByRole('list')).not.toBeInTheDocument();
});

it('keeps the 100 item display limit while counting all diagnostics', () => {
  const diagnostics: DataDiagnostic[] = Array.from(
    { length: 101 },
    (_, index) => ({
      code: 'TABLE_VALUE_INVALID',
      severity: 'warning',
      sourcePath: `/rows/${index}`,
      message: `第 ${index + 1} 项诊断`,
    }),
  );
  render(<DiagnosticsPanel diagnostics={diagnostics} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(100);
  expect(screen.getByText('警告 101')).toBeVisible();
  expect(screen.getByText('第 100 项诊断')).toBeVisible();
  expect(screen.queryByText('第 101 项诊断')).not.toBeInTheDocument();
  expect(screen.getByText(/共 101 项诊断，展示前 100 项/)).toBeVisible();
});
