import { useState } from 'react';
import type { CurveGroup, PlotSlot } from '@plot-fig/figure-schema';
import type { DataWorkspace } from '@plot-fig/data-binding';
import { colorMaps } from '../palettes/color-maps.js';
import { GroupParameterImportFields } from './GroupParameterImportFields.js';

type Mapping = NonNullable<CurveGroup['colorMapping']>;
export function GroupColorMappingFields({
  value,
  plots,
  workspace,
  onChange,
}: {
  value: Mapping;
  plots: PlotSlot[];
  workspace?: DataWorkspace | undefined;
  onChange: (value: Mapping) => void;
}) {
  const [batch, setBatch] = useState('');
  const [error, setError] = useState('');
  const parameters = new Map(
    value.source === 'values'
      ? value.values.map((entry) => [entry.plotSlotId, entry.value])
      : [],
  );
  const numbers = plots.flatMap((plot, index) =>
    value.source === 'index'
      ? [index + 1]
      : parameters.has(plot.plotSlotId)
        ? [parameters.get(plot.plotSlotId)!]
        : [],
  );
  const auto = numbers.length
    ? { min: Math.min(...numbers), max: Math.max(...numbers) }
    : undefined;
  const range = value.domain ?? auto;
  const [min, setMin] = useState(String(range?.min ?? 0));
  const [max, setMax] = useState(String(range?.max ?? 1));
  const validRange =
    min.trim() !== '' &&
    max.trim() !== '' &&
    Number.isFinite(Number(min)) &&
    Number.isFinite(Number(max)) &&
    Number(min) < Number(max);
  const preset = colorMaps.find(
    (p) => JSON.stringify(p.colors) === JSON.stringify(value.colors),
  );
  const colors = value.reverse ? [...value.colors].reverse() : value.colors;
  const setParameter = (plotSlotId: string, raw: string) => {
    if (value.source !== 'values') return;
    if (raw.trim() !== '' && !Number.isFinite(Number(raw))) {
      setError('参数须为有限数值。');
      return;
    }
    setError('');
    onChange({
      ...value,
      values: [
        ...value.values.filter((entry) => entry.plotSlotId !== plotSlotId),
        ...(raw.trim() === '' ? [] : [{ plotSlotId, value: Number(raw) }]),
      ],
    });
  };
  return (
    <fieldset className="origin-group-colormap">
      <legend>颜色映射（Colormap）</legend>
      <label>
        映射来源
        <select
          aria-label="组颜色映射来源"
          value={value.source}
          onChange={(event) => {
            const { source: _source, ...common } = value;
            const next = {
              colors: common.colors,
              ...(common.domain ? { domain: common.domain } : {}),
              ...(common.reverse !== undefined
                ? { reverse: common.reverse }
                : {}),
              ...(common.label !== undefined ? { label: common.label } : {}),
              ...(common.colorbar ? { colorbar: common.colorbar } : {}),
            };
            onChange(
              event.target.value === 'values'
                ? { ...next, source: 'values', values: [] }
                : { ...next, source: 'index' },
            );
          }}
        >
          <option value="index">曲线序号（Plot Index）</option>
          <option value="values">每条曲线的数值参数</option>
        </select>
      </label>
      <label>
        色带
        <select
          aria-label="组映射色带"
          value={preset?.id ?? ''}
          onChange={(event) => {
            const next = colorMaps.find((p) => p.id === event.target.value);
            if (next) onChange({ ...value, colors: [...next.colors] });
          }}
        >
          <option value="" disabled>
            自定义
          </option>
          {colorMaps.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div
        className="origin-group-gradient"
        role="img"
        aria-label="组颜色映射预览（低值到高值）"
        style={{
          background: `linear-gradient(to right, ${colors.join(', ')})`,
        }}
      />
      <div className="origin-group-range-labels">
        <span>{range?.min ?? '无数值'}</span>
        <span>{range?.max ?? '无数值'}</span>
      </div>
      <label className="origin-group-check">
        <input
          type="checkbox"
          checked={value.reverse ?? false}
          onChange={(event) =>
            onChange({ ...value, reverse: event.target.checked })
          }
        />
        反转组映射色带
      </label>
      <label className="origin-group-check">
        <input
          type="checkbox"
          checked={!value.domain}
          onChange={(event) => {
            if (event.target.checked) {
              const next = { ...value };
              delete next.domain;
              onChange(next);
            } else {
              const domain =
                auto && auto.min < auto.max ? auto : { min: 0, max: 1 };
              setMin(String(domain.min));
              setMax(String(domain.max));
              onChange({ ...value, domain });
            }
          }}
        />
        自动映射范围
      </label>
      {value.domain && (
        <div className="origin-group-range-inputs">
          <label>
            最小值
            <input
              aria-label="组映射最小值"
              type="number"
              step="any"
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
          </label>
          <label>
            最大值
            <input
              aria-label="组映射最大值"
              type="number"
              step="any"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={!validRange}
            onClick={() =>
              onChange({
                ...value,
                domain: { min: Number(min), max: Number(max) },
              })
            }
          >
            设置映射范围
          </button>
          {!validRange && (
            <small role="alert">最小值须小于最大值，且均为有限数值。</small>
          )}
        </div>
      )}
      <label className="origin-group-check">
        <input
          type="checkbox"
          checked={value.colorbar?.visible ?? false}
          onChange={(event) => {
            const next = { ...value };
            if (event.target.checked) next.colorbar = { visible: true };
            else delete next.colorbar;
            onChange(next);
          }}
        />
        显示组色标
      </label>
      <p className="property-hint">
        色标使用本组的色带、范围和反转设置，显示在图层右侧；无可绘制且已设置参数的曲线时不显示。
      </p>
      <label>
        参数名称／色标标题
        <input
          aria-label="组映射参数名称"
          placeholder="未设置时使用组名；留空不显示标题"
          maxLength={128}
          value={value.label ?? ''}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </label>
      {value.label !== undefined && (
        <button
          type="button"
          onClick={() => {
            const next = { ...value };
            delete next.label;
            onChange(next);
          }}
        >
          色标标题使用组名
        </button>
      )}
      {value.source === 'values' && (
        <>
          <GroupParameterImportFields
            plots={plots}
            workspace={workspace}
            value={value}
            onChange={onChange}
          />
          <div className="origin-group-parameters">
            {plots.map((plot) => (
              <label key={plot.plotSlotId}>
                <span title={plot.legendEntry.text || plot.plotSlotId}>
                  {plot.legendEntry.text || plot.plotSlotId}
                </span>
                <input
                  aria-label={`映射参数 ${plot.legendEntry.text || plot.plotSlotId}`}
                  type="number"
                  step="any"
                  placeholder="未设置"
                  key={`${plot.plotSlotId}:${parameters.get(plot.plotSlotId) ?? ''}`}
                  defaultValue={parameters.get(plot.plotSlotId) ?? ''}
                  onBlur={(e) => setParameter(plot.plotSlotId, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                />
              </label>
            ))}
          </div>
          {numbers.length < plots.length && (
            <p className="property-hint" role="status">
              {plots.length - numbers.length} 条曲线未设置参数，保留基础颜色。
            </p>
          )}
          <details>
            <summary>批量输入参数值</summary>
            <textarea
              aria-label="批量映射参数"
              placeholder="按当前成员顺序输入，每行一个数值"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                const entries = batch.trim().split(/[\s,，;；]+/);
                if (
                  entries.length !== plots.length ||
                  entries.some((v) => v === '' || !Number.isFinite(Number(v)))
                ) {
                  setError(
                    `请输入 ${plots.length} 个有限数值，按当前成员顺序排列。`,
                  );
                  return;
                }
                setError('');
                onChange({
                  ...value,
                  values: plots.map((plot, index) => ({
                    plotSlotId: plot.plotSlotId,
                    value: Number(entries[index]),
                  })),
                });
              }}
            >
              设置参数值
            </button>
          </details>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <p className="property-hint">
        {value.source === 'values'
          ? '参数值决定整条曲线的颜色，调整成员顺序不改变参数归属。'
          : '曲线序号均匀映射到连续色带，调整成员顺序会改变颜色。'}{' '}
        范围外的值使用端点颜色。
      </p>
    </fieldset>
  );
}
