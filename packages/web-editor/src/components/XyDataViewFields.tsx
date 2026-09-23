import { useMemo } from 'react';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { Axis, XyDataView, XyPlot } from '@plot-fig/figure-schema';
import { prepareXyData } from '@plot-fig/svg-renderer';
import {
  PropertyCheck,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';

import {
  missingOptions,
  sortOptions,
  duplicateOptions,
  calculationOptions,
} from '../state/xy-data-view-options.js';

export function XyDataViewFields({
  plot,
  data,
  axes,
  onChange,
}: {
  plot: XyPlot;
  data?: DataBindingSet | undefined;
  axes: readonly Axis[];
  onChange: (plot: XyPlot) => void;
}) {
  const view = plot.dataView ?? {};
  const update = (patch: {
    [K in keyof XyDataView]?: XyDataView[K] | undefined;
  }) => {
    const dataView: XyDataView = { ...view };
    for (const key of Object.keys(patch) as Array<keyof XyDataView>)
      if (patch[key] === undefined) delete dataView[key];
      else Object.assign(dataView, { [key]: patch[key] });
    const next = { ...plot };
    if (Object.keys(dataView).length) next.dataView = dataView;
    else delete next.dataView;
    onChange(next);
  };
  const prepared = useMemo(() => {
    if (!data) return undefined;
    try {
      return prepareXyData(plot, data, axes);
    } catch {
      return undefined;
    }
  }, [plot, data, axes]);
  const sourceLabels = (['x', 'y'] as const).map((role) => {
    const binding = data?.bindings.find(
      (b) => b.dataSlotId === plot.bindings[role] && b.status === 'valid',
    );
    const column = data?.columns.find((c) => c.columnId === binding?.columnId);
    return `${role.toUpperCase()}：${column ? [column.source?.tableName, column.name].filter(Boolean).join(' / ') : '未绑定'}`;
  });
  const path = 'settings.plot.dataView.';
  const range = view.rowRange;
  const sampling = view.sampling;
  return (
    <>
      <fieldset className="property-group">
        <legend>数据来源与范围</legend>
        {sourceLabels.map((label) => (
          <p key={label} className="property-hint">
            {label}
          </p>
        ))}
        <PropertyCheck
          label="限定数据行范围"
          checked={!!range}
          onChange={(enabled) =>
            update({
              rowRange: enabled
                ? { from: 1, to: Math.max(1, prepared?.sourceCount ?? 100000) }
                : undefined,
            })
          }
        />
        {range && (
          <div className="property-row">
            <PropertyNumber
              label="起始数据行"
              fieldPath={path + 'rowRange.from'}
              value={range.from}
              min={1}
              step={1}
              onChange={(from) => update({ rowRange: { ...range, from } })}
            />
            <PropertyNumber
              label="结束数据行"
              fieldPath={path + 'rowRange.to'}
              value={range.to}
              min={1}
              step={1}
              onChange={(to) => update({ rowRange: { ...range, to } })}
            />
          </div>
        )}
        <p className="property-hint">
          按数据区原始行号计数，从 1 开始，包含起止行；排序后行号保持不变。
        </p>
      </fieldset>
      <fieldset className="property-group">
        <legend>数据处理</legend>
        <PropertySelect
          label="无效点连接方式"
          value={view.missing ?? 'connect'}
          options={missingOptions}
          onChange={(missing) => update({ missing })}
        />
        <PropertySelect
          label="X 值排序"
          value={view.sort ?? 'none'}
          options={sortOptions}
          onChange={(sort) => update({ sort })}
        />
        <PropertySelect
          label="重复 X 值"
          value={view.duplicates ?? 'keep'}
          options={duplicateOptions}
          onChange={(duplicates) => update({ duplicates })}
        />
        <PropertySelect
          label="计算与自动范围的数据来源"
          value={view.calculationSource ?? 'raw'}
          options={calculationOptions}
          onChange={(calculationSource) => update({ calculationSource })}
        />
        <p className="property-hint">
          无效点包含非数值和对数轴上不大于零的值。断开后，各段单独排序、去重。抽样不参与计算；默认各轴独立自动缩放，手动范围保持不变。
        </p>
      </fieldset>
      <fieldset className="property-group">
        <legend>显示抽样</legend>
        <PropertySelect
          label="抽样方式"
          value={sampling?.mode ?? 'none'}
          options={{ none: '不抽样', every: '每隔若干点', count: '按总点数' }}
          onChange={(mode) =>
            update({
              sampling:
                mode === 'none'
                  ? undefined
                  : mode === 'every'
                    ? { mode, step: 2 }
                    : {
                        mode,
                        count: Math.min(
                          100,
                          prepared?.selectedRows.length || 100,
                        ),
                      },
              ...(mode === 'none' ? { sampleExport: undefined } : {}),
            })
          }
        />
        {sampling && (
          <>
            {sampling.mode === 'every' ? (
              <PropertyNumber
                label="抽样步长"
                fieldPath={path + 'sampling.step'}
                value={sampling.step}
                min={1}
                step={1}
                onChange={(step) => update({ sampling: { ...sampling, step } })}
              />
            ) : (
              <PropertyNumber
                label="抽样总点数"
                fieldPath={path + 'sampling.count'}
                value={sampling.count}
                min={1}
                step={1}
                onChange={(count) =>
                  update({ sampling: { ...sampling, count } })
                }
              />
            )}
            <PropertyCheck
              label="保留每段首点"
              checked={sampling.keepFirst ?? false}
              onChange={(keepFirst) =>
                update({ sampling: { ...sampling, keepFirst } })
              }
            />
            <PropertyCheck
              label="保留每段尾点"
              checked={sampling.keepLast ?? false}
              onChange={(keepLast) =>
                update({ sampling: { ...sampling, keepLast } })
              }
            />
            <PropertyCheck
              label="导出也使用抽样数据"
              checked={view.sampleExport ?? false}
              onChange={(sampleExport) => update({ sampleExport })}
            />
          </>
        )}
        <p className="property-hint">
          默认导出处理后的完整所选数据。按总点数抽样时，各段共用点数额度；额度不足以保留指定端点时，请增加总点数。
        </p>
      </fieldset>
      {prepared && (
        <p className="property-hint" role="status">
          原始 {prepared.sourceCount} 行 · 所选 {prepared.selectedRows.length}{' '}
          点 · 显示{' '}
          {prepared.displaySegments.reduce(
            (count, segment) => count + segment.length,
            0,
          )}{' '}
          点 · 导出{' '}
          {prepared.exportSegments.reduce(
            (count, segment) => count + segment.length,
            0,
          )}{' '}
          点 · 计算 {prepared.calculationRows.length} 点
        </p>
      )}
      <button
        type="button"
        className="property-auto"
        onClick={() => {
          const next = { ...plot };
          delete next.dataView;
          onChange(next);
        }}
      >
        恢复默认数据处理
      </button>
    </>
  );
}
