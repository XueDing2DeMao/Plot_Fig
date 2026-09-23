import { PaintFields } from './PaintFields.js';
import type { PlotSlot } from '@plot-fig/figure-schema';
import type { CategoryProps } from './OriginObjectFields.js';
import {
  PropertySelect,
  PropertyNumber,
  PropertyCheck,
  PropertyInput,
} from './PropertyInputs.js';
import { SignedNumber, FillFields } from './ChartInputs.js';
import { GridFields } from './GridFields.js';
import { HistogramFields } from './HistogramFields.js';
import { DistributionFields } from './DistributionFields.js';
type ChartProps<T extends PlotSlot> = { plot: T; onChange: (plot: T) => void };
function OrientationFields({
  plot,
  onChange,
}: ChartProps<Extract<PlotSlot, { kind: 'bar' | 'box' }>>) {
  return (
    <>
      <PropertySelect
        label="图表方向"
        value={plot.orientation}
        options={{ vertical: '竖向', horizontal: '横向' }}
        onChange={(orientation) => onChange({ ...plot, orientation })}
      />
      <PropertyNumber
        label="类别带宽比例"
        fieldPath="settings.plot.width"
        step={0.05}
        value={plot.width}
        onChange={(width) => onChange({ ...plot, width })}
      />
    </>
  );
}
function BarFields({
  plot,
  onChange,
  section = 'bar-layout',
}: ChartProps<Extract<PlotSlot, { kind: 'bar' }>> & { section?: string }) {
  const options = plot.options ?? {
    baseline: 0,
    percentage: false,
    missing: 'gap' as const,
  };
  if (section === 'bar-style') {
    const positive = options.positive ?? plot.fillStyle,
      negative = options.negative ?? plot.fillStyle,
      updateStyle = (
        key: 'positive' | 'negative',
        style: typeof plot.fillStyle,
      ) => onChange({ ...plot, options: { ...options, [key]: style } });
    return (
      <>
        <fieldset className="property-group">
          <legend>正值样式</legend>
          <PaintFields
            prefix="正值"
            value={positive.paint}
            fallback={positive.color}
            onChange={(paint) => {
              const next = { ...positive };
              if (paint) next.paint = paint;
              else delete next.paint;
              updateStyle('positive', next);
            }}
          />
          <PropertyInput
            label="正值填充颜色"
            type="color"
            value={positive.color}
            onChange={(event) =>
              updateStyle('positive', {
                ...positive,
                color: event.target.value,
              })
            }
          />
          <PropertyNumber
            label="正值不透明度"
            fieldPath="settings.plot.options.positive.opacity"
            value={positive.opacity}
            step={0.05}
            onChange={(opacity) =>
              updateStyle('positive', { ...positive, opacity })
            }
          />
          <PropertyInput
            label="正值边框颜色"
            type="color"
            value={positive.borderColor}
            onChange={(event) =>
              updateStyle('positive', {
                ...positive,
                borderColor: event.target.value,
              })
            }
          />
          <PropertyNumber
            label="正值边框宽度"
            fieldPath="settings.plot.options.positive.borderWidthPt"
            value={positive.borderWidthPt}
            step={0.25}
            onChange={(borderWidthPt) =>
              updateStyle('positive', { ...positive, borderWidthPt })
            }
          />
        </fieldset>
        <fieldset className="property-group">
          <legend>负值样式</legend>
          <PaintFields
            prefix="负值"
            value={negative.paint}
            fallback={negative.color}
            onChange={(paint) => {
              const next = { ...negative };
              if (paint) next.paint = paint;
              else delete next.paint;
              updateStyle('negative', next);
            }}
          />
          <PropertyInput
            label="负值填充颜色"
            type="color"
            value={negative.color}
            onChange={(event) =>
              updateStyle('negative', {
                ...negative,
                color: event.target.value,
              })
            }
          />
          <PropertyNumber
            label="负值不透明度"
            fieldPath="settings.plot.options.negative.opacity"
            value={negative.opacity}
            step={0.05}
            onChange={(opacity) =>
              updateStyle('negative', { ...negative, opacity })
            }
          />
          <PropertyInput
            label="负值边框颜色"
            type="color"
            value={negative.borderColor}
            onChange={(event) =>
              updateStyle('negative', {
                ...negative,
                borderColor: event.target.value,
              })
            }
          />
          <PropertyNumber
            label="负值边框宽度"
            fieldPath="settings.plot.options.negative.borderWidthPt"
            value={negative.borderWidthPt}
            step={0.25}
            onChange={(borderWidthPt) =>
              updateStyle('negative', { ...negative, borderWidthPt })
            }
          />
        </fieldset>
      </>
    );
  }
  return (
    <>
      <p className="property-hint">
        {plot.layout === 'stacked'
          ? '堆叠柱：正负值分别累计'
          : '并列柱：同类别的系列并列排列'}
      </p>
      <PropertyNumber
        label="柱间距比例"
        fieldPath="settings.plot.gap"
        step={0.05}
        value={plot.gap}
        onChange={(gap) => onChange({ ...plot, gap })}
      />
      <PropertyNumber
        label="柱形重叠比例"
        fieldPath="settings.plot.overlap"
        min={null}
        step={0.05}
        value={plot.overlap ?? 0}
        onChange={(overlap) => onChange({ ...plot, overlap })}
      />
      <SignedNumber
        label="柱形基线"
        fieldPath="settings.plot.options.baseline"
        value={options.baseline}
        onChange={(baseline) =>
          onChange({ ...plot, options: { ...options, baseline } })
        }
      />
      <PropertyCheck
        label="百分比堆叠"
        checked={options.percentage}
        onChange={(percentage) =>
          onChange({ ...plot, options: { ...options, percentage } })
        }
      />
      <PropertySelect
        label="缺失类别"
        value={options.missing}
        options={{ gap: '保留缺口', zero: '按零值绘制' }}
        onChange={(missing) =>
          onChange({ ...plot, options: { ...options, missing } })
        }
      />
      {plot.layout === 'stacked' && (
        <PropertyInput
          label="堆叠组"
          value={plot.stackGroup ?? ''}
          onChange={(e) => onChange({ ...plot, stackGroup: e.target.value })}
        />
      )}
    </>
  );
}
function BoxFields({
  plot,
  onChange,
  section = 'box-statistics',
}: ChartProps<Extract<PlotSlot, { kind: 'box' }>> & { section?: string }) {
  const updateDistribution = (distribution: typeof plot.distribution) => {
    const next = { ...plot };
    if (distribution === undefined) delete next.distribution;
    else next.distribution = distribution;
    onChange(next);
  };
  const defaultLine = plot.lineStyle;
  const marker = (color: string) => ({
    visible: true as const,
    shape: 'circle' as const,
    sizePt: 4,
    fill: color,
    stroke: color,
    strokeWidthPt: 1,
  });
  if (section === 'distribution')
    return (
      <DistributionFields
        value={plot.distribution}
        onChange={updateDistribution}
        showLayout
      />
    );
  if (section === 'box-points')
    return (
      <>
        <PropertySelect
          label="原始点显示"
          value={plot.rawPoints ?? 'none'}
          options={{ none: '隐藏', jitter: '确定性抖动', spread: '均匀散开' }}
          onChange={(rawPoints) => onChange({ ...plot, rawPoints })}
        />
        <PropertyInput
          label="百分位列表"
          value={(plot.percentile ?? []).join(', ')}
          onChange={(event) =>
            onChange({
              ...plot,
              percentile: event.target.value
                .split(/[,，\s]+/)
                .filter(Boolean)
                .map(Number),
            })
          }
        />
        <PropertyCheck
          label="显示离群点"
          checked={plot.showOutliers}
          onChange={(showOutliers) => onChange({ ...plot, showOutliers })}
        />
        <PropertyCheck
          label="区分极端值"
          checked={!!plot.showExtremes}
          onChange={(showExtremes) => onChange({ ...plot, showExtremes })}
        />
        <PropertyCheck
          label="连接均值"
          checked={!!plot.connections?.mean}
          onChange={(mean) =>
            onChange({
              ...plot,
              connections: {
                mean,
                median: !!plot.connections?.median,
                percentiles: !!plot.connections?.percentiles,
              },
            })
          }
        />
        <PropertyCheck
          label="连接中位数"
          checked={!!plot.connections?.median}
          onChange={(median) =>
            onChange({
              ...plot,
              connections: {
                mean: !!plot.connections?.mean,
                median,
                percentiles: !!plot.connections?.percentiles,
              },
            })
          }
        />
        <PropertyCheck
          label="连接百分位"
          checked={!!plot.connections?.percentiles}
          onChange={(percentiles) =>
            onChange({
              ...plot,
              connections: {
                mean: !!plot.connections?.mean,
                median: !!plot.connections?.median,
                percentiles,
              },
            })
          }
        />
      </>
    );
  if (section === 'appearance')
    return (
      <>
        <PropertyInput
          label="须线颜色"
          type="color"
          value={plot.partStyles?.whisker?.color ?? defaultLine.color}
          onChange={(event) =>
            onChange({
              ...plot,
              partStyles: {
                ...plot.partStyles,
                whisker: {
                  ...defaultLine,
                  ...plot.partStyles?.whisker,
                  color: event.target.value,
                },
              },
            })
          }
        />
        <PropertyInput
          label="中位线颜色"
          type="color"
          value={plot.partStyles?.median?.color ?? defaultLine.color}
          onChange={(event) =>
            onChange({
              ...plot,
              partStyles: {
                ...plot.partStyles,
                median: {
                  ...defaultLine,
                  ...plot.partStyles?.median,
                  color: event.target.value,
                },
              },
            })
          }
        />
        <PropertyInput
          label="均值符号颜色"
          type="color"
          value={plot.partStyles?.mean?.fill ?? defaultLine.color}
          onChange={(event) =>
            onChange({
              ...plot,
              partStyles: {
                ...plot.partStyles,
                mean: {
                  ...marker(event.target.value),
                  ...plot.partStyles?.mean,
                  fill: event.target.value,
                  stroke: event.target.value,
                },
              },
            })
          }
        />
        <PropertyInput
          label="离群点颜色"
          type="color"
          value={plot.partStyles?.outlier?.fill ?? defaultLine.color}
          onChange={(event) =>
            onChange({
              ...plot,
              partStyles: {
                ...plot.partStyles,
                outlier: {
                  ...marker(event.target.value),
                  ...plot.partStyles?.outlier,
                  fill: event.target.value,
                  stroke: event.target.value,
                },
              },
            })
          }
        />
        <PropertyInput
          label="极端值颜色"
          type="color"
          value={plot.partStyles?.extreme?.fill ?? defaultLine.color}
          onChange={(event) =>
            onChange({
              ...plot,
              partStyles: {
                ...plot.partStyles,
                extreme: {
                  ...marker(event.target.value),
                  ...plot.partStyles?.extreme,
                  fill: event.target.value,
                  stroke: event.target.value,
                },
              },
            })
          }
        />
      </>
    );
  return (
    <>
      <PropertySelect
        label="四分位算法"
        value={plot.quantileMethod}
        options={{
          type7: 'Type 7（线性）',
          type1: 'Type 1（离散）',
          type2: 'Type 2（中点）',
        }}
        onChange={(quantileMethod) => onChange({ ...plot, quantileMethod })}
      />
      <PropertySelect
        label="箱体范围"
        value={plot.boxRange ?? 'iqr'}
        options={{
          iqr: 'Q1–Q3',
          'min-max': '最小–最大',
          percentile: '自定义百分位',
          sd: '均值±SD',
          se: '均值±SE',
        }}
        onChange={(boxRange) => onChange({ ...plot, boxRange })}
      />
      <PropertySelect
        label="须范围"
        value={plot.whiskerRange ?? 'outlier'}
        options={{
          outlier: 'IQR 内实际样本',
          'min-max': '最小–最大',
          percentile: '自定义百分位',
          sd: '均值±SD',
          se: '均值±SE',
        }}
        onChange={(whiskerRange) => onChange({ ...plot, whiskerRange })}
      />
      <PropertyNumber
        label="须范围倍数"
        fieldPath="settings.plot.whiskerFactor"
        value={plot.whiskerFactor}
        step={0.1}
        onChange={(whiskerFactor) => onChange({ ...plot, whiskerFactor })}
      />
      <PropertyNumber
        label="百分位下限"
        fieldPath="settings.plot.percentileLow"
        value={plot.percentileLow ?? 5}
        step={1}
        onChange={(percentileLow) => onChange({ ...plot, percentileLow })}
      />
      <PropertyNumber
        label="百分位上限"
        fieldPath="settings.plot.percentileHigh"
        value={plot.percentileHigh ?? 95}
        step={1}
        onChange={(percentileHigh) => onChange({ ...plot, percentileHigh })}
      />
      <PropertyCheck
        label="显示缺口"
        checked={!!plot.showNotch}
        onChange={(showNotch) => onChange({ ...plot, showNotch })}
      />
      <PropertyCheck
        label="显示均值"
        checked={!!plot.showMean}
        onChange={(showMean) => onChange({ ...plot, showMean })}
      />
      <PropertyCheck
        label="显示中位数"
        checked={plot.showMedian !== false}
        onChange={(showMedian) => onChange({ ...plot, showMedian })}
      />
      <PropertyCheck
        label="显示置信区间"
        checked={!!plot.confidence?.visible}
        onChange={(visible) =>
          onChange({
            ...plot,
            confidence: {
              visible,
              target: plot.confidence?.target ?? 'median',
              method: plot.confidence?.method ?? 'notch',
              level: plot.confidence?.level ?? 0.95,
            },
          })
        }
      />
      {plot.confidence?.visible && (
        <>
          <PropertySelect
            label="置信对象"
            value={plot.confidence.target}
            options={{ median: '中位数', mean: '均值' }}
            onChange={(target) =>
              onChange({
                ...plot,
                confidence: {
                  ...plot.confidence!,
                  target,
                  method:
                    target === 'mean' && plot.confidence!.method === 'notch'
                      ? 'normal'
                      : plot.confidence!.method,
                },
              })
            }
          />
          <PropertySelect
            label="置信方法"
            value={plot.confidence.method}
            options={{ notch: '缺口近似', normal: '正态近似' }}
            onChange={(method) =>
              onChange({
                ...plot,
                confidence: {
                  ...plot.confidence!,
                  method,
                  ...(method === 'notch'
                    ? { target: 'median', level: 0.95 }
                    : {}),
                },
              })
            }
          />
          {plot.confidence.method === 'normal' && (
            <PropertyNumber
              label="置信水平"
              fieldPath="settings.plot.confidence.level"
              value={plot.confidence.level}
              min={0}
              step={0.01}
              onChange={(level) =>
                onChange({
                  ...plot,
                  confidence: { ...plot.confidence!, level },
                })
              }
            />
          )}
        </>
      )}
    </>
  );
}
export function ChartFields({
  value,
  onChange,
  tab = 'display',
}: CategoryProps & { tab?: string }) {
  const plot = value.plot;
  const update = (plot: PlotSlot) => onChange({ ...value, plot });
  if (plot.kind === 'xy') return null;
  if (plot.kind === 'heatmap' || plot.kind === 'contour')
    return <GridFields plot={plot} onChange={update} section={tab} />;
  const showFill =
    tab === 'appearance' ||
    tab === 'bar-style' ||
    tab === 'display' ||
    (plot.kind === 'area' && tab === 'area');
  return (
    <>
      <fieldset className="property-group">
        <legend>图表参数</legend>
        {(plot.kind === 'bar' || plot.kind === 'box') &&
          ['display', 'bar-layout', 'box-statistics'].includes(tab) && (
            <OrientationFields plot={plot} onChange={update} />
          )}
        {plot.kind === 'bar' &&
          ['display', 'bar-layout', 'bar-style'].includes(tab) && (
            <BarFields plot={plot} onChange={update} section={tab} />
          )}
        {plot.kind === 'histogram' && (
          <HistogramFields
            plot={plot}
            onChange={update}
            section={tab === 'display' ? 'bins' : tab}
          />
        )}
        {plot.kind === 'box' &&
          [
            'display',
            'box-statistics',
            'box-points',
            'distribution',
            'appearance',
          ].includes(tab) && (
            <BoxFields plot={plot} onChange={update} section={tab} />
          )}
        {plot.kind === 'area' && (
          <SignedNumber
            label="面积基线"
            fieldPath="settings.plot.baseline"
            value={plot.baseline}
            onChange={(baseline) => update({ ...plot, baseline })}
          />
        )}
      </fieldset>
      {showFill && (
        <FillFields
          value={plot.fillStyle}
          onChange={(fillStyle) => update({ ...plot, fillStyle })}
        />
      )}
    </>
  );
}
