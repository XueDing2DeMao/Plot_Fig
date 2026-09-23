import { TextMarkupButtons } from './TextMarkupButtons.js';
import { PaintFields } from './PaintFields.js';
import { PageGeometryFields } from './PageGeometryFields.js';
export { LayerFields } from './LayerGeometryFields.js';
import { ChartFields } from './ChartFields.js';
import type { FigureSettings } from '../state/figure-settings.js';
import type { PropertyObjectSettings } from '../state/property-object-settings.js';
import {
  PropertyInput,
  PropertySelect,
  PropertyCheck,
  PropertyFill,
} from './PropertyInputs.js';
import { LineFields, MarkerFields } from './SeriesFields.js';
import { PaletteFields } from './PaletteFields.js';
import type { Axis } from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import { XyDataViewFields } from './XyDataViewFields.js';

export type CategoryProps = {
  value: FigureSettings;
  onChange: (value: FigureSettings) => void;
};

export function PageFields({
  value,
  onChange,
  tab,
}: {
  value: Extract<PropertyObjectSettings, { kind: 'page' }>;
  onChange: (
    value: Extract<PropertyObjectSettings, { kind: 'page' }>,
    preserveLayerSize?: boolean,
  ) => void;
  tab: string;
}) {
  const page = value.page;
  const update = (next: typeof page) => onChange({ ...value, page: next });
  if (tab === 'general')
    return (
      <fieldset className="property-group">
        <legend>图页信息</legend>
        <PropertyInput
          label="图页名称"
          value={value.metadata.name}
          onChange={(e) =>
            onChange({
              ...value,
              metadata: { ...value.metadata, name: e.target.value },
            })
          }
        />
        <PropertyInput
          label="图页描述"
          value={value.metadata.description ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              metadata: { ...value.metadata, description: e.target.value },
            })
          }
        />
      </fieldset>
    );
  if (tab === 'background')
    return (
      <fieldset className="property-group">
        <legend>图页背景</legend>
        <PaintFields
          prefix="图页背景"
          value={page.backgroundPaint}
          fallback={page.background}
          onChange={(paint) => {
            const next = { ...page };
            if (paint) next.backgroundPaint = paint;
            else delete next.backgroundPaint;
            update(next);
          }}
        />
        <PropertyFill
          label="图页背景颜色"
          value={page.background}
          onChange={(background) => update({ ...page, background })}
        />
      </fieldset>
    );
  return (
    <PageGeometryFields
      page={page}
      onChange={(next, preserve) =>
        onChange({ ...value, page: next }, preserve)
      }
    />
  );
}

import { MarkerDetailFields } from './MarkerDetailFields.js';
export function CurveFields({
  value,
  onChange,
  tab,
  axes = [],
  data,
  onCreateAxis,
}: CategoryProps & {
  tab: string;
  axes?: readonly Axis[];
  data?: DataBindingSet | undefined;
  onCreateAxis?: ((position: 'top' | 'right') => void) | undefined;
}) {
  if (
    value.plot.kind !== 'xy' &&
    [
      'display',
      'bar-layout',
      'bar-style',
      'bins',
      'statistics',
      'appearance',
      'box-statistics',
      'box-points',
      'distribution',
      'heatmap',
      'contour',
      'color-scale',
      'colorbar',
      'area',
    ].includes(tab)
  )
    return (
      <>
        <CurveVisibility value={value} onChange={onChange} />
        <ChartFields value={value} onChange={onChange} tab={tab} />
        <CurveAxisFields
          value={value}
          axes={axes}
          onChange={onChange}
          onCreateAxis={onCreateAxis}
        />
      </>
    );
  if (tab === 'data' && value.plot.kind === 'xy')
    return (
      <XyDataViewFields
        plot={value.plot}
        data={data}
        axes={axes}
        onChange={(plot) => onChange({ ...value, plot })}
      />
    );
  if (tab === 'line')
    return (
      <LineFields value={value} onChange={onChange} includeDropLines={false} />
    );
  if (tab === 'symbol-details' && value.plot.kind === 'xy')
    return (
      <MarkerDetailFields
        value={value.plot.markerDetails ?? {}}
        followLineOpacity={!!value.marker.followLineOpacity}
        onChange={(details) => {
          const plot = { ...value.plot };
          if (plot.kind !== 'xy') return;
          if (Object.keys(details).length) plot.markerDetails = details;
          else delete plot.markerDetails;
          onChange({ ...value, plot });
        }}
      />
    );
  if (tab === 'palette')
    return <PaletteFields value={value} onChange={onChange} />;
  if (tab === 'symbol')
    return <MarkerFields value={value} onChange={onChange} />;
  if (tab === 'legend')
    return (
      <fieldset className="property-group">
        <legend>图例</legend>
        <PropertyCheck
          label="显示图例"
          checked={value.details.legend.visible}
          onChange={(visible) =>
            onChange({
              ...value,
              details: {
                ...value.details,
                legend: { ...value.details.legend, visible },
              },
            })
          }
        />
        <PropertySelect
          label="图例文字来源"
          value={value.details.legend.source ?? 'manual'}
          options={{ auto: '自动：数据列名', manual: '手动文字' }}
          onChange={(source) =>
            onChange({
              ...value,
              details: {
                ...value.details,
                legend: { ...value.details.legend, source },
              },
            })
          }
        />
        <PropertyInput
          label="图例文字"
          value={value.details.legend.text}
          maxLength={1024}
          onChange={(e) =>
            onChange({
              ...value,
              details: {
                ...value.details,
                legend: {
                  ...value.details.legend,
                  text: e.target.value,
                  source: 'manual',
                },
              },
            })
          }
        />
        <TextMarkupButtons
          prefix="图例文字"
          value={value.details.legend.text}
          onChange={(text) =>
            onChange({
              ...value,
              details: {
                ...value.details,
                legend: {
                  ...value.details.legend,
                  text,
                  format: 'auto',
                  source: 'manual',
                },
              },
            })
          }
        />
        <PropertySelect
          label="图例文字格式"
          value={value.details.legend.format ?? 'auto'}
          options={{
            auto: '自动识别（默认）',
            plain: '普通文字',
            rich: '上下标文字',
            latex: 'LaTeX 公式',
          }}
          onChange={(format) =>
            onChange({
              ...value,
              details: {
                ...value.details,
                legend: { ...value.details.legend, format },
              },
            })
          }
        />
        <p className="property-hint">
          自动识别时，裸 _ 和 ^ 保持原样；_{'{...}'}、^{'{...}'}
          表示上下标；$...$、\(...\) 或以 LaTeX 命令开头的内容按公式排版。
        </p>
      </fieldset>
    );
  return (
    <>
      <fieldset className="property-group">
        <legend>绘图显示</legend>
        <CurveVisibility value={value} onChange={onChange} />
        <PropertySelect
          label="绘图类型"
          value={value.details.mode}
          options={{
            markers: '散点图',
            line: '折线图',
            'line-markers': '点线图',
          }}
          onChange={(mode) =>
            onChange({ ...value, details: { ...value.details, mode } })
          }
        />
        <PropertyCheck
          label="显示连接线"
          checked={value.line.visible}
          onChange={(visible) =>
            onChange({ ...value, line: { ...value.line, visible } })
          }
        />
        <PropertyCheck
          label="显示符号"
          checked={value.marker.visible}
          onChange={(visible) =>
            onChange({ ...value, marker: { ...value.marker, visible } })
          }
        />
      </fieldset>
      <CurveAxisFields
        value={value}
        axes={axes}
        onChange={onChange}
        onCreateAxis={onCreateAxis}
      />
    </>
  );
}

function axisLabel(axis: Axis): string {
  return {
    bottom: '下 X 轴',
    top: '上 X 轴',
    left: '左 Y 轴',
    right: '右 Y 轴',
  }[axis.position];
}

function CurveAxisFields({
  value,
  axes,
  onChange,
  onCreateAxis,
}: CategoryProps & {
  axes: readonly Axis[];
  onCreateAxis?: ((position: 'top' | 'right') => void) | undefined;
}) {
  const xAxes = axes.filter((axis) => axis.dimension === 'x');
  const yAxes = axes.filter((axis) => axis.dimension === 'y');
  const options = (items: readonly Axis[]) =>
    Object.fromEntries(items.map((axis) => [axis.axisId, axisLabel(axis)]));
  return (
    <fieldset className="property-group">
      <legend>坐标轴绑定</legend>
      <PropertySelect
        label="X 坐标轴"
        value={value.plot.xAxisId}
        options={options(xAxes)}
        onChange={(xAxisId) =>
          onChange({ ...value, plot: { ...value.plot, xAxisId } })
        }
      />
      <PropertySelect
        label="Y 坐标轴"
        value={value.plot.yAxisId}
        options={options(yAxes)}
        onChange={(yAxisId) =>
          onChange({ ...value, plot: { ...value.plot, yAxisId } })
        }
      />
      {!xAxes.some((axis) => axis.position === 'top') && onCreateAxis && (
        <button
          className="property-auto"
          type="button"
          onClick={() => onCreateAxis('top')}
        >
          创建并使用上 X 轴
        </button>
      )}
      {!yAxes.some((axis) => axis.position === 'right') && onCreateAxis && (
        <button
          className="property-auto"
          type="button"
          onClick={() => onCreateAxis('right')}
        >
          创建并使用右 Y 轴
        </button>
      )}
    </fieldset>
  );
}

function CurveVisibility({ value, onChange }: CategoryProps) {
  return (
    <PropertyCheck
      label="显示整条曲线"
      checked={value.plot.visible !== false}
      onChange={(visible) =>
        onChange({ ...value, plot: { ...value.plot, visible } })
      }
    />
  );
}
