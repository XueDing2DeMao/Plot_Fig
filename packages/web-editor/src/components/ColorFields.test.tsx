// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { ColorScale } from '@plot-fig/figure-schema';
import { chartDefaults } from '../state/chart-defaults.js';
import { defaultTemplate } from '../state/default-template.js';
import { ColorFields } from './ColorFields.js';

afterEach(cleanup);
function setup(overrides: Partial<ColorScale> = {}) {
  const plot = chartDefaults(
    'heatmap',
    defaultTemplate().panels[0]!.plotSlots[0]!,
  );
  if (plot.kind !== 'heatmap') throw new Error('Expected heatmap');
  let current = { ...plot.colorScale, ...overrides };
  function Editor() {
    const [value, setValue] = useState(current);
    current = value;
    return <ColorFields value={value} onChange={setValue} />;
  }
  render(<Editor />);
  return () => current;
}

it('选择预设替换色阶，保留范围、尺度和色标设置，并更新预览', () => {
  const value = setup({
    range: { mode: 'fixed', min: 1, max: 100 },
    transform: 'log10',
    reverse: true,
  });
  const before = structuredClone(value());
  expect(screen.getByLabelText('颜色映射预设')).toHaveValue('viridis');
  fireEvent.change(screen.getByLabelText('颜色映射预设'), {
    target: { value: 'plasma' },
  });
  expect(value().colors).toEqual([
    '#0d0887',
    '#7e03a8',
    '#cc4778',
    '#f89540',
    '#f0f921',
  ]);
  expect(value()).toEqual({ ...before, colors: value().colors });
  expect(
    screen.getByRole('img', { name: '颜色映射预览（低值到高值）' }),
  ).toHaveStyle({
    background:
      'linear-gradient(to right, #f0f921, #f89540, #cc4778, #7e03a8, #0d0887)',
  });
});

it('自定义色阶后显示自定义，重新选择预设可恢复；识别颜色时忽略大小写', () => {
  setup({ colors: ['#440154', '#3B528B', '#21918C', '#5EC962', '#FDE725'] });
  expect(screen.getByLabelText('颜色映射预设')).toHaveValue('viridis');
  fireEvent.click(screen.getByText('自定义色阶'));
  fireEvent.change(screen.getByLabelText('色阶颜色 1'), {
    target: { value: '#123456' },
  });
  expect(screen.getByLabelText('颜色映射预设')).toHaveValue('custom');
  fireEvent.change(screen.getByLabelText('颜色映射预设'), {
    target: { value: 'grayscale' },
  });
  expect(screen.getByLabelText('色阶颜色 1')).toHaveValue('#000000');
  expect(screen.getByLabelText('色阶颜色 2')).toHaveValue('#ffffff');
});

it('反向和分块设置同步到预览，两色分块边界位于中间', () => {
  const value = setup({ colors: ['#000000', '#ffffff'] });
  fireEvent.click(screen.getByLabelText('反向色阶'));
  fireEvent.change(screen.getByLabelText('颜色插值'), {
    target: { value: 'discrete' },
  });
  expect(value().reverse).toBe(true);
  expect(
    screen.getByRole('img', { name: '颜色映射预览（低值到高值）' }),
  ).toHaveStyle({
    background:
      'linear-gradient(to right, #ffffff 0%, #ffffff 50%, #000000 50%, #000000 100%)',
  });
});
