// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkspaceDialog } from './WorkspaceDialog.js';

const proto = HTMLDialogElement.prototype;
const original = {
  showModal: Object.getOwnPropertyDescriptor(proto, 'showModal'),
  close: Object.getOwnPropertyDescriptor(proto, 'close'),
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const [key, descriptor] of Object.entries(original)) {
    if (descriptor) Object.defineProperty(proto, key, descriptor);
    else Reflect.deleteProperty(proto, key);
  }
  document.body.replaceChildren();
});
it('closes the native modal and restores the trigger under StrictMode', () => {
  const trigger = document.createElement('button');
  document.body.append(trigger);
  trigger.focus();
  // 模拟原生 modal 的焦点约束：关闭前不能移到外部按钮。
  vi.spyOn(trigger, 'focus').mockImplementation(() => {
    if (!document.querySelector('dialog[open]'))
      HTMLElement.prototype.focus.call(trigger);
  });
  Object.defineProperties(proto, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
        this.querySelector('button')?.focus();
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      },
    },
  });
  const view = render(
    <StrictMode>
      <WorkspaceDialog title="测试弹窗" onClose={() => {}}>
        内容
      </WorkspaceDialog>
    </StrictMode>,
  );
  view.unmount();
  expect(trigger).toHaveFocus();
});
