// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProjectRecoveryDialog } from './ProjectRecoveryDialog.js';

afterEach(cleanup);
const draft = {
  draftId: 'one',
  name: '实验图',
  updatedAt: 1000,
  payloadBytes: 2048,
  recoverable: true,
};
const setup = (dirty = false) => {
  const props = {
    drafts: [draft],
    hasUnsavedChanges: dirty,
    onRestore: vi.fn(async () => true),
    onDelete: vi.fn(async () => {}),
    onClose: vi.fn(),
  };
  render(<ProjectRecoveryDialog {...props} />);
  return props;
};
it('恢复前保护未保存内容，继续编辑保留草稿', async () => {
  const props = setup(true);
  fireEvent.click(screen.getByRole('button', { name: '恢复“实验图”' }));
  expect(props.onRestore).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '继续编辑' }));
  expect(props.onClose).toHaveBeenCalledOnce();
  expect(props.onDelete).not.toHaveBeenCalled();
});
it('明确放弃后恢复，失败仍保持对话框', async () => {
  const props = setup(true);
  props.onRestore.mockResolvedValue(false);
  fireEvent.click(screen.getByRole('button', { name: '恢复“实验图”' }));
  fireEvent.click(screen.getByRole('button', { name: '放弃当前修改并恢复' }));
  await waitFor(() => expect(props.onRestore).toHaveBeenCalledWith('one'));
  expect(props.onClose).not.toHaveBeenCalled();
});
it('删除需确认具体名称和时间，删除完成保持列表', async () => {
  const props = setup();
  fireEvent.click(screen.getByRole('button', { name: '删除“实验图”' }));
  expect(props.onDelete).not.toHaveBeenCalled();
  expect(screen.getByText(/删除恢复草稿“实验图”/)).toHaveTextContent('1970');
  fireEvent.click(screen.getByRole('button', { name: '确认删除此草稿' }));
  await waitFor(() => expect(props.onDelete).toHaveBeenCalledWith('one'));
  expect(props.onClose).not.toHaveBeenCalled();
});
it('损坏条目可删除但不可恢复，不影响其他条目', async () => {
  const onRestore = vi.fn(async () => true);
  render(
    <ProjectRecoveryDialog
      drafts={[
        draft,
        {
          ...draft,
          draftId: 'bad',
          name: '损坏草稿',
          recoverable: false,
          payloadBytes: null,
          error: '版本不支持',
        },
      ]}
      hasUnsavedChanges={false}
      onRestore={onRestore}
      onDelete={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  expect(screen.getByRole('button', { name: '恢复“损坏草稿”' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '删除“损坏草稿”' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '恢复“实验图”' }));
  await waitFor(() => expect(onRestore).toHaveBeenCalledWith('one'));
});
