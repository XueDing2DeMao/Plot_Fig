import { useRef, useState } from 'react';
import type { DataWorkspace } from '@plot-fig/data-binding';
import type {
  CurveGroup,
  FigureTemplate,
  Panel,
  PlotSlot,
} from '@plot-fig/figure-schema';
import { resolveCurveGroups, unlinkCurveGroup } from '@plot-fig/svg-renderer';
import {
  originLineColors,
  lineColorLists,
} from '../palettes/origin-line-colors.js';
import { CurveStyleListFields } from './CurveGroupFields.js';
import './origin-curve-groups.css';
import { GroupColorMappingFields } from './GroupColorMappingFields.js';
import { colorMaps } from '../palettes/color-maps.js';
import { markerShapeOptions } from '../state/marker-shape-options.js';

type Props = {
  panel: Panel;
  workspace?: DataWorkspace | undefined;
  theme: FigureTemplate['theme'];
  selectedPlotId?: string | undefined;
  disabled?: boolean;
  onChange: (panel: Panel) => void;
};
const supported = (plot: PlotSlot) =>
  plot.kind === 'xy' || plot.kind === 'area';
const compatible = (a: PlotSlot, b: PlotSlot) =>
  a.xAxisId === b.xAxisId && a.yAxisId === b.yAxisId;

// 组渲染和解除从属都需要实体样式；仅为缺省样式补齐主题默认值。
function withStyles(panel: Panel, theme: FigureTemplate['theme']) {
  const next = structuredClone(panel);
  for (const plot of next.plotSlots) {
    if (!supported(plot)) continue;
    if (plot.kind === 'xy' || plot.kind === 'area')
      plot.lineStyle ??= {
        visible: true,
        color: theme.line.color,
        widthPt: theme.line.widthPt,
        dash: 'solid',
      };
    if (plot.kind === 'xy')
      plot.markerStyle ??= { visible: true, ...theme.marker, strokeWidthPt: 1 };
  }
  return next;
}

export function OriginCurveGroupFields({
  panel,
  workspace,
  theme,
  selectedPlotId,
  disabled = false,
  onChange,
}: Props) {
  const groups = panel.groups ?? [];
  const [chosen, setChosen] = useState('');
  const [member, setMember] = useState('');
  const dragged = useRef('');
  const group =
    groups.find((g) => g.groupId === chosen) ??
    groups.find((g) => g.members.includes(selectedPlotId ?? '')) ??
    groups[0];
  const eligible = panel.plotSlots.filter(supported);
  const occupied = new Set(groups.flatMap((g) => g.members));
  const free = eligible.filter((plot) => !occupied.has(plot.plotSlotId));
  const currentMember = group?.members.includes(member)
    ? member
    : group?.members[0];
  const position = group?.members.indexOf(currentMember ?? '') ?? -1;
  const update = (nextGroup: CurveGroup) =>
    onChange({
      ...withStyles(panel, theme),
      groups: groups.map((g) =>
        g.groupId === nextGroup.groupId ? nextGroup : g,
      ),
    });
  const create = () => {
    let number = 1;
    while (groups.some((g) => g.groupId === `curve-group-${number}`)) number++;
    const anchor = free.find((p) => p.plotSlotId === selectedPlotId) ?? free[0];
    if (!anchor) return;
    const next: CurveGroup = {
      groupId: `curve-group-${number}`,
      name: `曲线组 ${number}`,
      members: free
        .filter((p) => compatible(anchor, p))
        .slice(0, 128)
        .map((p) => p.plotSlotId),
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
      colors: [...originLineColors],
    };
    onChange({ ...withStyles(panel, theme), groups: [...groups, next] });
    setChosen(next.groupId);
    setMember(next.members[0]!);
  };
  const reorder = (from: number, to: number) => {
    if (
      !group ||
      from < 0 ||
      to < 0 ||
      to >= group.members.length ||
      from === to
    )
      return;
    const members = [...group.members];
    members.splice(to, 0, members.splice(from, 1)[0]!);
    update({ ...group, members });
  };
  const remove = () => {
    if (!group) return;
    const next = unlinkCurveGroup(withStyles(panel, theme), group.groupId);
    const remaining = next
      .groups!.filter((g) => g.groupId !== group.groupId)
      .map((g) => {
        if (g.parentId !== group.groupId) return g;
        const child = { ...g };
        if (group.parentId) child.parentId = group.parentId;
        else delete child.parentId;
        return child;
      });
    if (remaining.length) next.groups = remaining;
    else delete next.groups;
    onChange(next);
    setChosen('');
  };
  const effective = resolveCurveGroups(withStyles(panel, theme));
  const mappingMembers = (item: CurveGroup): string[] => [
    ...item.members,
    ...groups
      .filter((g) => g.parentId === item.groupId && g.mode === 'dependent')
      .flatMap(mappingMembers),
  ];
  const activeColors = group?.colorMapping?.colors ?? group?.colors;
  const colorList = lineColorLists.find(
    (list) =>
      list.colors.length === activeColors?.length &&
      list.colors.every(
        (color, i) => color.toLowerCase() === activeColors?.[i]?.toLowerCase(),
      ),
  );
  const anchor = eligible.find((p) => group?.members.includes(p.plotSlotId));
  const byId = new Map(groups.map((g) => [g.groupId, g]));
  const ancestors = (item: CurveGroup) => {
    const ids = new Set<string>();
    let current: CurveGroup | undefined = item;
    while (current && !ids.has(current.groupId)) {
      ids.add(current.groupId);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return ids;
  };
  const canJoin = (plot: PlotSlot) =>
    !!group &&
    !occupied.has(plot.plotSlotId) &&
    (!anchor || compatible(anchor, plot)) &&
    group.members.length < 128;
  return (
    <fieldset className="origin-groups" disabled={disabled}>
      <legend className="sr-only">曲线组设置</legend>
      <div className="origin-group-toolbar">
        <label>
          当前组
          <select
            aria-label="当前组"
            value={group?.groupId ?? ''}
            onChange={(event) => {
              setChosen(event.target.value);
              setMember('');
            }}
          >
            {!groups.length && <option value="">尚未分组</option>}
            {groups.map((g) => (
              <option key={g.groupId} value={g.groupId}>
                {g.name}
                {g.parentId ? '（子组）' : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!free.length || groups.length >= 64}
          onClick={create}
        >
          添加曲线组
        </button>
        <button type="button" disabled={!group} onClick={remove}>
          解除分组
        </button>
      </div>
      {!group ? (
        <p className="property-hint">
          添加曲线组后，同一坐标轴上的曲线可按顺序递增颜色、线型和符号。未分组曲线仍可独立编辑。
        </p>
      ) : (
        <>
          <div className="origin-group-columns">
            <div className="origin-group-settings">
              <fieldset className="origin-group-mode">
                <legend>编辑模式</legend>
                {(
                  [
                    ['independent', '独立'],
                    ['dependent', '从属'],
                  ] as const
                ).map(([mode, name]) => (
                  <label key={mode}>
                    <input
                      type="radio"
                      name={`group-mode-${panel.panelId}`}
                      checked={group.mode === mode}
                      onChange={() =>
                        mode === 'independent'
                          ? onChange(
                              unlinkCurveGroup(
                                withStyles(panel, theme),
                                group.groupId,
                              ),
                            )
                          : update({ ...group, mode })
                      }
                    />
                    {name}
                  </label>
                ))}
              </fieldset>
              <p className="property-hint">
                从属模式统一控制组样式；切换为独立时保留当前外观。单条曲线的按点映射和单点样式优先。
              </p>
              <fieldset
                className="origin-group-style-fields"
                disabled={group.mode === 'independent'}
              >
                <table className="origin-group-style-table">
                  <thead>
                    <tr>
                      <th>属性</th>
                      <th>增量</th>
                      <th>细节</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>线条颜色</th>
                      <td>
                        <select
                          aria-label="线条颜色递增"
                          value={
                            group.colorMapping
                              ? 'colormap'
                              : group.colors
                                ? group.colorIncrement === 'stretch' ||
                                  group.colorIncrement === 'binned'
                                  ? group.colorIncrement
                                  : 'increment'
                                : 'none'
                          }
                          onChange={(event) => {
                            const next = { ...group };
                            const mode = event.target.value;
                            if (mode === 'colormap') {
                              next.colorMapping = {
                                source: 'index',
                                colors: [...colorMaps[0]!.colors],
                              };
                            } else {
                              delete next.colorMapping;
                              if (mode === 'none') delete next.colors;
                              else next.colors ??= [...originLineColors];
                              next.colorIncrement =
                                mode === 'stretch' || mode === 'binned'
                                  ? mode
                                  : 'cycle';
                            }
                            update(next);
                          }}
                        >
                          <option value="none">保持各曲线颜色</option>
                          <option value="increment">逐个循环</option>
                          <option value="stretch">拉伸色列</option>
                          <option value="binned">分箱色列</option>
                          <option value="colormap">数值映射</option>
                        </select>
                      </td>
                      <td>
                        <select
                          aria-label="组颜色列表"
                          disabled={!group.colors || !!group.colorMapping}
                          value={colorList?.id ?? ''}
                          onChange={(event) => {
                            const list = lineColorLists.find(
                              (item) => item.id === event.target.value,
                            );
                            if (list) {
                              const next = {
                                ...group,
                                colors: [...list.colors],
                              };
                              if (
                                list.continuous &&
                                !group.colorMapping &&
                                (!group.colorIncrement ||
                                  group.colorIncrement === 'cycle')
                              )
                                next.colorMapping = {
                                  source: 'index',
                                  colors: [...list.colors],
                                };
                              update(next);
                            }
                          }}
                        >
                          <option value="" disabled>
                            自定义
                          </option>
                          {lineColorLists.map((list) => (
                            <option key={list.id} value={list.id}>
                              {list.name}
                            </option>
                          ))}
                        </select>
                        <span
                          className="origin-group-colors"
                          aria-label="组颜色预览"
                        >
                          {activeColors?.map((color, i) => (
                            <i key={i} style={{ background: color }} />
                          ))}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <th>线条样式</th>
                      <td>
                        <select
                          aria-label="线条样式递增"
                          value={group.lineDashes ? 'increment' : 'none'}
                          onChange={(event) => {
                            const next = { ...group };
                            if (event.target.value === 'none')
                              delete next.lineDashes;
                            else
                              next.lineDashes = [
                                'solid',
                                'dashed',
                                'dotted',
                                'dash-dot',
                              ];
                            update(next);
                          }}
                        >
                          <option value="none">无</option>
                          <option value="increment">逐个</option>
                        </select>
                      </td>
                      <td>
                        <span className="origin-group-dash-preview">
                          {(group.lineDashes ?? ['solid']).map(
                            (dash, index) => (
                              <svg
                                key={index}
                                viewBox="0 0 44 12"
                                aria-label={
                                  {
                                    solid: '实线',
                                    dashed: '虚线',
                                    dotted: '点线',
                                    'dash-dot': '点划线',
                                  }[dash]
                                }
                              >
                                <line
                                  x1="0"
                                  y1="6"
                                  x2="44"
                                  y2="6"
                                  stroke="currentColor"
                                  strokeDasharray={
                                    {
                                      solid: '',
                                      dashed: '6 3',
                                      dotted: '1 3',
                                      'dash-dot': '6 3 1 3',
                                    }[dash]
                                  }
                                />
                              </svg>
                            ),
                          )}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <th>符号形状</th>
                      <td>
                        <select
                          aria-label="符号形状递增"
                          value={group.markerShapes ? 'increment' : 'none'}
                          onChange={(event) => {
                            const next = { ...group };
                            if (event.target.value === 'none')
                              delete next.markerShapes;
                            else
                              next.markerShapes = [
                                'circle',
                                'square',
                                'triangle',
                                'diamond',
                              ];
                            update(next);
                          }}
                        >
                          <option value="none">无</option>
                          <option value="increment">逐个</option>
                        </select>
                      </td>
                      <td>
                        {group.markerShapes
                          ? group.markerShapes
                              .map((shape) => markerShapeOptions[shape])
                              .join(' · ')
                          : '保持各曲线符号'}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {group.colorMapping ? (
                  <GroupColorMappingFields
                    key={`${group.groupId}:${group.colorMapping.source}`}
                    value={group.colorMapping}
                    workspace={workspace}
                    plots={mappingMembers(group).map((id) =>
                      panel.plotSlots.find((p) => p.plotSlotId === id)!,
                    )}
                    onChange={(colorMapping) =>
                      update({ ...group, colorMapping })
                    }
                  />
                ) : (
                  <p className="property-hint">
                    色列按成员序号分配：逐个循环重复使用列表，拉伸包含首尾颜色，分箱取每箱中间的颜色。它们不读取数值参数。
                  </p>
                )}
                <div className="origin-group-increment">
                  <label>
                    递增方式
                    <select
                      aria-label="组递增方式"
                      value={group.increment}
                      onChange={(event) =>
                        update({
                          ...group,
                          increment: event.target
                            .value as CurveGroup['increment'],
                        })
                      }
                    >
                      <option value="synchronized">同步递增</option>
                      <option value="nested">嵌套递增</option>
                    </select>
                  </label>
                  <label>
                    步长
                    <input
                      aria-label="组递增步长"
                      type="number"
                      min={1}
                      max={64}
                      value={group.step}
                      onChange={(event) => {
                        const step = Number(event.target.value);
                        if (Number.isInteger(step) && step >= 1 && step <= 64)
                          update({ ...group, step });
                      }}
                    />
                  </label>
                </div>
                <details>
                  <summary>自定义递增列表</summary>
                  <CurveStyleListFields
                    value={group}
                    prefix={`组 ${groups.indexOf(group) + 1}`}
                    onChange={(lists) => {
                      const next = { ...group };
                      delete next.colors;
                      delete next.lineDashes;
                      delete next.markerShapes;
                      update({ ...next, ...lists });
                    }}
                  />
                </details>
              </fieldset>
            </div>
            <section className="origin-group-members" aria-label="组成员">
              <h3>
                组成员 <small>{group.members.length}</small>
              </h3>
              <ul>
                {group.members.map((id, index) => {
                  const plot = effective.plotSlots.find(
                    (p) => p.plotSlotId === id,
                  )!;
                  const name = plot.legendEntry.text || id;
                  return (
                    <li
                      key={id}
                      draggable
                      onDragStart={() => {
                        dragged.current = id;
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        reorder(group.members.indexOf(dragged.current), index);
                        dragged.current = '';
                      }}
                    >
                      <input
                        type="checkbox"
                        aria-label={`组成员 ${name}`}
                        checked
                        disabled={group.members.length <= 1}
                        onChange={() => {
                          const next = resolveCurveGroups(
                            withStyles(panel, theme),
                          );
                          next.groups = next.groups!.map((g) =>
                            g.groupId === group.groupId
                              ? {
                                  ...g,
                                  members: g.members.filter(
                                    (memberId) => memberId !== id,
                                  ),
                                }
                              : g,
                          );
                          onChange(next);
                        }}
                      />
                      <button
                        type="button"
                        aria-label={`选择成员 ${name}`}
                        aria-pressed={currentMember === id}
                        onClick={() => setMember(id)}
                      >
                        <span
                          style={{
                            borderColor:
                              'lineStyle' in plot
                                ? plot.lineStyle?.color
                                : theme.line.color,
                          }}
                        />
                        <span>{name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="origin-group-order">
                <button
                  type="button"
                  aria-label="上移成员"
                  disabled={position <= 0}
                  onClick={() => reorder(position, position - 1)}
                >
                  ↑ 上移
                </button>
                <button
                  type="button"
                  aria-label="下移成员"
                  disabled={
                    position < 0 || position === group.members.length - 1
                  }
                  onClick={() => reorder(position, position + 1)}
                >
                  ↓ 下移
                </button>
              </div>
              <small className="property-hint">
                拖动成员或用按钮调整递增顺序。
              </small>
              {free.length > 0 && (
                <details open>
                  <summary>添加成员</summary>
                  {free.map((plot) => (
                    <label key={plot.plotSlotId}>
                      <input
                        type="checkbox"
                        aria-label={`组成员 ${plot.legendEntry.text || plot.plotSlotId}`}
                        checked={false}
                        disabled={!canJoin(plot)}
                        onChange={() =>
                          update({
                            ...group,
                            members: [...group.members, plot.plotSlotId],
                          })
                        }
                      />
                      {plot.legendEntry.text || plot.plotSlotId}
                    </label>
                  ))}
                </details>
              )}
            </section>
          </div>
          <fieldset className="origin-group-parent">
            <legend>组信息与子组关系</legend>
            <label>
              名称
              <input
                key={group.groupId}
                aria-label="组名称"
                defaultValue={group.name}
                maxLength={128}
                onBlur={(event) => {
                  const name = event.target.value.trim();
                  if (name && name !== group.name) update({ ...group, name });
                  event.target.value = name || group.name;
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
              />
            </label>
            <label>
              父组
              <select
                aria-label="父组"
                value={group.parentId ?? ''}
                onChange={(event) => {
                  const next = { ...group };
                  if (event.target.value) next.parentId = event.target.value;
                  else delete next.parentId;
                  update(next);
                }}
              >
                <option value="">无（顶层组）</option>
                {groups
                  .filter(
                    (g) =>
                      !ancestors(g).has(group.groupId) &&
                      (!anchor ||
                        g.members.every((id) =>
                          compatible(
                            anchor,
                            eligible.find((p) => p.plotSlotId === id)!,
                          ),
                        )),
                  )
                  .map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {g.name}
                    </option>
                  ))}
              </select>
            </label>
            <p className="property-hint">
              可将同一坐标轴上的另一个组设为父组；子组可覆盖父组的递增样式。
            </p>
          </fieldset>
        </>
      )}
    </fieldset>
  );
}
