// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App.js';

function navigation() {
  return within(screen.getByRole('navigation', { name: '工作区导航' }));
}

function expectCurrent(name: RegExp) {
  const current = navigation().getByRole('link', { current: 'location' });
  expect(current).toHaveAccessibleName(name);
  expect(current).toHaveClass('active');
}

describe('workspace navigation', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'));
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it.each([
    ['#binding', /数据绑定/],
    ['', /导入数据/],
    ['#unknown', /导入数据/],
  ])('selects the workspace section for initial hash %s', (hash, name) => {
    window.history.replaceState(null, '', `/${hash}`);
    render(<App />);
    expectCurrent(name as RegExp);
  });

  it('keeps native anchor navigation and updates the selected section after a click', async () => {
    render(<App />);
    const link = navigation().getByRole('link', { name: /图形设置/ });
    expect(link).toHaveAttribute('href', '#style');
    fireEvent.click(link);
    await waitFor(() => {
      expect(window.location.hash).toBe('#style');
      expectCurrent(/图形设置/);
    });
    expect(
      navigation().getByRole('link', { name: /导入数据/ }),
    ).not.toHaveClass('active');
  });

  it('follows hash changes and browser history without another navigation click', async () => {
    window.history.replaceState(null, '', '/#binding');
    render(<App />);
    act(() => {
      window.location.hash = '#project';
    });
    await waitFor(() => expectCurrent(/项目文件/));
    act(() => window.history.back());
    await waitFor(() => {
      expect(window.location.hash).toBe('#binding');
      expectCurrent(/数据绑定/);
    });
    act(() => {
      window.location.hash = '#unknown';
    });
    await waitFor(() => expectCurrent(/导入数据/));
  });
});
