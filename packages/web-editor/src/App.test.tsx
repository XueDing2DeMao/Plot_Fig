// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import App from './App.js';

describe('web editor shell', () => {
  it('shows local file input, bindings, diagnostics and preview regions', () => {
    render(<App />);
    expect(screen.getByLabelText('选择 CSV 文件')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: '数据绑定' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: '诊断信息' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: '图形预览' }),
    ).toBeInTheDocument();
  });
});
