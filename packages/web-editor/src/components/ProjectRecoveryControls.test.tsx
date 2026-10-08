// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  ProjectRecoveryControls,
  type RecoveryControlsState,
} from './ProjectRecoveryControls.js';

afterEach(cleanup);
function state(
  overrides: Partial<RecoveryControlsState> = {},
): RecoveryControlsState {
  return {
    loading: false,
    ready: true,
    settings: {
      id: 'recovery',
      recordVersion: 1,
      enabled: true,
      policyRevision: 0,
    },
    drafts: [
      {
        draftId: 'one',
        name: '实验图',
        updatedAt: 1000,
        payloadBytes: 2048,
        recoverable: true,
      },
    ],
    status: 'idle',
    message: '等待修改',
    setEnabled: vi.fn(),
    retry: vi.fn(),
    resume: vi.fn(),
    refresh: vi.fn(),
    deleteDraft: vi.fn(),
    ...overrides,
  };
}
it('启动发现草稿可跳过，跳过不会关闭自动保留或删除', () => {
  const recovery = state();
  render(
    <ProjectRecoveryControls
      recovery={recovery}
      hasUnsavedChanges={false}
      projectVersion={0}
      onRestore={vi.fn()}
    />,
  );
  expect(screen.getByRole('dialog', { name: '恢复草稿' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '本次跳过' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(recovery.setEnabled).not.toHaveBeenCalled();
  expect(recovery.deleteDraft).not.toHaveBeenCalled();
});
it('列表迟到且用户已开始操作时只显示入口', () => {
  const recovery = state({ loading: true, drafts: [] });
  const props = {
    recovery,
    hasUnsavedChanges: false,
    projectVersion: 0,
    onRestore: vi.fn(),
  };
  const { rerender } = render(<ProjectRecoveryControls {...props} />);
  fireEvent.keyDown(window, { key: 'a' });
  rerender(<ProjectRecoveryControls {...props} recovery={state()} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '恢复草稿（1）' })).toBeEnabled();
});
it('已有修改或打开其他对话框时不会自动打断', () => {
  render(
    <>
      <dialog open aria-label="属性" />
      <ProjectRecoveryControls
        recovery={state()}
        hasUnsavedChanges={false}
        projectVersion={0}
        onRestore={vi.fn()}
      />
    </>,
  );
  expect(
    screen.queryByRole('dialog', { name: '恢复草稿' }),
  ).not.toBeInTheDocument();
});
it('删除后需明确重新保留；容量限制提供管理入口', () => {
  const recovery = state({ status: 'deleted', drafts: [] });
  render(
    <ProjectRecoveryControls
      recovery={recovery}
      hasUnsavedChanges
      onRestore={vi.fn()}
      projectVersion={0}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '重新保留当前工作区' }));
  expect(recovery.resume).toHaveBeenCalledOnce();
});
