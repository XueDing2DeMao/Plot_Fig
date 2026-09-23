import { useState } from 'react';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { fitFigureContent } from '../browser/figure-bounds.js';
import { PropertyCheck } from './PropertyInputs.js';

export function GeometryFitFields({
  template,
  data,
  onChange,
  disabled,
}: {
  template: FigureTemplate;
  data: DataBindingSet | undefined;
  onChange: (template: FigureTemplate) => void;
  disabled: boolean;
}) {
  const [keepAspect, setKeepAspect] = useState(true);
  const [error, setError] = useState('');
  const fit = (direction: 'page' | 'layers') => {
    if (!data || disabled) return;
    try {
      const next = fitFigureContent(template, data, direction, keepAspect);
      onChange(next);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法适配绘图内容');
    }
  };
  return (
    <fieldset className="property-group">
      <legend>内容适配</legend>
      <p className="property-hint">
        包含标题、刻度标签、图例、色标及可见的背景、边框和阴影。隐藏图层不参与适配。
        图页适配保留可见图层实际尺寸；图层适配保留页面及页级对象位置。
      </p>
      {template.panels.some((panel) => panel.axisLengthRatio) && (
        <p className="property-hint">
          比例图层保留可用区域，实际轴长按数据比例计算。
        </p>
      )}
      <PropertyCheck
        label="适配图层时保持比例"
        checked={keepAspect}
        onChange={setKeepAspect}
      />
      <div className="property-grid">
        <button
          type="button"
          disabled={disabled || !data}
          onClick={() => fit('page')}
        >
          图页适配内容
        </button>
        <button
          type="button"
          disabled={disabled || !data}
          onClick={() => fit('layers')}
        >
          全部图层适配边距
        </button>
      </div>
      {!data && (
        <p className="property-hint">导入数据后可按实际绘图内容适配。</p>
      )}
      {error && (
        <p role="alert" className="property-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
