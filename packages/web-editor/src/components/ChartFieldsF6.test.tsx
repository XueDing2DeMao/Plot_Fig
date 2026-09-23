// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { readFigureSettings } from '../state/figure-settings.js';
import { ChartFields } from './ChartFields.js';

afterEach(cleanup);

function fields(kind: Parameters<typeof chartTemplate>[0], tab: string) {
  const template = chartTemplate(kind),
    value = readFigureSettings(template, 'series-1'),
    onChange = vi.fn();
  function StatefulFields() {
    const [current, setCurrent] = useState(value);
    return (
      <ChartFields
        value={current}
        onChange={(next) => {
          onChange(next);
          setCurrent(next);
        }}
        tab={tab}
      />
    );
  }
  render(<StatefulFields />);
  return { value, onChange };
}

it('uses the current histogram classification for bins and distribution', () => {
  fields('histogram', 'bins');
  expect(screen.getByLabelText('分箱方式')).toBeInTheDocument();
  expect(screen.getByLabelText('分箱尺度')).toBeInTheDocument();
  cleanup();
  const { onChange } = fields('histogram', 'statistics');
  expect(screen.getByLabelText('叠加分布')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('叠加分布'));
  expect(onChange.mock.calls.at(-1)?.[0].plot.distribution.parameters).toEqual({
    mu: 0,
    sigma: 1,
  });
  expect(screen.getByLabelText('分布类型')).toBeInTheDocument();
  expect(screen.getByLabelText('位置 μ')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('分布类型'), {
    target: { value: 'binomial' },
  });
  expect(onChange.mock.calls.at(-1)?.[0].plot.distribution.parameters).toEqual({
    trials: 10,
    p: 0.5,
  });
  expect(screen.getByLabelText('试验次数 n')).toBeInTheDocument();
  expect(screen.getByLabelText('成功概率 p')).toBeInTheDocument();
});

it('preserves the histogram scale while changing bin modes and values', () => {
  fields('histogram', 'bins');
  fireEvent.change(screen.getByLabelText('分箱尺度'), {
    target: { value: 'log10' },
  });
  fireEvent.change(screen.getByLabelText('分箱方式'), {
    target: { value: 'count' },
  });
  expect(screen.getByLabelText('分箱尺度')).toHaveValue('log10');
  fireEvent.change(screen.getByLabelText('箱数'), { target: { value: '12' } });
  expect(screen.getByLabelText('分箱尺度')).toHaveValue('log10');
});

it('exposes bar, box, heatmap and colorbar-specific settings on their own pages', () => {
  fields('bar', 'bar-layout');
  expect(screen.getByLabelText('柱形基线')).toBeInTheDocument();
  expect(screen.getByLabelText('百分比堆叠')).toBeInTheDocument();
  cleanup();
  fields('box', 'box-statistics');
  expect(screen.getByLabelText('四分位算法')).toBeInTheDocument();
  expect(screen.getByLabelText('显示缺口')).toBeInTheDocument();
  expect(screen.getByLabelText('显示置信区间')).toBeInTheDocument();
  cleanup();
  fields('box', 'box-points');
  expect(screen.getByLabelText('连接百分位')).toBeInTheDocument();
  cleanup();
  fields('box', 'distribution');
  fireEvent.click(screen.getByLabelText('叠加分布'));
  expect(screen.getByLabelText('分布布局')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: '双层分裂' })).toBeInTheDocument();
  cleanup();
  fields('box', 'appearance');
  expect(screen.getByLabelText('须线颜色')).toBeInTheDocument();
  cleanup();
  fields('heatmap', 'heatmap');
  expect(screen.getByLabelText('数据区域')).toBeInTheDocument();
  expect(screen.getByLabelText('显示单元标签')).toBeInTheDocument();
  cleanup();
  fields('heatmap', 'colorbar');
  expect(screen.getByLabelText('色标方向')).toBeInTheDocument();
  expect(screen.getByLabelText('色标模式')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('色标模式'), {
    target: { value: 'independent' },
  });
  expect(screen.getByLabelText('独立范围最小值')).toBeInTheDocument();
});

it('supports interval contour levels and per-level styles', () => {
  fields('contour', 'contour');
  fireEvent.change(screen.getByLabelText('等值层方式'), {
    target: { value: 'interval' },
  });
  expect(screen.getByLabelText('层级步长')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '添加逐级样式' }));
  expect(screen.getByLabelText('层线颜色 1')).toBeInTheDocument();
});
