// @vitest-environment jsdom
import {
  openPropertyFeature,
  selectAxisObject,
} from '../test-utils/property-navigation.js';
import '@testing-library/jest-dom/vitest';
import { confirmDataImport } from '../test-utils/import-data.js';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App.js';

afterEach(cleanup);
function openXAxis() {
  fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
  fireEvent.click(screen.getByRole('menuitem', { name: /X 轴/ }));
}
function category(object: string | RegExp, tab: string) {
  if (typeof object === 'string' && /[XY] 轴/.test(object)) {
    selectAxisObject(object);
    openPropertyFeature(tab);
    return;
  }
  fireEvent.click(
    within(screen.getByRole('navigation', { name: '属性对象' })).getByRole(
      'button',
      { name: object },
    ),
  );
  openPropertyFeature(tab);
}
async function loadData() {
  const csv = 'X,Y,Time\n0,1,10\n1,2,20';
  const file = new File([csv], 'xy.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => csv });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await confirmDataImport();
  await screen.findByRole('img', { name: '图形预览' });
}

describe('figure property workflow', () => {
  it('routes a menu property target into the matching object selection', async () => {
    render(<App />);
    window.dispatchEvent(
      new CustomEvent('plotfig:open-properties', {
        detail: {
          target: { kind: 'page' },
        },
      }),
    );
    const dialog = await screen.findByRole('dialog', { name: /绘图细节/ });
    const nav = within(dialog).getByRole('navigation', { name: '属性对象' });
    expect(within(nav).getByRole('button', { name: /^图页 / })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('opens the page target with F2 after removing the top menu bar', async () => {
    render(<App />);
    fireEvent.keyDown(document, { key: 'F2' });
    const dialog = await screen.findByRole('dialog', { name: /绘图细节/ });
    const nav = within(dialog).getByRole('navigation', { name: '属性对象' });
    expect(within(nav).getByRole('button', { name: /^图页 / })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('applies titles and styles while retaining columns and mode', async () => {
    render(<App />);
    await loadData();
    fireEvent.change(screen.getByLabelText('曲线 1 X 数据列'), {
      target: { value: 'time' },
    });
    fireEvent.change(screen.getByLabelText('绘制方式'), {
      target: { value: 'line' },
    });
    openXAxis();
    category('下 X 轴', '标题');
    fireEvent.change(screen.getByLabelText('X 轴标题'), {
      target: { value: 'Time (s)' },
    });
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    fireEvent.click(screen.getByRole('button', { name: '图形属性' }));
    category(/^曲线 /, '线条');
    fireEvent.change(screen.getByLabelText('线条颜色'), {
      target: { value: '#222222' },
    });
    category(/^曲线 /, '符号');
    fireEvent.change(screen.getByLabelText('符号形状'), {
      target: { value: 'diamond' },
    });
    const dialog = screen.getByRole('dialog', { name: /绘图细节/ });
    expect(within(dialog).getByLabelText('修改后的图形预览')).toHaveTextContent(
      'Time (s)',
    );
    expect(screen.getByTestId('svg-preview')).toHaveTextContent('Time (s)');
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() =>
      expect(screen.getByTestId('svg-preview')).toHaveTextContent('Time (s)'),
    );
    expect(screen.getByLabelText('曲线 1 X 数据列')).toHaveValue('time');
    expect(screen.getByLabelText('绘制方式')).toHaveValue('line');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('svg-preview').querySelector('path'),
    ).toHaveAttribute('stroke', '#222222');
  });

  it('keeps the last valid preview when a draft range is invalid', async () => {
    render(<App />);
    await loadData();
    const svg = screen.getByTestId('svg-preview').innerHTML;
    openXAxis();
    const draftSvg = screen
      .getByLabelText('修改后的图形预览')
      .querySelector('svg')!.outerHTML;
    category('下 X 轴', '刻度');
    fireEvent.change(screen.getByLabelText('X 轴最小值'), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByLabelText('X 轴最大值'), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    expect(screen.getByRole('alert')).toHaveTextContent('最小值必须小于最大值');
    expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
    expect(screen.getByTestId('svg-preview').innerHTML).toBe(svg);
    expect(
      screen.getByLabelText('修改后的图形预览').querySelector('svg')!.outerHTML,
    ).toBe(draftSvg);
  });

  it('discards draft changes on cancel and reopens with applied settings', async () => {
    render(<App />);
    await loadData();
    expect(screen.queryByLabelText('X 轴标题')).not.toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: '图形属性' });
    openXAxis();
    category('下 X 轴', '标题');
    fireEvent.change(screen.getByLabelText('X 轴标题'), {
      target: { value: 'discard me' },
    });
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('svg-preview')).not.toHaveTextContent(
      'discard me',
    );
    openXAxis();
    category('下 X 轴', '标题');
    expect(screen.getByLabelText('X 轴标题')).toHaveValue('X');
    fireEvent(
      screen.getByRole('dialog', { name: /坐标轴/ }),
      new Event('cancel', { bubbles: true, cancelable: true }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('allows editing without data and explains why the draft preview is empty', () => {
    render(<App />);
    openXAxis();
    expect(screen.getByLabelText('修改后的图形预览')).toHaveTextContent(
      '导入数据后显示预览',
    );
    category('下 X 轴', '标题');
    fireEvent.change(screen.getByLabelText('X 轴标题'), {
      target: { value: 'Time' },
    });
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    openXAxis();
    category('下 X 轴', '标题');
    expect(screen.getByLabelText('X 轴标题')).toHaveValue('Time');
  });

  it.each(['cancel', 'close', 'escape'] as const)(
    'keeps applied edits and discards later drafts on %s',
    async (dismissal) => {
      render(<App />);
      await loadData();
      const trigger = screen.getByRole('button', { name: '图形属性' });
      openXAxis();
      category('下 X 轴', '标题');
      fireEvent.change(screen.getByLabelText('X 轴标题'), {
        target: { value: 'Applied title' },
      });
      fireEvent.click(screen.getByRole('button', { name: '应用' }));
      expect(
        screen.getByRole('dialog', { name: /坐标轴/ }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByTestId('svg-preview')).toHaveTextContent(
          'Applied title',
        ),
      );
      fireEvent.change(screen.getByLabelText('X 轴标题'), {
        target: { value: 'Unapplied title' },
      });
      expect(screen.getByLabelText('修改后的图形预览')).toHaveTextContent(
        'Unapplied title',
      );
      expect(screen.getByTestId('svg-preview')).not.toHaveTextContent(
        'Unapplied title',
      );
      if (dismissal === 'escape') {
        // jsdom 不执行浏览器默认 Escape 行为，直接发出对话框的 cancel 事件。
        fireEvent(
          screen.getByRole('dialog', { name: /坐标轴/ }),
          new Event('cancel', { bubbles: true, cancelable: true }),
        );
      } else {
        fireEvent.click(
          screen.getByRole('button', {
            name: dismissal === 'cancel' ? '取消' : '关闭坐标轴属性',
          }),
        );
      }
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
      expect(screen.getByTestId('svg-preview')).toHaveTextContent(
        'Applied title',
      );
      expect(screen.getByTestId('svg-preview')).not.toHaveTextContent(
        'Unapplied title',
      );
      openXAxis();
      category('下 X 轴', '标题');
      expect(screen.getByLabelText('X 轴标题')).toHaveValue('Applied title');
    },
  );
});
