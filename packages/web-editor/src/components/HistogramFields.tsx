import type { PlotSlot, HistogramBins } from '@plot-fig/figure-schema';
import {
  PropertySelect,
  PropertyNumber,
  PropertyCheck,
} from './PropertyInputs.js';
import { NumberListInput } from './ChartInputs.js';
import { DistributionFields } from './DistributionFields.js';
type Histogram = Extract<PlotSlot, { kind: 'histogram' }>;
type Props = { plot: Histogram; onChange: (plot: Histogram) => void };
function BinsInput({ plot, onChange }: Props) {
  const bins = plot.bins;
  if (bins.mode === 'auto') return null;
  if (bins.mode === 'count')
    return (
      <PropertyNumber
        label="箱数"
        fieldPath="settings.plot.bins.count"
        value={bins.count}
        step={1}
        onChange={(count) =>
          onChange({
            ...plot,
            bins: {
              mode: 'count',
              count,
              ...(bins.scale ? { scale: bins.scale } : {}),
            },
          })
        }
      />
    );
  if (bins.mode === 'width')
    return (
      <>
        <PropertyNumber
          label="箱宽"
          fieldPath="settings.plot.bins.width"
          value={bins.width}
          step="any"
          onChange={(width) => onChange({ ...plot, bins: { ...bins, width } })}
        />
        <PropertyNumber
          label="分箱起点"
          fieldPath="settings.plot.bins.start"
          value={bins.start ?? 0}
          step="any"
          min={null}
          onChange={(start) => onChange({ ...plot, bins: { ...bins, start } })}
        />
        <PropertyNumber
          label="分箱终点"
          fieldPath="settings.plot.bins.end"
          value={bins.end ?? 1}
          step="any"
          min={null}
          onChange={(end) => onChange({ ...plot, bins: { ...bins, end } })}
        />
      </>
    );
  return (
    <NumberListInput
      key={plot.plotSlotId}
      label="分箱边界（逗号分隔）"
      fieldPath="settings.plot.bins.edges"
      value={bins.edges}
      onChange={(edges) =>
        onChange({
          ...plot,
          bins: {
            mode: 'edges',
            edges,
            ...(bins.scale ? { scale: bins.scale } : {}),
          },
        })
      }
    />
  );
}
function defaultBins(
  mode: HistogramBins['mode'],
  scale: HistogramBins['scale'],
): HistogramBins {
  const keptScale = scale ? { scale } : {};
  if (mode === 'auto') return { mode, ...keptScale };
  if (mode === 'count') return { mode, count: 10, ...keptScale };
  if (mode === 'width')
    return { mode, width: 1, start: 0, end: 10, ...keptScale };
  return { mode, edges: [0, 1, 2], ...keptScale };
}
export function HistogramFields({
  plot,
  onChange,
  section = 'bins',
}: Props & { section?: string }) {
  const updateDistribution = (distribution: typeof plot.distribution) => {
    const next = { ...plot };
    if (distribution === undefined) delete next.distribution;
    else next.distribution = distribution;
    onChange(next);
  };
  if (section === 'statistics')
    return (
      <>
        <PropertySelect
          label="直方图归一化"
          value={plot.normalization}
          options={{ count: '频数', probability: '概率', density: '概率密度' }}
          onChange={(normalization) => onChange({ ...plot, normalization })}
        />
        <PropertyCheck
          label="显示统计标注"
          checked={!!plot.showStatistics}
          onChange={(showStatistics) => onChange({ ...plot, showStatistics })}
        />
        <DistributionFields
          value={plot.distribution}
          onChange={updateDistribution}
        />
      </>
    );
  if (section === 'appearance')
    return (
      <PropertyNumber
        label="柱间距比例"
        fieldPath="settings.plot.gap"
        value={plot.gap ?? 0}
        step={0.05}
        onChange={(gap) => onChange({ ...plot, gap })}
      />
    );
  return (
    <>
      <PropertySelect
        label="分箱方式"
        value={plot.bins.mode}
        options={{
          auto: '自动',
          count: '指定箱数',
          width: '指定箱宽',
          edges: '指定边界',
        }}
        onChange={(mode) =>
          onChange({
            ...plot,
            bins: defaultBins(mode, plot.bins.scale ?? 'linear'),
          })
        }
      />
      <BinsInput plot={plot} onChange={onChange} />
      <PropertySelect
        label="分箱尺度"
        value={plot.bins.scale ?? 'linear'}
        options={{ linear: 'Linear', log10: 'Log10', log2: 'Log2', ln: 'Ln' }}
        onChange={(scale) =>
          onChange({ ...plot, bins: { ...plot.bins, scale } })
        }
      />
      <PropertySelect
        label="边界包含规则"
        value={plot.boundary ?? 'left'}
        options={{
          left: '左闭右开（末箱含终点）',
          right: '左开右闭（首箱含起点）',
        }}
        onChange={(boundary) => onChange({ ...plot, boundary })}
      />
    </>
  );
}
