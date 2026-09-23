import { PaintFields } from './PaintFields.js';
import type {
  CurveOffset,
  CurveTransform,
  PanelStack,
  PlotSlot,
} from '@plot-fig/figure-schema';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';
const offsetDefaults: Record<CurveOffset['mode'], CurveOffset> = {
  constant: { mode: 'constant', value: 0 },
  increment: { mode: 'increment', value: 1 },
  auto: { mode: 'auto', gap: 0.1 },
  list: { mode: 'list', values: [0, 1] },
  metadata: { mode: 'metadata', metadata: 'name' },
};
function OffsetFields({
  dimension,
  value,
  onChange,
}: {
  dimension: 'X' | 'Y';
  value: CurveOffset | undefined;
  onChange: (next: CurveOffset | undefined) => void;
}) {
  return (
    <fieldset className="property-group">
      <legend>{dimension} 偏移</legend>
      <PropertyCheck
        label={`启用 ${dimension} 偏移`}
        checked={!!value}
        onChange={(on) =>
          onChange(on ? { mode: 'increment', value: 1 } : undefined)
        }
      />
      {value && (
        <>
          <PropertySelect
            label={`${dimension} 偏移方式`}
            value={value.mode}
            options={{
              constant: '固定偏移',
              increment: '按曲线序号递增',
              auto: '按数据跨度自动分开',
              list: '逐曲线数值列表',
              metadata: '读取 Y 列元数据',
            }}
            onChange={(mode) =>
              onChange({
                ...offsetDefaults[mode],
                ...(value.scope ? { scope: value.scope } : {}),
              })
            }
          />
          <PropertySelect
            label={`${dimension} 偏移序号范围`}
            value={value.scope ?? 'panel'}
            options={{
              panel: '同图层曲线顺序',
              'within-group': '所在组内的曲线顺序',
              'between-groups': '顶层曲线组顺序',
            }}
            onChange={(scope) => onChange({ ...value, scope })}
          />
          {(value.mode === 'constant' || value.mode === 'increment') && (
            <PropertyNumber
              label={`${dimension} 偏移值`}
              value={value.value}
              min={null}
              step="any"
              onChange={(v) => onChange({ ...value, value: v })}
            />
          )}
          {value.mode === 'auto' && (
            <PropertyNumber
              label={`${dimension} 自动偏移附加间距比例`}
              value={value.gap}
              min={0}
              step="any"
              onChange={(gap) => onChange({ ...value, gap })}
            />
          )}
          {value.mode === 'list' && (
            <>
              {value.values.map((v, i) => (
                <div className="property-grid" key={i}>
                  <PropertyNumber
                    label={`${dimension} 第 ${i + 1} 项偏移`}
                    value={v}
                    min={null}
                    step="any"
                    onChange={(next) =>
                      onChange({
                        ...value,
                        values: value.values.map((old, j) =>
                          i === j ? next : old,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    disabled={value.values.length === 1}
                    onClick={() =>
                      onChange({
                        ...value,
                        values: value.values.filter((_, j) => i !== j),
                      })
                    }
                  >
                    删除 {dimension} 偏移项 {i + 1}
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={value.values.length >= 128}
                onClick={() =>
                  onChange({ ...value, values: [...value.values, 0] })
                }
              >
                添加 {dimension} 偏移项
              </button>
            </>
          )}
          {value.mode === 'metadata' && (
            <>
              <PropertySelect
                label={`${dimension} 偏移元数据字段`}
                value={value.metadata}
                options={{ name: 'Y 列名称', unit: 'Y 列单位' }}
                onChange={(metadata) => onChange({ ...value, metadata })}
              />
              <p className="property-hint">
                整段文本必须为有限数值，例如 -0.5 或
                1e3；带有其他文字或缺少单位时会提示错误。
              </p>
            </>
          )}
        </>
      )}
    </fieldset>
  );
}
export function CurveTransformFields({
  value,
  onChange,
  plots = [],
  plotId,
  section = 'all',
}: {
  value: CurveTransform | undefined;
  onChange: (next: CurveTransform | undefined) => void;
  plots?: readonly PlotSlot[];
  plotId?: string;
  section?: 'all' | 'fill' | 'offset' | undefined;
}) {
  const update = <K extends keyof CurveTransform>(
    key: K,
    next: CurveTransform[K],
  ) => {
    const copy = { ...value };
    if (next === undefined) delete copy[key];
    else copy[key] = next;
    onChange(Object.keys(copy).length ? copy : undefined);
  };
  const fill = value?.fill;
  const current = plots.find((p) => p.plotSlotId === plotId);
  const targets = plots.filter(
    (p) =>
      p.plotSlotId !== plotId &&
      p.visible !== false &&
      (p.kind === 'xy' || p.kind === 'area') &&
      (!current ||
        (p.xAxisId === current.xAxisId && p.yAxisId === current.yAxisId)),
  );
  return (
    <>
      {section !== 'fill' && (
        <>
          <OffsetFields
            dimension="X"
            value={value?.offsetX}
            onChange={(v) => update('offsetX', v)}
          />
          <OffsetFields
            dimension="Y"
            value={value?.offsetY}
            onChange={(v) => update('offsetY', v)}
          />
        </>
      )}
      {section !== 'offset' && (
        <fieldset className="property-group">
          <legend>曲线填充</legend>
          {section === 'all' && (
            <PropertyCheck
              label="启用曲线填充"
              checked={!!fill}
              onChange={(on) =>
                update(
                  'fill',
                  on
                    ? {
                        target: 'baseline',
                        baseline: 0,
                        positiveColor: '#2166ac',
                        negativeColor: '#b2182b',
                        opacity: 0.3,
                      }
                    : undefined,
                )
              }
            />
          )}
          {fill && (
            <>
              <PropertySelect
                label="填充到"
                value={fill.target}
                options={{ baseline: '固定基线', next: '另一条曲线' }}
                onChange={(target) => {
                  const next = { ...fill, target };
                  delete next.baseline;
                  delete next.targetPlotId;
                  if (target === 'baseline') next.baseline = 0;
                  update('fill', next);
                }}
              />
              {fill.target === 'baseline' ? (
                <PropertyNumber
                  label="填充基线"
                  value={fill.baseline ?? 0}
                  min={null}
                  step="any"
                  onChange={(baseline) => update('fill', { ...fill, baseline })}
                />
              ) : (
                <PropertySelect
                  label="填充目标曲线"
                  value={fill.targetPlotId ?? ''}
                  options={Object.fromEntries([
                    ['', '下一条同坐标轴曲线'],
                    ...targets.map((p) => [
                      p.plotSlotId,
                      p.legendEntry.text || p.plotSlotId,
                    ]),
                  ])}
                  onChange={(targetPlotId) => {
                    const next = { ...fill };
                    if (targetPlotId) next.targetPlotId = targetPlotId;
                    else delete next.targetPlotId;
                    update('fill', next);
                  }}
                />
              )}
              <PropertyInput
                label="正向填充颜色"
                type="color"
                value={fill.positiveColor}
                onChange={(e) =>
                  update('fill', { ...fill, positiveColor: e.target.value })
                }
              />
              <PropertyInput
                label="负向填充颜色"
                type="color"
                value={fill.negativeColor}
                onChange={(e) =>
                  update('fill', { ...fill, negativeColor: e.target.value })
                }
              />
              <PaintFields
                prefix="正向填充"
                value={fill.positivePaint}
                fallback={fill.positiveColor}
                onChange={(paint) => {
                  const next = { ...fill };
                  if (paint) next.positivePaint = paint;
                  else delete next.positivePaint;
                  update('fill', next);
                }}
              />
              <PaintFields
                prefix="负向填充"
                value={fill.negativePaint}
                fallback={fill.negativeColor}
                onChange={(paint) => {
                  const next = { ...fill };
                  if (paint) next.negativePaint = paint;
                  else delete next.negativePaint;
                  update('fill', next);
                }}
              />
              <PropertyNumber
                label="填充不透明度"
                value={fill.opacity}
                min={0}
                step="any"
                onChange={(opacity) => update('fill', { ...fill, opacity })}
              />
              <p className="property-hint">
                不同 X 网格在共同连续区间作线性插值，重复 X
                与跨缺口的歧义会提示错误。
              </p>
            </>
          )}
        </fieldset>
      )}
      <p className="property-hint">
        偏移、填充和堆叠只改变图形显示及坐标范围，原数据表和统计输入保持不变。
      </p>
    </>
  );
}
export function PanelStackFields({
  value,
  plots,
  onChange,
}: {
  value: PanelStack | undefined;
  plots: readonly PlotSlot[];
  onChange: (next: PanelStack | undefined) => void;
}) {
  const eligible = plots.filter((p) => p.kind === 'xy' || p.kind === 'area');
  const anchor = eligible.find((p) => value?.members.includes(p.plotSlotId));
  const candidates = eligible.filter(
    (p) =>
      value?.members.includes(p.plotSlotId) ||
      !anchor ||
      (p.xAxisId === anchor.xAxisId && p.yAxisId === anchor.yAxisId),
  );
  return (
    <fieldset className="property-group">
      <legend>曲线堆叠</legend>
      <PropertyCheck
        label="启用曲线堆叠"
        checked={!!value}
        onChange={(on) => {
          const first = eligible[0];
          onChange(
            on
              ? {
                  mode: 'normal',
                  members: first
                    ? eligible
                        .filter(
                          (p) =>
                            p.xAxisId === first.xAxisId &&
                            p.yAxisId === first.yAxisId,
                        )
                        .map((p) => p.plotSlotId)
                    : [],
                }
              : undefined,
          );
        }}
      />
      {value && (
        <>
          <PropertySelect
            label="堆叠方式"
            value={value.mode}
            options={{ normal: '正负独立累计', percent: '正负独立百分比' }}
            onChange={(mode) => onChange({ ...value, mode })}
          />
          {candidates.map((p) => (
            <PropertyCheck
              key={p.plotSlotId}
              label={`堆叠成员 ${p.legendEntry.text || p.plotSlotId}`}
              checked={value.members.includes(p.plotSlotId)}
              onChange={(on) =>
                onChange({
                  ...value,
                  members: on
                    ? [...value.members, p.plotSlotId]
                    : value.members.filter((id) => id !== p.plotSlotId),
                })
              }
            />
          ))}
          <PropertyCheck
            label="显示堆叠总计标签"
            checked={!!value.labels?.visible}
            onChange={(on) => {
              const next = { ...value };
              if (on)
                next.labels = {
                  visible: true,
                  color: '#222222',
                  fontSizePt: 10,
                  format: 'fixed',
                };
              else delete next.labels;
              onChange(next);
            }}
          />
          {value.labels && (
            <>
              <PropertyInput
                label="总计标签颜色"
                type="color"
                value={value.labels.color}
                onChange={(e) =>
                  onChange({
                    ...value,
                    labels: { ...value.labels!, color: e.target.value },
                  })
                }
              />
              <PropertyNumber
                label="总计标签字号"
                value={value.labels.fontSizePt}
                min={4}
                step="any"
                onChange={(fontSizePt) =>
                  onChange({
                    ...value,
                    labels: { ...value.labels!, fontSizePt },
                  })
                }
              />
              <PropertySelect
                label="总计标签格式"
                value={value.labels.format}
                options={{ fixed: '常规数字', scientific: '科学计数' }}
                onChange={(format) =>
                  onChange({ ...value, labels: { ...value.labels!, format } })
                }
              />
            </>
          )}
          <p className="property-hint">
            同坐标轴、线性 Y
            轴的至少两条曲线可以堆叠；隐藏曲线不参与。百分比总计标签显示原始累计值。
          </p>
        </>
      )}
    </fieldset>
  );
}
