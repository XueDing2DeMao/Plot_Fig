// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { duplicatePanel } from '../state/panel-operations.js';
import { LayerFormatControls } from './LayerFormatControls.js';
afterEach(cleanup);

function setup() {
  const model = duplicatePanel(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    'panel-main',
  );
  const [source, target] = model.template.panels;
  source!.axes[0]!.line.color = '#ff0000';
  source!.axes[0]!.tickLabels.fontFamily = 'Georgia';
  const apply = vi.fn();
  const view = render(
    <LayerFormatControls
      template={model.template}
      activePanelId={source!.panelId}
      onApply={apply}
    />,
  );
  return {
    template: model.template,
    source: source!,
    target: target!,
    apply,
    selectTarget: () =>
      view.rerender(
        <LayerFormatControls
          template={model.template}
          activePanelId={target!.panelId}
          onApply={apply}
        />,
      ),
  };
}

it('offers independent copy and paste scopes across layer changes', () => {
  const app = setup();
  expect(screen.getByRole('button', { name: '粘贴格式' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '复制格式' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '所有样式格式' }));
  app.selectTarget();
  fireEvent.click(screen.getByRole('button', { name: '粘贴格式' }));
  expect(screen.getByRole('menuitem', { name: '图层尺寸' })).toBeDisabled();
  expect(screen.getByRole('menuitem', { name: '刻度与范围' })).toBeDisabled();
  fireEvent.click(screen.getByRole('menuitem', { name: '颜色' }));
  expect(app.apply).toHaveBeenCalledOnce();
  const result = app.apply.mock.calls[0]![0];
  expect(result.panels[1].axes[0].line.color).toBe('#ff0000');
  expect(result.panels[1].axes[0].tickLabels.fontFamily).toBe(
    app.target.axes[0]!.tickLabels.fontFamily,
  );
  expect(result.panels[0]).toEqual(app.source);
  expect(screen.getByRole('status')).toHaveTextContent('已粘贴并应用颜色');
  expect(screen.getByRole('status')).not.toHaveTextContent('请应用修改');
});

it('restricts partial copies and supports keyboard navigation and Escape', () => {
  setup();
  const copy = screen.getByRole('button', { name: '复制格式' });
  fireEvent.keyDown(copy, { key: 'ArrowDown' });
  fireEvent.click(screen.getByRole('menuitem', { name: '字体' }));
  const paste = screen.getByRole('button', { name: '粘贴格式' });
  fireEvent.keyDown(paste, { key: 'ArrowDown' });
  const menu = screen.getByRole('menu', { name: '选择粘贴格式' });
  expect(within(menu).getByRole('menuitem', { name: '颜色' })).toBeDisabled();
  expect(within(menu).getByRole('menuitem', { name: '字体' })).toHaveFocus();
  fireEvent.keyDown(menu, { key: 'End' });
  expect(within(menu).getByRole('menuitem', { name: '字体' })).toHaveFocus();
  fireEvent.keyDown(menu, { key: 'Escape' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(paste).toHaveFocus();
});

it('retains copied formats after a failed paste and reports the reason', () => {
  const app = setup();
  app.apply.mockReturnValue(false);
  fireEvent.click(screen.getByRole('button', { name: '复制格式' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '字体' }));
  app.selectTarget();
  fireEvent.click(screen.getByRole('button', { name: '粘贴格式' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '字体' }));
  expect(screen.getByRole('alert')).toHaveTextContent('未能粘贴格式');
  expect(screen.getByRole('button', { name: '粘贴格式' })).toBeEnabled();
});
