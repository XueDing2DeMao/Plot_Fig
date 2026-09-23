import type { LineMapping } from '@plot-fig/figure-schema';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';
export function LineMappingFields({
  value,
  onChange,
}: {
  value: LineMapping | undefined;
  onChange: (next: LineMapping | undefined) => void;
}) {
  return (
    <fieldset className="property-group">
      <legend>线条颜色映射</legend>
      <PropertyCheck
        label="启用线条颜色映射"
        checked={!!value}
        onChange={(on) =>
          onChange(
            on
              ? { mode: 'increment', colors: ['#2166ac', '#b2182b'] }
              : undefined,
          )
        }
      />
      {value && (
        <>
          <PropertySelect
            label="线条颜色映射方式"
            value={value.mode}
            options={{
              increment: '按原行递增',
              continuous: '连续渐变',
              categorical: '按数据分类',
            }}
            onChange={(mode) =>
              onChange({
                mode,
                colors:
                  value.colors.length === 1 && mode === 'continuous'
                    ? [value.colors[0]!, '#ffffff']
                    : value.colors,
              })
            }
          />
          {value.colors.map((color, index) => (
            <div className="property-grid" key={index}>
              <PropertyInput
                label={`线条映射颜色 ${index + 1}`}
                type="color"
                value={color}
                onChange={(e) =>
                  onChange({
                    ...value,
                    colors: value.colors.map((v, i) =>
                      i === index ? e.target.value : v,
                    ),
                  })
                }
              />
              <button
                type="button"
                disabled={
                  value.colors.length <= (value.mode === 'continuous' ? 2 : 1)
                }
                onClick={() =>
                  onChange({
                    ...value,
                    colors: value.colors.filter((_, i) => i !== index),
                  })
                }
              >
                删除线条颜色 {index + 1}
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={value.colors.length >= 64}
            onClick={() =>
              onChange({ ...value, colors: [...value.colors, '#4daf4a'] })
            }
          >
            添加线条颜色
          </button>
          {value.mode === 'continuous' && (
            <>
              <PropertyCheck
                label="指定线条颜色范围"
                checked={!!value.domain}
                onChange={(on) => {
                  const next = { ...value };
                  if (on) next.domain = { min: 0, max: 1 };
                  else delete next.domain;
                  onChange(next);
                }}
              />
              {value.domain && (
                <>
                  <PropertyNumber
                    label="线条颜色范围起点"
                    value={value.domain.min}
                    min={null}
                    step="any"
                    onChange={(min) =>
                      onChange({ ...value, domain: { ...value.domain!, min } })
                    }
                  />
                  <PropertyNumber
                    label="线条颜色范围终点"
                    value={value.domain.max}
                    min={null}
                    step="any"
                    onChange={(max) =>
                      onChange({ ...value, domain: { ...value.domain!, max } })
                    }
                  />
                </>
              )}
            </>
          )}
          <p className="property-hint">
            每段按起始原行着色；原行顺序与颜色范围在排序、筛选及抽样后保持一致。
          </p>
        </>
      )}
    </fieldset>
  );
}
