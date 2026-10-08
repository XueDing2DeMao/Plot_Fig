// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App.js';
import { useProjectRecovery } from './state/use-project-recovery.js';
import { confirmDataImport } from './test-utils/import-data.js';

vi.mock('./state/use-project-recovery.js', () => ({
  useProjectRecovery: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const projectJson = readFileSync(
  'tests/fixtures/m0/S1-three-xy.plotfig.json',
  'utf8',
);
function setup() {
  const summary = {
    draftId: 'source',
    name: 'S1 恢复样例',
    updatedAt: 1000,
    payloadBytes: new TextEncoder().encode(projectJson).length,
    recoverable: true,
  };
  const recovery = {
    loading: false,
    ready: true,
    settings: {
      id: 'recovery' as const,
      recordVersion: 1 as const,
      enabled: true,
      policyRevision: 0,
    },
    drafts: [summary],
    status: 'saved' as const,
    message: '恢复草稿已更新',
    updatedAt: 1000,
    setEnabled: vi.fn(),
    retry: vi.fn(),
    resume: vi.fn(),
    resetSession: vi.fn(),
    refresh: vi.fn(),
    deleteDraft: vi.fn(),
    readDraft: vi.fn(async () => ({
      ...summary,
      recordVersion: 1 as const,
      sessionId: 'other-tab',
      revision: 1,
      createdAt: 1000,
      projectJson,
    })),
  };
  vi.mocked(useProjectRecovery).mockReturnValue(recovery);
  render(<App />);
  return recovery;
}
it('通过工作区入口恢复后清空历史，自动保留状态不清除下载提醒', async () => {
  const recovery = setup();
  fireEvent.click(screen.getByRole('button', { name: '恢复“S1 恢复样例”' }));
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: '恢复草稿' }),
    ).not.toBeInTheDocument(),
  );
  expect(screen.getByTestId('svg-preview').querySelector('svg')).not.toBeNull();
  const history = within(screen.getByRole('group', { name: '编辑历史' }));
  expect(history.getByRole('button', { name: '撤销' })).toBeDisabled();
  expect(history.getByRole('button', { name: '重做' })).toBeDisabled();
  expect(screen.getByText('有未保存修改，请下载项目文件')).toBeVisible();
  expect(recovery.deleteDraft).not.toHaveBeenCalled();
  expect(vi.mocked(useProjectRecovery).mock.lastCall?.[0]).toMatchObject({
    projectVersion: 1,
    recoverySourceId: 'source',
  });
});
it('取消恢复保留尚未应用的数据导入，不强行生成图形', async () => {
  const recovery = setup();
  fireEvent.click(screen.getByRole('button', { name: '本次跳过' }));
  const csv = 'X,Y\n0,1\n1,3';
  const file = new File([csv], 'pending.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => csv });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await confirmDataImport();
  fireEvent.click(screen.getByRole('button', { name: '恢复草稿（1）' }));
  fireEvent.click(screen.getByRole('button', { name: '恢复“S1 恢复样例”' }));
  expect(recovery.readDraft).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '继续编辑' }));
  expect(
    screen.getByRole('button', { name: '预览文件 pending.csv' }),
  ).toBeVisible();
  expect(screen.getByTestId('svg-preview').querySelector('svg')).toBeNull();
});
