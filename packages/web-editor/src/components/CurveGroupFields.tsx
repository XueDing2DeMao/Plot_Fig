import type {
  CurveGroup,
  CurveGroups,
  PlotSlot,
} from '@plot-fig/figure-schema';
import { markerShapeOptions } from '../state/marker-shape-options.js';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';
type Lists = Pick<CurveGroup, 'colors' | 'lineDashes' | 'markerShapes'>;
const dashes = {
  solid: '实线',
  dashed: '虚线',
  dotted: '点线',
  'dash-dot': '点划线',
};
export function CurveStyleListFields({
  value,
  onChange,
  prefix = '样式',
}: {
  value: Lists;
  onChange: (next: Lists) => void;
  prefix?: string;
}) {
  const update = <K extends keyof Lists>(key: K, next: Lists[K]) => {
    const copy = { ...value };
    if (next === undefined) delete copy[key];
    else copy[key] = next;
    onChange(copy);
  };
  const shapes = Object.fromEntries(
    Object.entries(markerShapeOptions).filter(([key]) => key !== 'custom'),
  ) as Record<NonNullable<CurveGroup['markerShapes']>[number], string>;
  return (
    <>
      <PropertyCheck
        label={`${prefix}颜色递增`}
        checked={!!value.colors}
        onChange={(on) =>
          update('colors', on ? ['#2166ac', '#b2182b'] : undefined)
        }
      />
      {value.colors?.map((color, i) => (
        <div className="property-grid" key={`c${i}`}>
          <PropertyInput
            label={`${prefix}颜色 ${i + 1}`}
            type="color"
            value={color}
            onChange={(e) =>
              update(
                'colors',
                value.colors!.map((v, j) => (j === i ? e.target.value : v)),
              )
            }
          />
          <button
            type="button"
            disabled={value.colors!.length === 1}
            onClick={() =>
              update(
                'colors',
                value.colors!.filter((_, j) => j !== i),
              )
            }
          >
            删除{prefix}颜色 {i + 1}
          </button>
        </div>
      ))}
      {value.colors && (
        <button
          type="button"
          disabled={value.colors.length >= 64}
          onClick={() => update('colors', [...value.colors!, '#222222'])}
        >
          添加{prefix}颜色
        </button>
      )}
      <PropertyCheck
        label={`${prefix}线型递增`}
        checked={!!value.lineDashes}
        onChange={(on) =>
          update('lineDashes', on ? ['solid', 'dashed'] : undefined)
        }
      />
      {value.lineDashes?.map((dash, i) => (
        <div className="property-grid" key={`d${i}`}>
          <PropertySelect
            label={`${prefix}线型 ${i + 1}`}
            value={dash}
            options={dashes}
            onChange={(v) =>
              update(
                'lineDashes',
                value.lineDashes!.map((old, j) => (i === j ? v : old)),
              )
            }
          />
          <button
            type="button"
            disabled={value.lineDashes!.length === 1}
            onClick={() =>
              update(
                'lineDashes',
                value.lineDashes!.filter((_, j) => i !== j),
              )
            }
          >
            删除{prefix}线型 {i + 1}
          </button>
        </div>
      ))}
      {value.lineDashes && (
        <button
          type="button"
          disabled={value.lineDashes.length >= 64}
          onClick={() => update('lineDashes', [...value.lineDashes!, 'dotted'])}
        >
          添加{prefix}线型
        </button>
      )}
      <PropertyCheck
        label={`${prefix}符号递增`}
        checked={!!value.markerShapes}
        onChange={(on) =>
          update('markerShapes', on ? ['circle', 'square'] : undefined)
        }
      />
      {value.markerShapes?.map((shape, i) => (
        <div className="property-grid" key={`s${i}`}>
          <PropertySelect
            label={`${prefix}符号 ${i + 1}`}
            value={shape}
            options={shapes}
            onChange={(v) =>
              update(
                'markerShapes',
                value.markerShapes!.map((old, j) =>
                  i === j ? (v as typeof shape) : old,
                ),
              )
            }
          />
          <button
            type="button"
            disabled={value.markerShapes!.length === 1}
            onClick={() =>
              update(
                'markerShapes',
                value.markerShapes!.filter((_, j) => i !== j),
              )
            }
          >
            删除{prefix}符号 {i + 1}
          </button>
        </div>
      ))}
      {value.markerShapes && (
        <button
          type="button"
          disabled={value.markerShapes.length >= 64}
          onClick={() =>
            update('markerShapes', [...value.markerShapes!, 'triangle'])
          }
        >
          添加{prefix}符号
        </button>
      )}
    </>
  );
}
export function CurveGroupFields({
  value,
  plots,
  onChange,
  onUnlink,
  unlinkDisabled = false,
}: {
  value: CurveGroups | undefined;
  plots: readonly PlotSlot[];
  onChange: (next: CurveGroups | undefined) => void;
  onUnlink?: (groupId: string) => void;
  unlinkDisabled?: boolean;
}) {
  const groups = value ?? [],
    eligible = plots.filter((p) => p.kind === 'xy' || p.kind === 'area');
  const byId = new Map(groups.map((g) => [g.groupId, g]));
  const ancestors = (group: CurveGroup) => {
    const result = new Set<string>();
    let current: CurveGroup | undefined = group;
    while (current && !result.has(current.groupId)) {
      result.add(current.groupId);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return result;
  };
  const anchor = (group: CurveGroup) => {
    const rootId = [...ancestors(group)].at(-1);
    const related = groups.filter((g) => ancestors(g).has(rootId!));
    return eligible.find((p) =>
      related.some((g) => g.members.includes(p.plotSlotId)),
    );
  };
  const compatible = (a: PlotSlot | undefined, b: PlotSlot | undefined) =>
    !a || !b || (a.xAxisId === b.xAxisId && a.yAxisId === b.yAxisId);
  const update = (index: number, next: CurveGroup) =>
    onChange(groups.map((g, i) => (i === index ? next : g)));
  const free = eligible.filter(
    (p) => !groups.some((g) => g.members.includes(p.plotSlotId)),
  );
  return (
    <fieldset className="property-group">
      <legend>多曲线组</legend>
      <p className="property-hint">
        组成员共用坐标轴；依赖组按顺序递增样式。解除依赖后保留当前外观，列映射与单点设置仍优先。
      </p>
      {groups.map((group, index) => (
        <fieldset className="property-group" key={group.groupId}>
          <legend>{group.name}</legend>
          <PropertyInput
            label={`组 ${index + 1} 名称`}
            value={group.name}
            onChange={(e) => update(index, { ...group, name: e.target.value })}
          />
          <PropertySelect
            label={`组 ${index + 1} 父组`}
            value={group.parentId ?? ''}
            options={Object.fromEntries([
              ['', '无父组'],
              ...groups
                .filter(
                  (g) =>
                    !ancestors(g).has(group.groupId) &&
                    compatible(anchor(group), anchor(g)),
                )
                .map((g) => [g.groupId, g.name]),
            ])}
            onChange={(parentId) => {
              const next = { ...group };
              if (parentId) next.parentId = parentId;
              else delete next.parentId;
              update(index, next);
            }}
          />
          <label className="property-check">
            <input
              type="checkbox"
              checked={group.mode === 'dependent'}
              disabled={group.mode === 'dependent' && unlinkDisabled}
              onChange={(event) => {
                if (group.mode === 'dependent' && unlinkDisabled) return;
                const on = event.target.checked;
                if (!on && onUnlink) onUnlink(group.groupId);
                else
                  update(index, {
                    ...group,
                    mode: on ? 'dependent' : 'independent',
                  });
              }}
            />
            {`组 ${index + 1} 依赖自动样式`}
          </label>
          <div className="property-grid">
            {eligible.map((p) => {
              const checked = group.members.includes(p.plotSlotId),
                other = groups.some(
                  (g) =>
                    g.groupId !== group.groupId &&
                    g.members.includes(p.plotSlotId),
                );
              return (
                <label className="property-check" key={p.plotSlotId}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={
                      other || (!checked && !compatible(anchor(group), p))
                    }
                    onChange={(e) =>
                      update(index, {
                        ...group,
                        members: e.target.checked
                          ? [...group.members, p.plotSlotId]
                          : group.members.filter((id) => id !== p.plotSlotId),
                      })
                    }
                  />
                  {`组 ${index + 1} 成员 ${p.legendEntry.text || p.plotSlotId}`}
                </label>
              );
            })}
          </div>
          <PropertySelect
            label={`组 ${index + 1} 递增方式`}
            value={group.increment}
            options={{
              synchronized: '同步递增',
              nested: '嵌套递增（颜色 → 线型 → 符号）',
            }}
            onChange={(increment) => update(index, { ...group, increment })}
          />
          <PropertyNumber
            label={`组 ${index + 1} 递增步长`}
            value={group.step}
            min={1}
            step={1}
            onChange={(step) => update(index, { ...group, step })}
          />
          <CurveStyleListFields
            value={group}
            prefix={`组 ${index + 1}`}
            onChange={(lists) => {
              const next = { ...group };
              delete next.colors;
              delete next.lineDashes;
              delete next.markerShapes;
              update(index, { ...next, ...lists });
            }}
          />
          <button
            type="button"
            onClick={() => {
              const next = groups
                .filter((_, i) => i !== index)
                .map((g) => {
                  if (g.parentId !== group.groupId) return g;
                  const copy = { ...g };
                  delete copy.parentId;
                  return copy;
                });
              onChange(next.length ? next : undefined);
            }}
          >
            删除组 {index + 1}
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={!free.length || groups.length >= 64}
        onClick={() => {
          let n = 1;
          while (groups.some((g) => g.groupId === `curve-group-${n}`)) n++;
          const first = free[0]!;
          onChange([
            ...groups,
            {
              groupId: `curve-group-${n}`,
              name: `曲线组 ${n}`,
              members: free
                .filter(
                  (p) =>
                    p.xAxisId === first.xAxisId && p.yAxisId === first.yAxisId,
                )
                .map((p) => p.plotSlotId),
              mode: 'dependent',
              increment: 'synchronized',
              step: 1,
              colors: ['#2166ac', '#b2182b'],
            },
          ]);
        }}
      >
        添加曲线组
      </button>
    </fieldset>
  );
}
