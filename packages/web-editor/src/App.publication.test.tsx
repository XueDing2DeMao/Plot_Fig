// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App.js';
afterEach(cleanup);
it('opens the template library from the real app without cloning callbacks', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '模板中心' }));
  expect(screen.getByRole('dialog', { name: '模板中心' })).toBeDefined();
});
