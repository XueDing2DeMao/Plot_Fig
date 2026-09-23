import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { FigurePropertiesDialog } from '../components/FigurePropertiesDialog.js';

/** 在绘图窗口应用方向修改，再由测试打开独立轴窗口核对转换后的设置。 */
export function applyHorizontalOrientation(template: FigureTemplate) {
  cleanup();
  let updated: FigureTemplate | undefined;
  render(
    <FigurePropertiesDialog
      template={template}
      data={undefined}
      onApply={(value) => {
        updated = value;
      }}
      onDismiss={() => undefined}
    />,
  );
  fireEvent.change(screen.getByLabelText('图表方向'), {
    target: { value: 'horizontal' },
  });
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  if (!updated) throw new Error('图表方向修改未提交');
  cleanup();
  return updated;
}
