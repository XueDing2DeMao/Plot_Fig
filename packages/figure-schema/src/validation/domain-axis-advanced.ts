import type { Axis } from '../schema/axis.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import type { AxisLabelSource } from '../schema/axis-advanced.js';
import type { ValidationIssue } from './types.js';
import { validateFormulaPair } from '../restricted-formula.js';
import { createNumericScale } from '../numeric-scale.js';
import { axisScaleSpec } from '../axis-scale.js';
export function validateAdvancedAxes(
  template: FigureTemplate,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [],
    slots = new Map(template.dataSlots.map((s) => [s.dataSlotId, s]));
  const byId = new Map(
    template.panels.flatMap((p) =>
      p.axes.map((a) => [a.axisId, { axis: a, panel: p }] as const),
    ),
  );
  for (const [pi, panel] of template.panels.entries())
    for (const [ai, axis] of panel.axes.entries()) {
      const path = `/panels/${pi}/axes/${ai}/advanced`;
      try {
        if (axis.scale === 'discrete' && axis.dimension !== 'x')
          throw new Error('Discrete仅适用于数值X轴');
        if (
          axis.scaleOptions?.offset !== undefined &&
          axis.scale !== 'offset-reciprocal'
        )
          throw new Error('偏移参数仅适用于偏移倒数');
        if (axis.scaleOptions?.formula && axis.scale !== 'custom')
          throw new Error('尺度公式仅适用于自定义尺度');
        if (axis.scale === 'custom' && !axis.scaleOptions?.formula)
          throw new Error('自定义尺度需要正逆公式及定义域');
        const advanced = axis.advanced;
        if (!advanced) continue;
        const slot = (id: string | undefined, numeric = false) => {
          const found = id ? slots.get(id) : undefined;
          if (!found || (numeric && found.valueType !== 'number'))
            throw new Error('请引用存在且类型匹配的数据槽');
        };
        const label = (l: AxisLabelSource) => {
          if (l.source === 'column' || l.source === 'metadata')
            slot(l.dataSlotId);
          if (l.positionSlotId) slot(l.positionSlotId, true);
          if (l.source === 'column' && l.match === 'value' && !l.positionSlotId)
            throw new Error('按值匹配标签需要位置数据列');
          if (l.timeZone)
            try {
              new Intl.DateTimeFormat('en-CA', { timeZone: l.timeZone }).format(
                0,
              );
            } catch {
              throw new Error('标签时区无效');
            }
        };
        if (advanced.labels) label(advanced.labels);
        for (const l of advanced.labelTable?.rows ?? []) label(l);
        if (
          advanced.calendar &&
          (axis.scale !== 'linear' || advanced.ticks?.major)
        )
          throw new Error('日历刻度需要线性轴且不能同时指定自定义主刻度');
        if (advanced.categoryOrder && axis.scale !== 'category')
          throw new Error('分类排序仅适用于分类轴');
        if (
          axis.scale === 'category' &&
          (advanced.breaks || advanced.link || advanced.ticks || advanced.rug)
        )
          throw new Error(
            '分类轴不支持断轴、公式链接、自定义数值刻度或数值Rug',
          );
        for (const source of [advanced.ticks?.major, advanced.ticks?.minor])
          if (source?.mode === 'column') slot(source.dataSlotId, true);
        for (const special of advanced.specialTicks ?? [])
          if (special.at === 'value' && !Number.isFinite(special.value))
            throw new Error('特殊刻度需要有限位置');
        const ids = new Set<string>();
        for (const ref of advanced.references?.items ?? []) {
          if (ids.has(ref.id)) throw new Error('参照线标识不能重复');
          ids.add(ref.id);
          if (ref.kind === 'constant' && !Number.isFinite(ref.value))
            throw new Error('常数参照线需要有限数值');
          if (ref.kind === 'column' || ref.dataSlotId)
            slot(ref.dataSlotId, true);
          if (ref.kind === 'statistic' && !ref.statistic)
            throw new Error('请选择统计量');
          if (
            ref.plotSlotId &&
            !panel.plotSlots.some(
              (p) =>
                p.plotSlotId === ref.plotSlotId &&
                p[axis.dimension === 'x' ? 'xAxisId' : 'yAxisId'] ===
                  axis.axisId,
            )
          )
            throw new Error('统计曲线须绑定当前坐标轴');
        }
        for (const id of advanced.rug?.plotSlotIds ?? [])
          if (
            !panel.plotSlots.some(
              (p) =>
                p.plotSlotId === id &&
                p[axis.dimension === 'x' ? 'xAxisId' : 'yAxisId'] ===
                  axis.axisId,
            )
          )
            throw new Error('Rug曲线须绑定当前轴');
        if (advanced.breaks) {
          if (advanced.labelTable)
            throw new Error('多行标签表与断轴不能同时启用');
          if (advanced.link || panel.yAxisAlignment || panel.axisLengthRatio)
            throw new Error('断轴不能同时使用本轴公式链接、双Y对齐或轴长比例');
          if (axis.range.mode !== 'fixed')
            throw new Error('断轴需要完整固定范围');
          let previous = axis.range.min,
            gap = 0;
          for (const [bi, item] of advanced.breaks.intervals.entries()) {
            if (!(
              previous < item.from &&
              item.from < item.to &&
              item.to < axis.range.max
            ))
              throw new Error('断区须有序、不重叠且严格位于轴范围内');
            gap += item.gapPercent ?? 3;
            previous = item.to;
            if (item.after?.scale)
              createNumericScale(
                { kind: item.after.scale },
                item.to,
                advanced.breaks.intervals[bi + 1]?.from ?? axis.range.max,
              );
          }
          if (gap >= 50) throw new Error('断区间隙合计必须小于50%');
          if (
            advanced.breaks.weights &&
            advanced.breaks.weights.length !==
              advanced.breaks.intervals.length + 1
          )
            throw new Error('区段权重数量必须等于断区数量加一');
          createNumericScale(
            axisScaleSpec(axis),
            axis.range.min,
            axis.range.max,
          );
        }
        if (advanced.link) {
          if (
            panel.yAxisAlignment &&
            [
              panel.yAxisAlignment.leftAxisId,
              panel.yAxisAlignment.rightAxisId,
            ].includes(axis.axisId)
          )
            throw new Error('公式链接目标不能同时参与双Y对齐');
          const source = byId.get(advanced.link.axisId);
          if (
            !source ||
            source.panel.panelId !== advanced.link.panelId ||
            source.axis.dimension !== axis.dimension
          )
            throw new Error('公式链接需要有效的同向源轴');
          if (axis.scale !== 'linear')
            throw new Error('公式链接目标轴使用线性显示单位');
          if (
            template.sharedAxisGroups?.some((g) =>
              g.members.some((m) => m.axisId === axis.axisId),
            )
          )
            throw new Error('公式链接目标不能同时加入共享范围组');
          validateFormulaPair(advanced.link.formula);
          const visited = new Set<string>([axis.axisId]);
          let cursor: Axis | undefined = source.axis;
          while (cursor) {
            if (visited.has(cursor.axisId))
              throw new Error('坐标轴公式链接存在循环');
            visited.add(cursor.axisId);
            cursor = cursor.advanced?.link
              ? byId.get(cursor.advanced.link.axisId)?.axis
              : undefined;
          }
        }
      } catch (cause) {
        issues.push({
          code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
          path,
          message: (cause as Error).message,
        });
      }
    }
  return issues;
}
