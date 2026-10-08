import { useContext, useId, useState } from 'react';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { LayerStack, Panel } from '@plot-fig/figure-schema';
import {
  applyLayerStack,
  changeLayerStackMode,
  layerStackCurves,
  readLayerStack,
} from '../state/origin-layer-stack.js';
import {
  PropertyInput,
  PropertyNumber,
  PropertyNumberDraftContext,
  PropertySelect,
} from './PropertyInputs.js';
import './origin-layer-stack.css';

export function LayerStackFields({
  panel,
  data,
  onChange,
}: {
  panel: Panel;
  data?: DataBindingSet | undefined;
  onChange: (panel: Panel) => void;
}) {
  const name = useId();
  const plots = layerStackCurves(panel);
  let stack: LayerStack;
  let readError = '';
  try {
    stack = readLayerStack(panel, data);
  } catch (cause) {
    stack = readLayerStack(panel, undefined, false);
    readError = cause instanceof Error ? cause.message : '无法读取现有偏移';
  }
  const [selectedId, setSelectedId] = useState('');
  const [constantText, setConstantText] = useState<string>();
  const [error, setError] = useState('');
  const numberDraft = useContext(PropertyNumberDraftContext);
  const members = plots.filter((plot) =>
    stack.members.includes(plot.plotSlotId),
  );
  const selected =
    members.find((plot) => plot.plotSlotId === selectedId) ?? members[0];
  const bars =
    members.length > 0 && members.every((plot) => plot.kind === 'bar');
  const cumulative = stack.mode === 'cumulative';
  const incremental = stack.mode === 'incremental';
  const variable = stack.mode === 'constant' || stack.mode === 'auto';
  const nonempty = members.length > 0;
  const update = (next: LayerStack) => onChange(applyLayerStack(panel, next));
  const changeMode = (mode: LayerStack['mode']) => {
    try {
      onChange(changeLayerStackMode(panel, mode, data));
      setConstantText(undefined);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法设置图层堆叠');
    }
  };
  const radio = (mode: LayerStack['mode'], label: string) => (
    <label className="property-check">
      <input
        type="radio"
        name={name}
        checked={stack.mode === mode}
        disabled={
          mode !== 'none' &&
          (!nonempty ||
            (mode === 'incremental' && !bars) ||
            (mode === 'cumulative' &&
              !bars &&
              members.some(
                (plot) =>
                  panel.axes.find((axis) => axis.axisId === plot.yAxisId)
                    ?.scale !== 'linear',
              )))
        }
        onChange={() => changeMode(mode)}
      />
      {label}
    </label>
  );
  const check = (
    label: string,
    checked: boolean,
    disabled: boolean,
    change: (value: boolean) => void,
  ) => (
    <label className="property-check">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => change(event.target.checked)}
      />
      {label}
    </label>
  );
  const individual = stack.individual.values.find(
    (value) => value.plotSlotId === selected?.plotSlotId,
  ) ?? {
    plotSlotId: selected?.plotSlotId ?? '',
    xOffset: 0,
    yOffset: 0,
    xMultiplier: 1,
    yMultiplier: 1,
  };
  const updateIndividual = (patch: Partial<typeof individual>) => {
    const value = { ...individual, ...patch };
    update({
      ...stack,
      individual: {
        ...stack.individual,
        values: [
          ...stack.individual.values.filter(
            (entry) => entry.plotSlotId !== value.plotSlotId,
          ),
          value,
        ],
      },
    });
  };
  const prefix = `${selected?.plotSlotId}/`;
  const curveDraft = numberDraft
    ? {
        ...numberDraft,
        texts: Object.fromEntries(
          Object.entries(numberDraft.texts)
            .filter(([key]) => key.startsWith(prefix))
            .map(([key, value]) => [key.slice(prefix.length), value]),
        ),
        setText: (label: string, text: string, path?: string[]) =>
          numberDraft.setText(prefix + label, text, path),
      }
    : null;
  const selectSubgroup = (plotSlotId: string, groupId: string) => {
    let selectedGroup = groupId;
    if (selectedGroup === 'new') {
      let i = 1;
      while (
        stack.subgroups.some((group) => group.groupId === `stack-subgroup-${i}`)
      )
        i++;
      selectedGroup = `stack-subgroup-${i}`;
    }
    const groups = stack.subgroups.map((group) => ({
      ...group,
      members: group.members.filter((id) => id !== plotSlotId),
    }));
    if (selectedGroup) {
      const group = groups.find((group) => group.groupId === selectedGroup);
      if (group) group.members.push(plotSlotId);
      else groups.push({ groupId: selectedGroup, members: [plotSlotId] });
    }
    update({
      ...stack,
      subgroups: groups.filter((group) => group.members.length),
    });
  };
  return (
    <div className="origin-layer-stack">
      <fieldset className="property-group origin-stack-offsets">
        <legend>偏移</legend>
        <div className="origin-stack-row">{radio('none', '无')}</div>
        <div className="origin-stack-row">{radio('cumulative', '累积')}</div>
        <div className="origin-stack-row">{radio('incremental', '增量')}</div>
        <div className="origin-stack-row">
          {radio('constant', '常量')}
          <fieldset
            disabled={stack.mode !== 'constant'}
            className="origin-stack-inline"
          >
            <PropertyInput
              label="常量偏移数列"
              aria-label="常量偏移数列"
              value={constantText ?? stack.constant.values.join(' ')}
              onChange={(event) => {
                const text = event.target.value;
                setConstantText(text);
                const values = text.trim()
                  ? text
                      .trim()
                      .split(/[\s,，]+/)
                      .map(Number)
                  : [Number.NaN];
                update({ ...stack, constant: { ...stack.constant, values } });
              }}
            />
            {check('绝对偏移', stack.constant.absolute, false, (absolute) =>
              update({ ...stack, constant: { ...stack.constant, absolute } }),
            )}
          </fieldset>
        </div>
        <div className="origin-stack-row">
          {radio('auto', '自动')}
          <fieldset
            disabled={stack.mode !== 'auto'}
            className="origin-stack-inline"
          >
            <PropertyNumber
              label="间距 (%)"
              value={stack.auto.gap * 100}
              step="any"
              fieldPath="layerStack.auto.gap"
              onChange={(gap) =>
                update({ ...stack, auto: { ...stack.auto, gap: gap / 100 } })
              }
            />
            {check(
              '保持绘图在非线性刻度下的比例',
              stack.auto.preserveScale,
              false,
              (preserveScale) =>
                update({ ...stack, auto: { ...stack.auto, preserveScale } }),
            )}
          </fieldset>
        </div>
        <div className="origin-stack-row">
          {radio('individual', '单独')}
          <fieldset
            disabled={stack.mode !== 'individual'}
            className="origin-stack-inline"
          >
            {(['x', 'y'] as const).map((axis) => (
              <span key={axis}>
                {check(
                  axis.toUpperCase(),
                  stack.individual[axis],
                  bars &&
                    members.some(
                      (plot) =>
                        plot.kind === 'bar' &&
                        (plot.orientation === 'vertical'
                          ? axis === 'x'
                          : axis === 'y'),
                    ),
                  (enabled) =>
                    update({
                      ...stack,
                      individual: { ...stack.individual, [axis]: enabled },
                    }),
                )}
              </span>
            ))}
          </fieldset>
        </div>
      </fieldset>
      {stack.mode === 'constant' && (
        <p className="property-hint">
          {stack.constant.absolute
            ? '绝对偏移按数列循环赋值。例如 0 10：各曲线偏移为 0、10、0、10、0、10…，第一条也应用第一项。'
            : '偏移数列循环累加。例如 0 10：各曲线偏移为 0、0、10、10、20、20…；单个 10 则为 0、10、20、30…。'}
        </p>
      )}
      <div className="origin-stack-options">
        {incremental
          ? check(
              '显示被覆盖的柱状图/条形图',
              stack.showOverlapped,
              !bars,
              (showOverlapped) => update({ ...stack, showOverlapped }),
            )
          : check(
              '按大小排序显示柱状图/条形图',
              stack.sort !== 'none',
              !cumulative || !bars,
              (enabled) =>
                update({ ...stack, sort: enabled ? 'ascending' : 'none' }),
            )}
        {cumulative && bars && stack.sort !== 'none' && (
          <fieldset className="origin-stack-inline origin-stack-indent">
            <PropertySelect
              label="排序方向"
              value={stack.sort}
              options={{ ascending: '升序', descending: '降序' }}
              onChange={(sort) => update({ ...stack, sort })}
            />
          </fieldset>
        )}
        {check(
          '对使用“累积”/“增量”的图应用“子组内偏移”设置',
          stack.withinSubgroup,
          !cumulative && !incremental,
          (withinSubgroup) => update({ ...stack, withinSubgroup }),
        )}
        {check(
          '对使用“常量”/“自动”的图应用“子组间偏移”设置',
          stack.betweenSubgroups,
          !variable,
          (betweenSubgroups) => update({ ...stack, betweenSubgroups }),
        )}
        {check(
          '对使用“累积”/“增量”的柱状图/条形图数据归一化为百分比',
          stack.normalizePercent,
          (!cumulative && !incremental) || !bars,
          (normalizePercent) => update({ ...stack, normalizePercent }),
        )}
        {check(
          '显示堆积或浮动柱状图/条形图各层的连接线',
          stack.connectLines,
          !bars ||
            stack.mode === 'none' ||
            ((cumulative || incremental) && stack.withinSubgroup),
          (connectLines) => update({ ...stack, connectLines }),
        )}
        {check(
          '显示总标签在堆叠柱状/条形上',
          stack.totalLabels.visible,
          !cumulative || !bars,
          (visible) =>
            update({
              ...stack,
              totalLabels: { ...stack.totalLabels, visible },
            }),
        )}
        {check(
          '按相对位置自定义附加线',
          stack.relativeAdditionalLine,
          !variable && stack.mode !== 'individual',
          (relativeAdditionalLine) =>
            update({ ...stack, relativeAdditionalLine }),
        )}
      </div>
      {stack.totalLabels.visible && cumulative && bars && (
        <fieldset className="property-group">
          <legend>总标签</legend>
          <div className="property-grid">
            <PropertyInput
              label="总标签颜色"
              type="color"
              value={stack.totalLabels.color}
              onChange={(event) =>
                update({
                  ...stack,
                  totalLabels: {
                    ...stack.totalLabels,
                    color: event.target.value,
                  },
                })
              }
            />
            <PropertyNumber
              label="总标签字号 (pt)"
              value={stack.totalLabels.fontSizePt}
              step={1}
              min={4}
              fieldPath="layerStack.totalLabels.fontSizePt"
              onChange={(fontSizePt) =>
                update({
                  ...stack,
                  totalLabels: { ...stack.totalLabels, fontSizePt },
                })
              }
            />
            <PropertySelect
              label="总标签格式"
              value={stack.totalLabels.format}
              options={{ fixed: '小数', scientific: '科学计数法' }}
              onChange={(format) =>
                update({
                  ...stack,
                  totalLabels: { ...stack.totalLabels, format },
                })
              }
            />
          </div>
        </fieldset>
      )}
      {stack.mode === 'individual' && selected && (
        <fieldset className="property-group" disabled={!!readError}>
          <legend>单独偏移</legend>
          <PropertySelect
            label="偏移曲线"
            value={selected.plotSlotId}
            options={Object.fromEntries(
              members.map((plot, i) => [
                plot.plotSlotId,
                `${i + 1}. ${plot.legendEntry.text || plot.plotSlotId}`,
              ]),
            )}
            onChange={setSelectedId}
          />
          <PropertyNumberDraftContext.Provider value={curveDraft}>
            {(['x', 'y'] as const).map((axis) => (
              <fieldset
                key={axis}
                disabled={!stack.individual[axis]}
                className="origin-stack-inline"
              >
                <PropertyNumber
                  label={`${axis.toUpperCase()} 偏移值`}
                  value={individual[`${axis}Offset`]}
                  step="any"
                  min={null}
                  onChange={(value) =>
                    updateIndividual({ [`${axis}Offset`]: value })
                  }
                />
                <PropertyNumber
                  label={`${axis.toUpperCase()} 倍率`}
                  value={individual[`${axis}Multiplier`]}
                  step="any"
                  min={null}
                  onChange={(value) =>
                    updateIndividual({ [`${axis}Multiplier`]: value })
                  }
                />
              </fieldset>
            ))}
          </PropertyNumberDraftContext.Provider>
        </fieldset>
      )}
      <details className="origin-stack-members">
        <summary>堆叠成员与子组</summary>
        <p className="property-hint">
          未分组曲线各自作为一个子组；同一堆叠使用相同坐标轴及图形方向。
        </p>
        {plots.map((plot) => {
          const first = members[0];
          const compatible =
            !first ||
            (first.xAxisId === plot.xAxisId &&
              first.yAxisId === plot.yAxisId &&
              (first.kind === 'bar') === (plot.kind === 'bar') &&
              (first.kind !== 'bar' ||
                plot.kind !== 'bar' ||
                first.orientation === plot.orientation));
          return (
            <div className="origin-stack-member-row" key={plot.plotSlotId}>
              {check(
                `堆叠成员 ${plot.legendEntry.text || plot.plotSlotId}`,
                stack.members.includes(plot.plotSlotId),
                !compatible ||
                  (stack.mode !== 'none' &&
                    members.length === 1 &&
                    stack.members.includes(plot.plotSlotId)),
                (enabled) => {
                  const ids = enabled
                    ? [...stack.members, plot.plotSlotId]
                    : stack.members.filter((id) => id !== plot.plotSlotId);
                  update({
                    ...stack,
                    members: ids,
                    subgroups: stack.subgroups
                      .map((group) => ({
                        ...group,
                        members: group.members.filter((id) => ids.includes(id)),
                      }))
                      .filter((group) => group.members.length),
                    individual: {
                      ...stack.individual,
                      values: stack.individual.values.filter((value) =>
                        ids.includes(value.plotSlotId),
                      ),
                    },
                  });
                },
              )}
              <select
                aria-label={`堆叠子组 ${plot.legendEntry.text || plot.plotSlotId}`}
                disabled={!stack.members.includes(plot.plotSlotId)}
                value={
                  stack.subgroups.find((group) =>
                    group.members.includes(plot.plotSlotId),
                  )?.groupId ?? ''
                }
                onChange={(event) =>
                  selectSubgroup(plot.plotSlotId, event.target.value)
                }
              >
                <option value="">单项子组</option>
                {stack.subgroups.map((group, index) => (
                  <option
                    key={group.groupId}
                    value={group.groupId}
                  >{`子组 ${index + 1}`}</option>
                ))}
                <option value="new">新建子组</option>
              </select>
            </div>
          );
        })}
      </details>
      {!plots.length && (
        <p className="property-hint">当前图层没有可堆叠的 XY、面积或柱条图。</p>
      )}
      {error && (
        <p role="alert" className="property-field-error">
          {error}
        </p>
      )}
      {readError && (
        <p role="alert" className="property-field-error">
          {readError}
        </p>
      )}
    </div>
  );
}
