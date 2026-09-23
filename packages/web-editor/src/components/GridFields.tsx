import type { PlotSlot } from '@plot-fig/figure-schema';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';
import { NumberListInput } from './ChartInputs.js';
import { ColorFields } from './ColorFields.js';
type GridPlot = Extract<PlotSlot, { kind: 'heatmap' | 'contour' }>;
type Contour = Extract<PlotSlot, { kind: 'contour' }>;
type Props = {
  plot: GridPlot;
  onChange: (plot: GridPlot) => void;
  section?: string;
};
function LevelsInput({
  plot,
  onChange,
}: {
  plot: Contour;
  onChange: (plot: Contour) => void;
}) {
  if (plot.levels.mode === 'auto')
    return (
      <PropertyNumber
        label="等值层数"
        fieldPath="settings.plot.levels.count"
        step={1}
        value={plot.levels.count}
        onChange={(count) =>
          onChange({ ...plot, levels: { mode: 'auto', count } })
        }
      />
    );
  if (plot.levels.mode === 'interval') {
    const levels = plot.levels;
    return (
      <>
        <PropertyNumber
          label="层级起点"
          fieldPath="settings.plot.levels.start"
          value={levels.start}
          min={null}
          step="any"
          onChange={(start) =>
            onChange({ ...plot, levels: { ...levels, start } })
          }
        />
        <PropertyNumber
          label="层级终点"
          fieldPath="settings.plot.levels.end"
          value={levels.end}
          min={null}
          step="any"
          onChange={(end) => onChange({ ...plot, levels: { ...levels, end } })}
        />
        <PropertyNumber
          label="层级步长"
          fieldPath="settings.plot.levels.step"
          value={levels.step}
          step="any"
          onChange={(step) =>
            onChange({ ...plot, levels: { ...levels, step } })
          }
        />
      </>
    );
  }
  return (
    <NumberListInput
      key={plot.plotSlotId}
      label="等值层值（逗号分隔）"
      fieldPath="settings.plot.levels.values"
      value={plot.levels.values}
      onChange={(values) =>
        onChange({ ...plot, levels: { mode: 'values', values } })
      }
    />
  );
}
function ContourFields({
  plot,
  onChange,
}: {
  plot: Contour;
  onChange: (plot: Contour) => void;
}) {
  return (
    <fieldset className="property-group">
      <legend>等值线</legend>
      <PropertySelect
        label="等值线显示"
        value={plot.mode}
        options={{ lines: '线条', filled: '填色' }}
        onChange={(mode) => onChange({ ...plot, mode })}
      />
      <PropertySelect
        label="等值层方式"
        value={plot.levels.mode}
        options={{
          auto: '自动层数',
          values: '指定层值',
          interval: '起止与步长',
        }}
        onChange={(mode) =>
          onChange({
            ...plot,
            levels:
              mode === 'auto'
                ? { mode, count: 10 }
                : mode === 'interval'
                  ? { mode, start: 0, end: 10, step: 1 }
                  : { mode, values: [0, 1] },
          })
        }
      />
      <LevelsInput plot={plot} onChange={onChange} />
      {(plot.levelStyles ?? []).map((entry, index) => (
        <div className="property-grid" key={index}>
          <PropertyNumber
            label={`样式层值 ${index + 1}`}
            fieldPath={`settings.plot.levelStyles.${index}.level`}
            value={entry.level}
            min={null}
            step="any"
            onChange={(level) =>
              onChange({
                ...plot,
                levelStyles: plot.levelStyles!.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, level } : item,
                ),
              })
            }
          />
          <PropertyInput
            label={`层线颜色 ${index + 1}`}
            type="color"
            value={entry.lineStyle.color}
            onChange={(event) =>
              onChange({
                ...plot,
                levelStyles: plot.levelStyles!.map((item, itemIndex) =>
                  itemIndex === index
                    ? {
                        ...item,
                        lineStyle: {
                          ...item.lineStyle,
                          color: event.target.value,
                        },
                      }
                    : item,
                ),
              })
            }
          />
          <PropertyNumber
            label={`层线宽 ${index + 1}`}
            fieldPath={`settings.plot.levelStyles.${index}.lineStyle.widthPt`}
            value={entry.lineStyle.widthPt}
            step={0.25}
            onChange={(widthPt) =>
              onChange({
                ...plot,
                levelStyles: plot.levelStyles!.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, lineStyle: { ...item.lineStyle, widthPt } }
                    : item,
                ),
              })
            }
          />
          <button
            type="button"
            onClick={() =>
              onChange({
                ...plot,
                levelStyles: plot.levelStyles!.filter(
                  (_, itemIndex) => itemIndex !== index,
                ),
              })
            }
          >
            移除层样式 {index + 1}
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={(plot.levelStyles?.length ?? 0) >= 50}
        onClick={() =>
          onChange({
            ...plot,
            levelStyles: [
              ...(plot.levelStyles ?? []),
              { level: 0, lineStyle: { ...plot.lineStyle } },
            ],
          })
        }
      >
        添加逐级样式
      </button>
    </fieldset>
  );
}
export function GridFields({ plot, onChange, section = 'color-scale' }: Props) {
  if (section === 'colorbar')
    return (
      <ColorFields
        value={plot.colorScale}
        section="colorbar"
        onChange={(colorScale) => onChange({ ...plot, colorScale })}
      />
    );
  if (section === 'heatmap' && plot.kind === 'heatmap') {
    const heatmap = plot.heatmap ?? {
      missingColor: '#eeeeee',
      labels: false,
      interpolation: 'nearest' as const,
      dataRegion: 'matrix' as const,
    };
    return (
      <fieldset className="property-group">
        <legend>热图单元</legend>
        <PropertySelect
          label="数据区域"
          value={heatmap.dataRegion}
          options={{ matrix: '规则矩阵', xyz: '不规则 XYZ 三角网' }}
          onChange={(dataRegion) =>
            onChange({ ...plot, heatmap: { ...heatmap, dataRegion } })
          }
        />
        <PropertySelect
          label="单元插值"
          value={heatmap.interpolation}
          options={{ nearest: '最近单元', bilinear: '双线性' }}
          onChange={(interpolation) =>
            onChange({ ...plot, heatmap: { ...heatmap, interpolation } })
          }
        />
        <PropertyInput
          label="缺失值颜色"
          type="color"
          value={heatmap.missingColor}
          onChange={(event) =>
            onChange({
              ...plot,
              heatmap: { ...heatmap, missingColor: event.target.value },
            })
          }
        />
        <PropertyCheck
          label="显示单元标签"
          checked={heatmap.labels}
          onChange={(labels) =>
            onChange({ ...plot, heatmap: { ...heatmap, labels } })
          }
        />
        <PropertyCheck
          label="显示单元边界"
          checked={!!heatmap.cellBorder?.visible}
          onChange={(visible) =>
            onChange({
              ...plot,
              heatmap: {
                ...heatmap,
                cellBorder: {
                  visible,
                  color: heatmap.cellBorder?.color ?? '#ffffff',
                  widthPt: heatmap.cellBorder?.widthPt ?? 0.5,
                  dash: heatmap.cellBorder?.dash ?? 'solid',
                },
              },
            })
          }
        />
        {heatmap.cellBorder?.visible && (
          <>
            <PropertyInput
              label="单元边界颜色"
              type="color"
              value={heatmap.cellBorder.color}
              onChange={(event) =>
                onChange({
                  ...plot,
                  heatmap: {
                    ...heatmap,
                    cellBorder: {
                      ...heatmap.cellBorder!,
                      color: event.target.value,
                    },
                  },
                })
              }
            />
            <PropertyNumber
              label="单元边界宽度"
              fieldPath="settings.plot.heatmap.cellBorder.widthPt"
              value={heatmap.cellBorder.widthPt}
              step={0.25}
              onChange={(widthPt) =>
                onChange({
                  ...plot,
                  heatmap: {
                    ...heatmap,
                    cellBorder: { ...heatmap.cellBorder!, widthPt },
                  },
                })
              }
            />
          </>
        )}
      </fieldset>
    );
  }
  if (section === 'contour' && plot.kind === 'contour') {
    const contour = plot.contour ?? {
      smoothing: false,
      labels: false,
      outOfRange: 'clamp' as const,
      dataRegion: 'matrix' as const,
    };
    return (
      <>
        <ContourFields plot={plot} onChange={onChange} />
        <fieldset className="property-group">
          <legend>等高线数据与标签</legend>
          <PropertySelect
            label="数据区域"
            value={contour.dataRegion}
            options={{ matrix: '规则矩阵', xyz: '不规则 XYZ 三角网' }}
            onChange={(dataRegion) =>
              onChange({ ...plot, contour: { ...contour, dataRegion } })
            }
          />
          <PropertyCheck
            label="平滑等高线"
            checked={contour.smoothing}
            onChange={(smoothing) =>
              onChange({ ...plot, contour: { ...contour, smoothing } })
            }
          />
          <PropertyCheck
            label="显示等高线标签"
            checked={contour.labels}
            onChange={(labels) =>
              onChange({ ...plot, contour: { ...contour, labels } })
            }
          />
          <PropertySelect
            label="范围外颜色"
            value={contour.outOfRange}
            options={{ clamp: '钳制至端点', transparent: '透明' }}
            onChange={(outOfRange) =>
              onChange({ ...plot, contour: { ...contour, outOfRange } })
            }
          />
        </fieldset>
      </>
    );
  }
  return (
    <>
      {section === 'all' && plot.kind === 'contour' && (
        <ContourFields plot={plot} onChange={onChange} />
      )}
      <ColorFields
        value={plot.colorScale}
        section={section === 'all' ? 'all' : 'scale'}
        onChange={(colorScale) => onChange({ ...plot, colorScale })}
      />
    </>
  );
}
