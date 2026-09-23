import type { Distribution } from '@plot-fig/figure-schema';
import {
  PropertyCheck,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';

type Props = {
  value: Distribution | undefined;
  onChange: (value: Distribution | undefined) => void;
  showLayout?: boolean;
};

const defaults: Distribution = {
  visible: true,
  kind: 'normal',
  samples: 256,
  parameters: { mu: 0, sigma: 1 },
  extendPercent: 300,
  normalize: 'density',
  symmetric: false,
};

const parameterDefinitions: Partial<
  Record<
    Distribution['kind'],
    Array<{ key: string; label: string; fallback: number }>
  >
> = {
  normal: [
    { key: 'mu', label: '位置 μ', fallback: 0 },
    { key: 'sigma', label: '标准差 σ', fallback: 1 },
  ],
  lognormal: [
    { key: 'mu', label: '对数位置 μ', fallback: 0 },
    { key: 'sigma', label: '对数标准差 σ', fallback: 1 },
  ],
  weibull: [
    { key: 'shape', label: '形状 k', fallback: 2 },
    { key: 'scale', label: '尺度 λ', fallback: 1 },
  ],
  exponential: [{ key: 'scale', label: '均值/尺度', fallback: 1 }],
  gamma: [
    { key: 'shape', label: '形状 α', fallback: 2 },
    { key: 'scale', label: '尺度 β', fallback: 1 },
  ],
  laplace: [
    { key: 'mu', label: '位置 μ', fallback: 0 },
    { key: 'scale', label: '尺度 b', fallback: 1 },
  ],
  lorentz: [
    { key: 'mu', label: '位置 x₀', fallback: 0 },
    { key: 'scale', label: '尺度 γ', fallback: 1 },
  ],
  poisson: [{ key: 'lambda', label: '期望 λ', fallback: 1 }],
  binomial: [
    { key: 'trials', label: '试验次数 n', fallback: 10 },
    { key: 'p', label: '成功概率 p', fallback: 0.5 },
  ],
};

function defaultParameters(kind: Distribution['kind']) {
  return Object.fromEntries(
    (parameterDefinitions[kind] ?? []).map(({ key, fallback }) => [
      key,
      fallback,
    ]),
  );
}

export function DistributionFields({ value, onChange, showLayout }: Props) {
  const distribution = value ?? defaults;
  return (
    <fieldset className="property-group">
      <legend>分布叠加</legend>
      <PropertyCheck
        label="叠加分布"
        checked={!!value?.visible}
        onChange={(visible) =>
          onChange(visible ? { ...distribution, visible: true } : undefined)
        }
      />
      {value?.visible && (
        <>
          <PropertySelect
            label="分布类型"
            value={value.kind}
            options={{
              normal: 'Normal',
              lognormal: 'Lognormal',
              weibull: 'Weibull',
              exponential: 'Exponential',
              gamma: 'Gamma',
              laplace: 'Laplace',
              lorentz: 'Lorentz',
              kde: 'KDE',
              poisson: 'Poisson',
              binomial: 'Binomial',
            }}
            onChange={(kind) =>
              onChange({
                ...value,
                kind,
                parameters: defaultParameters(kind),
              })
            }
          />
          {(parameterDefinitions[value.kind] ?? []).map((parameter) => (
            <PropertyNumber
              key={parameter.key}
              label={parameter.label}
              fieldPath={`settings.plot.distribution.parameters.${parameter.key}`}
              value={value.parameters[parameter.key] ?? parameter.fallback}
              step={parameter.key === 'trials' ? 1 : 'any'}
              min={parameter.key === 'mu' ? null : 0}
              onChange={(next) =>
                onChange({
                  ...value,
                  parameters: { ...value.parameters, [parameter.key]: next },
                })
              }
            />
          ))}
          <PropertySelect
            label="分布归一化"
            value={value.normalize}
            options={{ density: '密度', probability: '概率', count: '频数' }}
            onChange={(normalize) => onChange({ ...value, normalize })}
          />
          <PropertyNumber
            label="曲线采样数"
            fieldPath="settings.plot.distribution.samples"
            value={value.samples}
            step={1}
            onChange={(samples) => onChange({ ...value, samples })}
          />
          <PropertyNumber
            label="支持域延伸（带宽%）"
            fieldPath="settings.plot.distribution.extendPercent"
            value={value.extendPercent}
            step={10}
            onChange={(extendPercent) => onChange({ ...value, extendPercent })}
          />
          {value.kind === 'kde' && (
            <>
              <PropertySelect
                label="KDE 带宽"
                value={value.bandwidth?.method ?? 'scott'}
                options={{
                  scott: 'Scott（Origin）',
                  silverman: 'Silverman（Origin）',
                  custom: '自定义',
                }}
                onChange={(method) =>
                  onChange({
                    ...value,
                    bandwidth: {
                      method,
                      ...(method === 'custom' ? { value: 1 } : {}),
                    },
                  })
                }
              />
              {value.bandwidth?.method === 'custom' && (
                <PropertyNumber
                  label="自定义带宽"
                  fieldPath="settings.plot.distribution.bandwidth.value"
                  value={value.bandwidth.value ?? 1}
                  step="any"
                  onChange={(bandwidthValue) =>
                    onChange({
                      ...value,
                      bandwidth: { method: 'custom', value: bandwidthValue },
                    })
                  }
                />
              )}
            </>
          )}
          {showLayout && (
            <PropertySelect
              label="分布布局"
              value={value.side ?? (value.symmetric ? 'symmetric' : 'positive')}
              options={{
                positive: '单侧（右/上）',
                negative: '单侧（左/下）',
                symmetric: '双侧对称',
                split: '双层分裂',
              }}
              onChange={(side) =>
                onChange({
                  ...value,
                  side,
                  symmetric: side === 'symmetric',
                })
              }
            />
          )}
        </>
      )}
    </fieldset>
  );
}
