import { useContext } from 'react';
import type { DataColumn } from '@plot-fig/data-binding';
import type { MarkerMapping } from '@plot-fig/figure-schema';
import { markerShapeOptions } from '../state/marker-shape-options.js';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertyNumberDraftContext,
  PropertySelect,
} from './PropertyInputs.js';

export type MarkerMappingSettings = {
  mapping: MarkerMapping;
  columns: { color?: string; size?: string; shape?: string };
};
const defaults: Required<MarkerMapping> = {
  color: {
    mode: 'continuous',
    target: 'fill',
    colors: ['#2166ac', '#f7f7f7', '#b2182b'],
  },
  size: { mode: 'area', minSize: 4, maxSize: 18, unit: 'pt' },
  shape: { shapes: ['circle', 'square', 'triangle'] },
};
const names = { color: '颜色', size: '大小', shape: '形状' };
const numericLabels = [
  '最小符号尺寸',
  '最大符号尺寸',
  '颜色输入起点',
  '颜色输入终点',
  '大小输入起点',
  '大小输入终点',
];
export function MarkerMappingFields({
  value,
  columns,
  onChange,
  properties = ['color', 'size', 'shape'],
  showColumns = true,
  bindingsDisabled = false,
}: {
  value: MarkerMappingSettings;
  columns: readonly DataColumn[];
  onChange: (next: MarkerMappingSettings) => void;
  properties?: (keyof MarkerMapping)[];
  showColumns?: boolean;
  bindingsDisabled?: boolean;
}) {
  const drafts = useContext(PropertyNumberDraftContext);
  const clearTexts = (labels: readonly string[]) =>
    labels.forEach((label) => drafts?.setText(label, ''));
  const update = <K extends keyof MarkerMapping>(
    key: K,
    next: MarkerMapping[K],
  ) => {
    const mapping = { ...value.mapping };
    if (next === undefined) delete mapping[key];
    else mapping[key] = next;
    onChange({ ...value, mapping });
  };
  const columnOptions = (property: keyof MarkerMapping) =>
    Object.fromEntries([
      ['', '请选择数据列'],
      ...columns
        .filter(
          (c) =>
            property === 'shape' ||
            (property === 'color' &&
              value.mapping.color?.mode === 'categorical') ||
            c.valueType === 'number',
        )
        .map((c) => [c.columnId, c.name]),
    ]);
  const source = (property: keyof MarkerMapping) => (
    <fieldset disabled={bindingsDisabled} className="mapping-source">
      <PropertySelect
        label={names[property] + '数据列'}
        value={value.columns[property] ?? ''}
        options={columnOptions(property)}
        onChange={(column) =>
          onChange({
            ...value,
            columns: { ...value.columns, [property]: column },
          })
        }
      />
    </fieldset>
  );
  const domain = (key: 'color' | 'size') => {
    const mapping = value.mapping[key]!;
    const withDomain = (next: { min: number; max: number } | undefined) => {
      const result = { ...mapping };
      if (next) result.domain = next;
      else delete result.domain;
      update(key, result as never);
    };
    return (
      <>
        <PropertyCheck
          label={'指定' + names[key] + '输入范围'}
          checked={!!mapping.domain}
          onChange={(enabled) => {
            drafts?.setText(names[key] + '输入起点', '0');
            drafts?.setText(names[key] + '输入终点', '1');
            withDomain(enabled ? { min: 0, max: 1 } : undefined);
          }}
        />
        {mapping.domain && (
          <div className="property-grid">
            <PropertyNumber
              label={names[key] + '输入起点'}
              value={mapping.domain.min}
              min={null}
              step="any"
              onChange={(min) => withDomain({ ...mapping.domain!, min })}
            />
            <PropertyNumber
              label={names[key] + '输入终点'}
              value={mapping.domain.max}
              min={null}
              step="any"
              onChange={(max) => withDomain({ ...mapping.domain!, max })}
            />
          </div>
        )}
      </>
    );
  };
  const color = value.mapping.color,
    size = value.mapping.size,
    shape = value.mapping.shape;
  return (
    <fieldset className="property-group">
      <legend>按数据映射符号</legend>
      <p className="property-hint">
        各项独立设置。自动输入范围和分类顺序依据完整有效原行，筛选、排序或抽样后保持一致。
      </p>
      {properties.map((key) => (
        <section key={key} className="mapping-section">
          <PropertyCheck
            label={'启用' + names[key] + '映射'}
            checked={!!value.mapping[key]}
            onChange={(enabled) => {
              const mapping = { ...value.mapping },
                selected = { ...value.columns };
              if (enabled) {
                mapping[key] = structuredClone(defaults[key]) as never;
                selected[key] ??=
                  columns.find(
                    (c) => key === 'shape' || c.valueType === 'number',
                  )?.columnId ?? '';
              } else {
                delete mapping[key];
                delete selected[key];
              }
              if (key === 'size') {
                drafts?.setText('最小符号尺寸', '4');
                drafts?.setText('最大符号尺寸', '18');
              }
              onChange({ mapping, columns: selected });
            }}
          />
          {showColumns && value.mapping[key] && source(key)}
          {key === 'color' && color && (
            <>
              <div className="property-grid">
                <PropertySelect
                  label="颜色映射方式"
                  value={color.mode}
                  options={{ continuous: '连续渐变', categorical: '分类轮换' }}
                  onChange={(mode) => {
                    const next = { ...color, mode };
                    if (mode === 'categorical') delete next.domain;
                    if (mode === 'continuous' && next.colors.length === 1)
                      next.colors = [next.colors[0]!, '#ffffff'];
                    if (
                      showColumns &&
                      mode === 'continuous' &&
                      columns.find((c) => c.columnId === value.columns.color)
                        ?.valueType !== 'number'
                    ) {
                      onChange({
                        mapping: { ...value.mapping, color: next },
                        columns: {
                          ...value.columns,
                          color:
                            columns.find((c) => c.valueType === 'number')
                              ?.columnId ?? '',
                        },
                      });
                      return;
                    }
                    update('color', next);
                  }}
                />
                <PropertySelect
                  label="颜色作用对象"
                  value={color.target}
                  options={{
                    fill: '符号填充',
                    stroke: '符号边框',
                    both: '填充与边框',
                  }}
                  onChange={(target) => update('color', { ...color, target })}
                />
              </div>
              <div className="mapping-list">
                {color.colors.map((c, i) => (
                  <div key={i}>
                    <PropertyInput
                      label={'映射颜色 ' + (i + 1)}
                      type="color"
                      value={c}
                      onChange={(e) =>
                        update('color', {
                          ...color,
                          colors: color.colors.map((v, j) =>
                            i === j ? e.target.value : v,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label={'删除映射颜色 ' + (i + 1)}
                      disabled={
                        color.colors.length <=
                        (color.mode === 'continuous' ? 2 : 1)
                      }
                      onClick={() =>
                        update('color', {
                          ...color,
                          colors: color.colors.filter((_, j) => i !== j),
                        })
                      }
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={color.colors.length >= 64}
                onClick={() =>
                  update('color', {
                    ...color,
                    colors: [...color.colors, '#4daf4a'],
                  })
                }
              >
                添加颜色
              </button>
              {color.mode === 'continuous' && domain('color')}
            </>
          )}
          {key === 'size' && size && (
            <>
              <div className="property-grid">
                <PropertySelect
                  label="大小映射方式"
                  value={size.mode}
                  options={{
                    area: '面积随数值变化',
                    diameter: '直径随数值变化',
                  }}
                  onChange={(mode) => update('size', { ...size, mode })}
                />
                <PropertySelect
                  label="符号尺寸单位"
                  value={size.unit}
                  options={{
                    pt: 'pt',
                    'x-data': 'X 数据单位',
                    'y-data': 'Y 数据单位',
                  }}
                  onChange={(unit) => update('size', { ...size, unit })}
                />
                <PropertyNumber
                  label="最小符号尺寸"
                  value={size.minSize}
                  step="any"
                  onChange={(minSize) => update('size', { ...size, minSize })}
                />
                <PropertyNumber
                  label="最大符号尺寸"
                  value={size.maxSize}
                  step="any"
                  onChange={(maxSize) => update('size', { ...size, maxSize })}
                />
              </div>
              {domain('size')}
              <p className="property-hint">
                输入可为负数。输出尺寸非负；常量列取中间尺寸。数据单位按点中心两侧的轴跨度换算。
              </p>
            </>
          )}
          {key === 'shape' && shape && (
            <>
              <div className="mapping-list">
                {shape.shapes.map((s, i) => (
                  <div key={i}>
                    <PropertySelect
                      label={'映射形状 ' + (i + 1)}
                      value={s}
                      options={
                        Object.fromEntries(
                          Object.entries(markerShapeOptions).filter(
                            ([key]) => key !== 'custom',
                          ),
                        ) as Record<
                          Exclude<keyof typeof markerShapeOptions, 'custom'>,
                          string
                        >
                      }
                      onChange={(next) =>
                        update('shape', {
                          shapes: shape.shapes.map((v, j) =>
                            i === j ? next : v,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label={'删除映射形状 ' + (i + 1)}
                      disabled={shape.shapes.length <= 1}
                      onClick={() =>
                        update('shape', {
                          shapes: shape.shapes.filter((_, j) => i !== j),
                        })
                      }
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={shape.shapes.length >= 64}
                onClick={() =>
                  update('shape', { shapes: [...shape.shapes, 'diamond'] })
                }
              >
                添加形状
              </button>
            </>
          )}
        </section>
      ))}
      <button
        type="button"
        onClick={() => {
          clearTexts(numericLabels);
          onChange({ mapping: {}, columns: {} });
        }}
      >
        恢复全部基础符号样式
      </button>
    </fieldset>
  );
}
