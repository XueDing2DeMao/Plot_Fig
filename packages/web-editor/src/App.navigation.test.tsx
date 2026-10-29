// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import App from './App.js';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

it('keeps the keyboard shortcut to the main workspace without the section navigation', async () => {
  render(<App />);
  expect(
    screen.queryByRole('navigation', { name: '工作区导航' }),
  ).not.toBeInTheDocument();
  const main = screen.getByRole('main');
  const skipLink = screen.getByRole('link', { name: '跳到主内容' });
  expect(skipLink).toHaveAttribute('href', `#${main.id}`);
  expect(main).toHaveAttribute('tabindex', '-1');
  fireEvent.click(skipLink);
  await waitFor(() => expect(window.location.hash).toBe(`#${main.id}`));
});
