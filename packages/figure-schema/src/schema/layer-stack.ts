import Type from 'typebox';
import { Compile } from 'typebox/compile';
import { IdentifierSchema } from './common.js';
import type { Panel } from './figure-template.js';

const closed = { additionalProperties: false };
const members = () =>
  Type.Array(IdentifierSchema, { maxItems: 128, uniqueItems: true });
const finiteNumber = () =>
  Type.Number({ minimum: -Number.MAX_VALUE, maximum: Number.MAX_VALUE });

export const LayerStackSchema = Type.Object(
  {
    mode: Type.Enum([
      'none',
      'cumulative',
      'incremental',
      'constant',
      'auto',
      'individual',
    ]),
    members: members(),
    subgroups: Type.Array(
      Type.Object(
        {
          groupId: IdentifierSchema,
          members: Type.Array(IdentifierSchema, {
            minItems: 1,
            maxItems: 128,
            uniqueItems: true,
          }),
        },
        closed,
      ),
      { maxItems: 128 },
    ),
    constant: Type.Object(
      {
        values: Type.Array(finiteNumber(), { minItems: 1, maxItems: 128 }),
        absolute: Type.Boolean(),
      },
      closed,
    ),
    auto: Type.Object(
      {
        gap: Type.Number({ minimum: 0, maximum: 100 }),
        preserveScale: Type.Boolean(),
      },
      closed,
    ),
    individual: Type.Object(
      {
        x: Type.Boolean(),
        y: Type.Boolean(),
        values: Type.Array(
          Type.Object(
            {
              plotSlotId: IdentifierSchema,
              xOffset: finiteNumber(),
              yOffset: finiteNumber(),
              xMultiplier: finiteNumber(),
              yMultiplier: finiteNumber(),
            },
            closed,
          ),
          { maxItems: 128 },
        ),
      },
      closed,
    ),
    withinSubgroup: Type.Boolean(),
    betweenSubgroups: Type.Boolean(),
    sort: Type.Enum(['none', 'ascending', 'descending']),
    showOverlapped: Type.Boolean(),
    normalizePercent: Type.Boolean(),
    connectLines: Type.Boolean(),
    totalLabels: Type.Object(
      {
        visible: Type.Boolean(),
        color: Type.String({ pattern: '^#[0-9a-fA-F]{6}$' }),
        fontSizePt: Type.Number({ minimum: 4, maximum: 72 }),
        format: Type.Enum(['fixed', 'scientific']),
      },
      closed,
    ),
    relativeAdditionalLine: Type.Boolean(),
  },
  closed,
);

export type LayerStack = Type.Static<typeof LayerStackSchema>;

export function createLayerStack(members: string[] = []): LayerStack {
  return {
    mode: 'none',
    members: [...members],
    subgroups: [],
    constant: { values: [1], absolute: false },
    auto: { gap: 0.08, preserveScale: false },
    individual: { x: false, y: true, values: [] },
    withinSubgroup: false,
    betweenSubgroups: false,
    sort: 'none',
    showOverlapped: false,
    normalizePercent: false,
    connectLines: false,
    totalLabels: {
      visible: false,
      color: '#333333',
      fontSizePt: 10,
      format: 'fixed',
    },
    relativeAdditionalLine: false,
  };
}

let check: ReturnType<typeof Compile<typeof LayerStackSchema>> | undefined;
export function validateLayerStack(
  value: unknown,
): asserts value is LayerStack {
  check ??= Compile(LayerStackSchema);
  if (!check.Check(value)) throw new Error('图层堆叠设置无效');
  if (value.mode !== 'none' && !value.members.length)
    throw new Error('启用图层堆叠需要至少一个成员');
  const memberIds = new Set(value.members);
  const groups = new Set<string>();
  const grouped = new Set<string>();
  for (const group of value.subgroups) {
    if (groups.has(group.groupId)) throw new Error('堆叠子组标识不能重复');
    groups.add(group.groupId);
    for (const id of group.members) {
      if (!memberIds.has(id)) throw new Error('堆叠子组成员必须属于图层堆叠');
      if (grouped.has(id)) throw new Error('同一曲线不能重复归属多个堆叠子组');
      grouped.add(id);
    }
  }
  const individuals = new Set<string>();
  for (const entry of value.individual.values) {
    if (!memberIds.has(entry.plotSlotId))
      throw new Error('单独偏移成员必须属于图层堆叠');
    if (individuals.has(entry.plotSlotId))
      throw new Error('单独偏移成员不能重复');
    individuals.add(entry.plotSlotId);
  }
}

export function validateLayerStackRelations(panel: Panel): void {
  const stack = panel.layerStack;
  if (!stack) return;
  validateLayerStack(stack);
  const plots = new Map(panel.plotSlots.map((plot) => [plot.plotSlotId, plot]));
  const first = plots.get(stack.members[0]!);
  for (const id of stack.members) {
    const plot = plots.get(id);
    if (!plot || !['xy', 'area', 'bar'].includes(plot.kind))
      throw new Error('图层堆叠成员须为同层 XY、面积或柱条图');
    if (
      first &&
      (first.xAxisId !== plot.xAxisId || first.yAxisId !== plot.yAxisId)
    )
      throw new Error('图层堆叠成员必须使用相同的 X/Y 坐标轴');
    if (first && (first.kind === 'bar') !== (plot.kind === 'bar'))
      throw new Error('图层堆叠不能混合柱条图与 XY/面积曲线');
    if (
      first?.kind === 'bar' &&
      plot.kind === 'bar' &&
      first.orientation !== plot.orientation
    )
      throw new Error('图层堆叠柱条成员必须使用相同方向');
    if (stack.mode === 'incremental' && plot.kind !== 'bar')
      throw new Error('增量堆叠仅支持柱状图或条形图');
    if (stack.mode === 'cumulative' && plot.kind !== 'bar') {
      const axis = panel.axes.find((axis) => axis.axisId === plot.yAxisId);
      if (axis && axis.scale !== 'linear')
        throw new Error('累积曲线堆叠需要线性 Y 轴');
    }
  }
}
