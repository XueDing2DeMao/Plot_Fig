import { fireEvent, screen, waitFor, within } from '@testing-library/react';

export async function confirmDataImport() {
  const button = await waitFor(() => {
    const candidate = screen.getByRole('button', { name: '确认导入' });
    if (candidate.hasAttribute('disabled')) throw new Error('导入草稿尚未就绪');
    return candidate;
  });
  fireEvent.click(button);
}

export function confirmPlot() {
  fireEvent.click(
    within(screen.getByRole('region', { name: '图形设置' })).getByRole(
      'button',
      { name: /生成图形|应用修改/ },
    ),
  );
}
export function openDataPreview() {
  fireEvent.click(screen.getByRole('button', { name: '数据表预览' }));
}
export function closeDataPreview() {
  fireEvent.click(screen.getByRole('button', { name: '关闭数据表预览' }));
}
export function openCurveBinding(index: number) {
  const toggle = screen.queryByRole('button', {
    name: `展开曲线 ${index} 数据绑定`,
  });
  if (toggle) fireEvent.click(toggle);
}
