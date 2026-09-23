// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OriginMenuBar } from './OriginMenuBar.js';

describe('OriginMenuBar', () => {
  afterEach(() => cleanup());
  it('Alt+O from inside File opens Format without executing Open', () => {
    const onCommand = vi.fn();
    render(<OriginMenuBar context="graph" onCommand={onCommand} />);
    fireEvent.click(screen.getByRole('button', { name: '文件' }));
    fireEvent.keyDown(screen.getByRole('menuitem', { name: /打开\(O\)/ }), {
      key: 'o',
      altKey: true,
    });
    expect(onCommand).not.toHaveBeenCalled();
    expect(screen.getByRole('menu', { name: '格式' })).toBeInTheDocument();
  });
  it('scrolling a parent closes its fixed-position submenu', () => {
    render(<OriginMenuBar context="graph" onCommand={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '格式' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^轴\(/ }));
    expect(screen.getByRole('menuitem', { name: /X 轴/ })).toBeInTheDocument();
    fireEvent.scroll(screen.getByRole('menu', { name: '格式' }));
    expect(
      screen.queryByRole('menuitem', { name: /X 轴/ }),
    ).not.toBeInTheDocument();
  });
  it('exposes the Origin menus and routes the active graph context', () => {
    const onCommand = vi.fn();
    render(<OriginMenuBar context="graph" onCommand={onCommand} />);
    fireEvent.click(screen.getByRole('button', { name: '格式' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /图层属性/ }));
    expect(onCommand).toHaveBeenCalledWith('format.layer');
  });

  it('keeps the relative Origin 2025b order of plotting menus', () => {
    render(<OriginMenuBar context="graph" onCommand={() => undefined} />);
    const labels = screen
      .getByRole('menubar')
      .querySelectorAll<HTMLButtonElement>(':scope > .origin-menu > button');
    expect(
      Array.from(labels).map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      '文件',
      '编辑',
      '查看',
      '图',
      '格式',
      '插入',
      '数据',
      '工具',
      '设置',
      '窗口',
    ]);
  });

  it('uses the plotting worksheet menus and worksheet format commands', () => {
    render(<OriginMenuBar context="worksheet" onCommand={() => undefined} />);
    const roots = screen
      .getByRole('menubar')
      .querySelectorAll(':scope > .origin-menu > button');
    expect(
      Array.from(roots, (button) => button.getAttribute('aria-label')),
    ).toEqual([
      '文件',
      '编辑',
      '查看',
      '数据',
      '绘图',
      '列',
      '格式',
      '工具',
      '设置',
      '窗口',
    ]);
    fireEvent.click(screen.getByRole('button', { name: '格式' }));
    expect(
      screen.queryByRole('menuitem', { name: /图层属性/ }),
    ).not.toBeInTheDocument();
  });

  it('closes the previous menu when the active window changes', () => {
    const { rerender } = render(
      <OriginMenuBar context="graph" onCommand={() => undefined} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '格式' }));
    rerender(<OriginMenuBar context="worksheet" onCommand={() => undefined} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens axis submenu by click and routes each axis dimension', async () => {
    const onCommand = vi.fn();
    render(<OriginMenuBar context="graph" onCommand={onCommand} />);
    fireEvent.click(screen.getByRole('button', { name: '格式' }));
    const axes = screen.getByRole('menuitem', { name: /^轴\(/ });
    fireEvent.click(axes);
    const y = await screen.findByRole('menuitem', { name: /Y 轴/ });
    fireEvent.click(y);
    expect(onCommand).toHaveBeenCalledWith('format.axis.y');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('registers F2 but leaves input and modal keyboard events alone', () => {
    const onCommand = vi.fn();
    render(
      <>
        <OriginMenuBar context="graph" onCommand={onCommand} />
        <input aria-label="编辑值" />
        <dialog open>
          <button>对话框内容</button>
        </dialog>
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText('编辑值'), { key: 'F2' });
    fireEvent.keyDown(screen.getByText('对话框内容'), { key: 'F2' });
    expect(onCommand).not.toHaveBeenCalled();
    screen.getByRole('dialog').removeAttribute('open');
    fireEvent.keyDown(document, { key: 'F2' });
    expect(onCommand).toHaveBeenCalledWith('format.page');
  });

  it('keeps menu entries without an implemented command disabled', () => {
    render(<OriginMenuBar context="graph" onCommand={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: '文件' }));
    expect(screen.getByRole('menuitem', { name: /新建/ })).toHaveAttribute(
      'aria-haspopup',
      'menu',
    );
    expect(screen.getByRole('menuitem', { name: /打印\(P\)/ })).toBeDisabled();
  });

  it('opens the menu and focuses its first enabled item from the keyboard', async () => {
    render(<OriginMenuBar context="graph" onCommand={() => undefined} />);
    const format = screen.getByRole('button', { name: '格式' });
    fireEvent.keyDown(format, { key: 'ArrowDown' });
    expect(format).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() =>
      expect(document.activeElement).toHaveTextContent('页面属性'),
    );
  });

  it('closes an open menu with Escape and restores focus to the root menu', () => {
    render(<OriginMenuBar context="graph" onCommand={() => undefined} />);
    const format = screen.getByRole('button', { name: '格式' });
    fireEvent.click(format);
    const page = screen.getByRole('menuitem', { name: /页面属性/ });
    page.focus();
    fireEvent.keyDown(page, { key: 'Escape' });
    expect(
      screen.queryByRole('menu', { name: '格式' }),
    ).not.toBeInTheDocument();
    expect(document.activeElement).toBe(format);
  });
});
