import type {
  FigureTemplate,
  Axis,
  PlotSlot,
  LineStyle,
} from '@plot-fig/figure-schema';
import {
  validateFixedAxisTicks,
  validateXyLineConnections,
  figureCoordinates,
  lineAppearanceAttributes,
  rescaleFigureRanges,
  markerSourceForPlot,
  resolveMarkerOverrides,
  prepareXyData,
  renderFigureSvg,
  labelSourceForPlot,
  resolveCurveGroups,
} from '@plot-fig/svg-renderer';
import type { DataBindingSet } from '@plot-fig/data-binding';
import { assertTemplate, synchronizeSharedAxis } from './publication-utils.js';
import { remapAxisData } from './axis-data-refs.js';
import { validateF4Property } from './f4-property-validation.js';
import {
  listPropertyObjects,
  propertyObjectKey,
  type PropertyObjectRef,
} from './property-objects.js';
import { samePropertyValue } from '../components/property-draft-patches.js';
import { axisBatchGroups } from './batch-axis-fields.js';
import { panelBatchGroups, plotBatchGroups } from './batch-object-fields.js';
import {
  batchValueAt,
  type BatchField,
  type BatchGroup,
} from './batch-property-fields.js';

function objectAt(
  template: FigureTemplate,
  ref: PropertyObjectRef,
): Record<string, unknown> {
  if (ref.kind === 'page') throw new Error('图页没有可批量编辑的同类对象');
  const panel = template.panels.find((item) => item.panelId === ref.panelId);
  const object =
    ref.kind === 'panel'
      ? panel
      : ref.kind === 'axis'
        ? panel?.axes.find((item) => item.axisId === ref.axisId)
        : panel?.plotSlots.find((item) => item.plotSlotId === ref.plotSlotId);
  if (!object) throw new Error('批量目标不存在，请重新选择对象');
  return object as unknown as Record<string, unknown>;
}
export function batchGroups(
  template: FigureTemplate,
  ref: PropertyObjectRef,
): BatchGroup[] {
  const object = objectAt(template, ref);
  if (ref.kind === 'axis') return axisBatchGroups(object as unknown as Axis);
  if (ref.kind === 'panel') return panelBatchGroups();
  return plotBatchGroups(template, object as unknown as PlotSlot);
}
export function batchTargets(
  template: FigureTemplate,
  source: PropertyObjectRef,
) {
  const sourceObject = objectAt(template, source);
  return listPropertyObjects(template)
    .filter(
      (entry) =>
        entry.ref.kind === source.kind &&
        (source.kind !== 'plot' ||
          objectAt(template, entry.ref).kind === sourceObject.kind),
    )
    .map((entry) => {
      if (entry.ref.kind === 'page') return entry;
      const panelId = entry.ref.panelId;
      const name = template.panels.find(
        (panel) => panel.panelId === panelId,
      )?.name;
      return name
        ? { ...entry, caption: entry.caption.replace(panelId, name) }
        : entry;
    });
}
function fieldAt(groups: BatchGroup[], id: string) {
  for (const group of groups)
    for (const field of group.fields)
      if (id === group.id + '.' + field.key) return { group, field };
  throw new Error(`不支持批量修改此字段：${id}`);
}
function fieldValue(
  object: Record<string, unknown>,
  group: BatchGroup,
  field: BatchField,
) {
  const root = group.root ? batchValueAt(object, group.root) : object;
  // SymLog 默认值只用于用户主动编辑时初始化，缺省源轴应保持关闭。
  if (group.id === 'axis-symlog' && root === undefined) return undefined;
  if (field.type === 'marker-shape')
    return {
      shape: batchValueAt(root, 'shape') ?? group.defaults.shape,
      ...(batchValueAt(root, 'customVertices') === undefined
        ? {}
        : {
            customVertices: structuredClone(
              batchValueAt(root, 'customVertices'),
            ),
          }),
    };
  return (
    batchValueAt(root, field.key) ?? batchValueAt(group.defaults, field.key)
  );
}
export function batchCommonValue(
  template: FigureTemplate,
  refs: PropertyObjectRef[],
  id: string,
): { mixed: boolean; value?: unknown } {
  if (!refs.length) return { mixed: false };
  const values = refs.map((ref) => {
    const { group, field } = fieldAt(batchGroups(template, ref), id);
    return fieldValue(objectAt(template, ref), group, field);
  });
  return values.every((v) => samePropertyValue(values[0], v))
    ? { mixed: false, value: values[0] }
    : { mixed: true };
}
import { validateMarkerDetails } from '@plot-fig/figure-schema';
function checkValue(field: BatchField, value: unknown) {
  if (value === undefined && field.optional) return;
  if (field.type === 'f5-object') return; // 完整模板校验同时检查引用与组合条件。
  if (field.type === 'f4-object') {
    validateF4Property(field.key, value);
    return;
  }
  if (field.type === 'marker-details') {
    validateMarkerDetails({ [field.key]: value });
    return;
  }
  if (
    field.type === 'curve-arrows' ||
    field.type === 'drop-line' ||
    field.type === 'row-range' ||
    field.type === 'series-sampling' ||
    field.type === 'marker-shape' ||
    field.type === 'marker-mapping' ||
    field.type === 'point-overrides'
  ) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`${field.label}：请输入完整有效的值`);
    // 完整对象原子写入，随后由模板结构与绑定轴领域规则统一校验。
    return;
  }
  if (field.type === 'custom-dash') {
    if (!value || typeof value !== 'object')
      throw new Error('自定义虚线：请输入完整有效的值');
    lineAppearanceAttributes({
      dash: 'solid',
      customDash: value as NonNullable<LineStyle['customDash']>,
    });
    return;
  }
  const valid =
    field.type === 'number' || field.type === 'opacity'
      ? typeof value === 'number' && Number.isFinite(value)
      : field.type === 'boolean'
        ? typeof value === 'boolean'
        : typeof value === 'string' &&
          (field.type !== 'select' || Object.hasOwn(field.options!, value));
  if (!valid) throw new Error(`${field.label}：请输入完整有效的值`);
}
function setField(
  object: Record<string, unknown>,
  group: BatchGroup,
  field: BatchField,
  value: unknown,
) {
  checkValue(field, value);
  // 只在实际写入时补齐该可选样式所需字段，不让网格主线初始化顺带创建次线。
  const rootPath = group.root ? group.root.split('.') : [];
  let parent = object;
  for (const [index, key] of rootPath.entries()) {
    if (!parent[key] || typeof parent[key] !== 'object') {
      if (value === undefined) return;
      parent[key] =
        index === rootPath.length - 1 && group.id !== 'axis-grid'
          ? structuredClone(group.defaults)
          : {};
    }
    parent = parent[key] as Record<string, unknown>;
  }
  const path = field.key.split('.');
  if (field.type === 'marker-shape') {
    const geometry = value as { shape: string; customVertices?: unknown };
    if (
      Object.keys(geometry).some(
        (key) => !['shape', 'customVertices'].includes(key),
      )
    )
      throw new Error('符号形状包含未知字段');
    parent.shape = geometry.shape;
    if (geometry.shape === 'custom')
      parent.customVertices = structuredClone(geometry.customVertices);
    else delete parent.customVertices;
    return;
  }
  for (const [index, key] of path.slice(0, -1).entries()) {
    if (!parent[key] || typeof parent[key] !== 'object') {
      if (value === undefined) return;
      parent[key] = structuredClone(
        group.id === 'axis-scale' && index === 0 && key === 'symLog'
          ? { threshold: 1, linearLength: 1 }
          : (batchValueAt(group.defaults, path.slice(0, index + 1).join('.')) ??
              {}),
      );
    }
    parent = parent[key] as Record<string, unknown>;
  }
  if (value === undefined) delete parent[path.at(-1)!];
  else parent[path.at(-1)!] = structuredClone(value);
}

export type BatchPropertyRequest = {
  source: PropertyObjectRef;
  targets: PropertyObjectRef[];
} & (
  | { groups: string[]; edits?: never }
  | { edits: Record<string, unknown>; groups?: never }
);

export function applyBatchProperties(
  template: FigureTemplate,
  request: BatchPropertyRequest,
  data?: DataBindingSet,
): FigureTemplate {
  const groups = batchGroups(template, request.source);
  const allowedTargets = new Set(
    batchTargets(template, request.source).map((entry) => entry.key),
  );
  const edits = request.edits
    ? Object.entries(request.edits)
    : request.groups.flatMap((id) => {
        const group = groups.find((item) => item.id === id);
        if (!group) throw new Error(`不支持此属性组：${id}`);
        return group.fields.map((field): [string, unknown] => [
          group.id + '.' + field.key,
          fieldValue(objectAt(template, request.source), group, field),
        ]);
      });
  for (const [id, value] of edits) checkValue(fieldAt(groups, id).field, value);
  let next = structuredClone(template);
  for (const target of request.targets) {
    if (!allowedTargets.has(propertyObjectKey(target)))
      throw new Error('请选择存在且类型相同的批量目标');
    const targetGroups = batchGroups(template, target);
    for (const [id, value] of edits) {
      const { group, field } = fieldAt(targetGroups, id);
      let applied = value;
      if (
        target.kind === 'axis' &&
        request.source.kind === 'axis' &&
        value !== undefined &&
        group.id.startsWith('axis-advanced-')
      ) {
        const sourceRef = request.source;
        const sourcePanel = template.panels.find(
            (p) => p.panelId === sourceRef.panelId,
          )!,
          targetPanel = next.panels.find((p) => p.panelId === target.panelId)!;
        const sourceAxis = sourcePanel.axes.find(
            (a) => a.axisId === sourceRef.axisId,
          )!,
          targetAxis = targetPanel.axes.find(
            (a) => a.axisId === target.axisId,
          )!;
        const bound = (panel: typeof sourcePanel, axis: Axis) =>
          panel.plotSlots.filter(
            (p) =>
              (axis.dimension === 'x' ? p.xAxisId : p.yAxisId) === axis.axisId,
          );
        const sourcePlots = bound(sourcePanel, sourceAxis),
          targetPlots = bound(targetPanel, targetAxis),
          names = new Map<string, string>();
        sourcePlots.forEach((p, i) => {
          if (targetPlots[i])
            names.set(p.plotSlotId, targetPlots[i]!.plotSlotId);
        });
        const wrapped = {
          [group.id.slice('axis-advanced-'.length)]: structuredClone(value),
        };
        remapAxisData(wrapped as Axis['advanced'], names);
        applied = Object.values(wrapped)[0];
      }
      if (
        target.kind === 'panel' &&
        request.source.kind === 'panel' &&
        ['groups', 'stack'].includes(field.key) &&
        value !== undefined
      ) {
        const sourcePanel = template.panels.find(
            (p) =>
              p.panelId ===
              (request.source as Extract<PropertyObjectRef, { kind: 'panel' }>)
                .panelId,
          )!,
          targetPanel = next.panels.find((p) => p.panelId === target.panelId)!;
        const ids = new Map(
          sourcePanel.plotSlots.map((p, i) => [
            p.plotSlotId,
            targetPanel.plotSlots[i]?.plotSlotId,
          ]),
        );
        const remap = (members: string[]) =>
          members.map((id) => {
            const mapped = ids.get(id);
            if (!mapped)
              throw new Error('目标图层曲线数量不足，无法对应组或堆叠成员');
            return mapped;
          });
        applied =
          field.key === 'groups'
            ? (value as NonNullable<typeof sourcePanel.groups>).map((g) => ({
                ...g,
                members: remap(g.members),
              }))
            : {
                ...(value as NonNullable<typeof sourcePanel.stack>),
                members: remap(
                  (value as NonNullable<typeof sourcePanel.stack>).members,
                ),
              };
        if (
          field.key === 'groups' &&
          (applied as NonNullable<typeof targetPanel.groups>).some(
            (g) =>
              g.mode === 'independent' &&
              targetPanel.groups?.some(
                (old) => old.groupId === g.groupId && old.mode === 'dependent',
              ),
          )
        )
          targetPanel.plotSlots = resolveCurveGroups(targetPanel).plotSlots;
      }
      setField(objectAt(next, target), group, field, applied);
    }
    const plot = objectAt(next, target);
    if (target.kind === 'axis') {
      for (const key of ['symLog', 'logTicks', 'scaleOptions', 'advanced'])
        if (
          plot[key] &&
          typeof plot[key] === 'object' &&
          !Object.keys(plot[key] as object).length
        )
          delete plot[key];
      if (edits.some(([id]) => id === 'axis-scale.scale')) {
        if (!['log10', 'ln', 'log2'].includes(String(plot.scale))) {
          delete plot.symLog;
          delete plot.logTicks;
        } else if (
          plot.scale !== 'log10' &&
          (plot.logTicks as Axis['logTicks'])?.mode === 'origin-log10'
        )
          delete plot.logTicks;
        if (!['offset-reciprocal', 'custom'].includes(String(plot.scale)))
          delete plot.scaleOptions;
      }
      if (
        edits.some(([id]) =>
          [
            'axis-scale.',
            'axis-symlog.',
            'axis-log-ticks.',
            'axis-advanced-breaks.',
            'axis-advanced-categoryOrder.',
          ].some((prefix) => id.startsWith(prefix)),
        )
      )
        synchronizeSharedAxis(next, target);
    }
    if (
      ['xy', 'bar', 'area'].includes(String(plot.kind)) &&
      edits.some(
        ([id, value]) =>
          id === 'plot-label-overrides.labelOverrides' && value !== undefined,
      )
    ) {
      const labels = plot as unknown as Extract<
          PlotSlot,
          { kind: 'xy' | 'bar' | 'area' }
        >,
        source = data ? labelSourceForPlot(labels, data) : undefined;
      if (!source || !samePropertyValue(source, labels.labelOverrides?.source))
        throw new Error('标签单点覆盖仅可复制到当前数据快照一致的同源曲线');
    }
    if (
      plot.kind === 'xy' &&
      plot.markerMapping &&
      !Object.keys(plot.markerMapping).length
    )
      delete plot.markerMapping;
    if (
      plot.kind === 'xy' &&
      plot.markerDetails &&
      !Object.keys(plot.markerDetails).length
    )
      delete plot.markerDetails;
    if (
      plot.kind === 'xy' &&
      edits.some(
        ([id, value]) =>
          id === 'plot-marker-overrides.markerOverrides' && value !== undefined,
      )
    ) {
      const xy = plot as unknown as Extract<PlotSlot, { kind: 'xy' }>;
      if (
        !data ||
        resolveMarkerOverrides(
          xy.markerOverrides,
          markerSourceForPlot(xy, data),
          prepareXyData(xy, data).rawRows,
        ).paused
      )
        throw new Error('单点覆盖仅可复制到当前数据快照一致的同源 XY 曲线');
    }
    if (plot.kind === 'xy' && plot.dataView) {
      const view = plot.dataView as Record<string, unknown>;
      if (
        edits.some(
          ([id, value]) =>
            id === 'plot-data-view.sampling' && value === undefined,
        ) &&
        !edits.some(([id]) => id === 'plot-data-view.sampleExport')
      )
        delete view.sampleExport;
      if (!Object.keys(view).length) delete plot.dataView;
    }
    if (
      plot.kind === 'xy' &&
      plot.dropLines &&
      !Object.keys(plot.dropLines).length
    )
      delete plot.dropLines;
    // 选择预设时移除隐藏覆盖；同一批显式指定的完整自定义模式优先，且与编辑顺序无关。
    if (
      edits.some(([id]) => id === 'plot-line.dash') &&
      !edits.some(([id]) => id === 'plot-line-appearance.customDash')
    )
      delete (plot.lineStyle as Record<string, unknown>).customDash;
    if (target.kind === 'plot' && plot.lineStyle)
      lineAppearanceAttributes(
        plot.lineStyle as NonNullable<
          Extract<PlotSlot, { kind: 'xy' }>['lineStyle']
        >,
      );
  }
  const changesAxisScale = edits.some(([id]) =>
    ['axis-scale.', 'axis-symlog.', 'axis-log-ticks.'].some((prefix) =>
      id.startsWith(prefix),
    ),
  );
  if (data && changesAxisScale) {
    const resolved = rescaleFigureRanges({
      before: template,
      candidate: next,
      beforeData: data,
      data,
      reason: 'change',
    });
    const failures = resolved.diagnostics.filter((d) => d.severity === 'error');
    if (failures.length)
      throw new Error(failures.map((d) => d.message).join('；'));
    next = resolved.template;
  }
  assertTemplate(next);
  if (
    data &&
    (changesAxisScale ||
      edits.some(([id]) => id.startsWith('plot-') || id.startsWith('panel-')))
  ) {
    const rendered = renderFigureSvg(next, data);
    if (!rendered.ok)
      throw new Error(
        rendered.diagnostics
          .filter((d) => d.severity === 'error')
          .map((d) => d.message)
          .join('；'),
      );
  }
  if (
    data &&
    edits.some(([id]) =>
      [
        'plot-data-view.',
        'plot-transform.',
        'plot-error-details.',
        'panel-stack.',
      ].some((prefix) => id.startsWith(prefix)),
    )
  ) {
    const resolved = rescaleFigureRanges({
      before: template,
      candidate: next,
      beforeData: data,
      data,
      reason: 'change',
    });
    const failures = resolved.diagnostics.filter((d) => d.severity === 'error');
    if (failures.length)
      throw new Error(failures.map((d) => d.message).join('；'));
    next = resolved.template;
    assertTemplate(next);
  }
  const errors = [
    ...validateFixedAxisTicks(next),
    ...validateXyLineConnections(next, data),
  ];
  if (errors.length)
    throw new Error(
      errors.map((e) => `${e.sourcePath}：${e.message}`).join('；'),
    );
  if (next.panels.some((panel) => panel.axisLengthRatio))
    figureCoordinates(next, data);
  return next;
}
