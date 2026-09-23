import type { DataBindingSet, DataWorkspace } from '@plot-fig/data-binding';
import { rescaleFigureRanges } from '@plot-fig/svg-renderer';
import { resizePageLayers } from '../state/page-geometry.js';
import { assertTemplate } from '../state/publication-utils.js';
import {
  validateFixedAxisTicks,
  validateXyLineConnections,
} from '@plot-fig/svg-renderer';
import {
  categoricalDimension,
  sameAxisScale,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import {
  propertyObjectKey,
  type PropertyObjectRef,
} from '../state/property-objects.js';
import {
  readPropertyObjectSettings,
  updatePropertyObjectSettings,
  type PropertyObjectSettings,
} from '../state/property-object-settings.js';
import {
  applyPropertyPatches,
  isRangeText,
  overlappingPaths,
  propertyPatches,
  samePropertyValue,
  type PropertyPatch,
} from './property-draft-patches.js';

type ObjectDraft = {
  ref: PropertyObjectRef;
  patches: PropertyPatch[];
  numberTexts: Record<string, string>;
  numberPaths: Record<string, string[][]>;
  pendingLabel?: string;
  error?: string;
};
export type FigurePropertyDraftState = {
  template: FigureTemplate;
  data?: DataBindingSet;
  workspace?: DataWorkspace;
  operationError?: string;
  selection: PropertyObjectRef;
  drafts: Record<string, ObjectDraft>;
  preserveLayerSize?: boolean;
};

function draftFor(
  state: FigurePropertyDraftState,
  ref: PropertyObjectRef,
): ObjectDraft {
  return (
    state.drafts[propertyObjectKey(ref)] ?? {
      ref,
      patches: [],
      numberTexts: {},
      numberPaths: {},
    }
  );
}
export function readPropertyDraft(
  state: FigurePropertyDraftState,
  ref: PropertyObjectRef,
): PropertyObjectSettings {
  return applyPropertyPatches(
    readPropertyObjectSettings(state.template, ref),
    draftFor(state, ref).patches,
  );
}

export function setPropertyNumberText(
  state: FigurePropertyDraftState,
  ref: PropertyObjectRef,
  label: string,
  text: string,
  path?: string[],
): FigurePropertyDraftState {
  const draft = draftFor(state, ref);
  return {
    ...state,
    drafts: {
      ...state.drafts,
      [propertyObjectKey(ref)]: {
        ...draft,
        numberTexts: { ...draft.numberTexts, [label]: text },
        numberPaths: path
          ? { ...draft.numberPaths, [label]: [[...path]] }
          : draft.numberPaths,
        pendingLabel: label,
      },
    },
  };
}

function clearNumberDrafts(
  draft: ObjectDraft,
  paths: string[][],
  preserveLabel?: string,
): ObjectDraft {
  const numberTexts = { ...draft.numberTexts };
  const numberPaths = { ...draft.numberPaths };
  for (const [label, fields] of Object.entries(numberPaths))
    if (
      label !== preserveLabel &&
      fields.some((field) =>
        paths.some((path) => overlappingPaths(field, path)),
      )
    ) {
      delete numberTexts[label];
      delete numberPaths[label];
    }
  const next = { ...draft, numberTexts, numberPaths };
  if (next.pendingLabel && !Object.hasOwn(numberTexts, next.pendingLabel))
    delete next.pendingLabel;
  return next;
}

function orientationReset(
  before: FigureTemplate,
  after: FigureTemplate,
  ref: PropertyObjectRef,
): string | undefined {
  if (ref.kind !== 'plot') return undefined;
  const oldPanel = before.panels.find(
    (panel) => panel.panelId === ref.panelId,
  )!;
  if (oldPanel.plotSlots.length !== 1) return undefined;
  const oldPlot = oldPanel.plotSlots.find(
    (plot) => plot.plotSlotId === ref.plotSlotId,
  )!;
  const nextPlot = after.panels
    .find((panel) => panel.panelId === ref.panelId)!
    .plotSlots.find((plot) => plot.plotSlotId === ref.plotSlotId)!;
  return categoricalDimension(oldPlot) !== categoricalDimension(nextPlot)
    ? ref.panelId
    : undefined;
}

function affectedPaths(
  before: PropertyObjectSettings,
  after: PropertyObjectSettings,
  draft: ObjectDraft,
  resetPanel: string | undefined,
): string[][] {
  const changed = propertyPatches(before, after).map((patch) => patch.path);
  if (before.kind !== 'axis' || after.kind !== 'axis') return changed;
  if (
    !sameAxisScale(before.details, after.details) ||
    before.range.min !== after.range.min ||
    before.range.max !== after.range.max
  )
    changed.push(
      ['range', 'min'],
      ['range', 'max'],
      ['details', 'scale'],
      ['details', 'symLog'],
      ['details', 'logTicks'],
    );
  if (
    draft.ref.kind === 'axis' &&
    (draft.ref.panelId === resetPanel || before.details.scale !== 'category') &&
    after.details.scale === 'category'
  ) {
    const pending = applyPropertyPatches(before, draft.patches);
    changed.push(
      ['details', 'rescale'],
      ['details', 'majorTicks', 'generation'],
      ['details', 'minorTicks', 'count'],
      ['details', 'minorTicks', 'visible'],
      ['details', 'grid', 'minor', 'visible'],
    );
    const minorGrid = pending.details.grid?.minor;
    if (
      minorGrid &&
      (!Number.isFinite(minorGrid.widthPt) || minorGrid.widthPt < 0)
    )
      changed.push(
        after.details.grid?.minor
          ? ['details', 'grid', 'minor', 'widthPt']
          : ['details', 'grid', 'minor'],
      );
    if (pending.details.tickLabels.notation === 'engineering')
      changed.push(['details', 'tickLabels', 'notation']);
    if (
      pending.details.tickLabels.divisor !== undefined &&
      pending.details.tickLabels.divisor !== 1
    )
      changed.push(['details', 'tickLabels', 'divisor']);
    const precision = pending.details.tickLabels.precision;
    if (!Number.isInteger(precision) || precision < 0 || precision > 15)
      changed.push(['details', 'tickLabels', 'precision']);
    for (const field of ['lengthPt', 'widthPt'] as const)
      if (
        !Number.isFinite(pending.details.minorTicks[field]) ||
        pending.details.minorTicks[field] < 0
      )
        changed.push(['details', 'minorTicks', field]);
  }
  return changed;
}

function clearLinkedDrafts(
  before: FigureTemplate,
  after: FigureTemplate,
  source: PropertyObjectRef,
  drafts: Record<string, ObjectDraft>,
  ratioPaths: string[][] = [],
) {
  const resetPanel = orientationReset(before, after, source);
  for (const [key, draft] of Object.entries(drafts)) {
    if (key === propertyObjectKey(source)) continue;
    const oldValue = readPropertyObjectSettings(before, draft.ref);
    const newValue = readPropertyObjectSettings(after, draft.ref);
    const paths = affectedPaths(oldValue, newValue, draft, resetPanel);
    if (
      source.kind !== 'page' &&
      draft.ref.kind !== 'page' &&
      source.panelId === draft.ref.panelId &&
      (newValue.kind === 'axis' || newValue.kind === 'panel')
    )
      paths.push(...ratioPaths);
    // 无效交点可能尚未进入模板，也必须随其目标轴的分类转换一起清除。
    const pending = applyPropertyPatches(oldValue, draft.patches);
    if (
      draft.ref.kind === 'axis' &&
      pending.kind === 'axis' &&
      pending.details.placement?.mode === 'cross'
    ) {
      const targetId = pending.details.placement.axisId;
      const panelId = draft.ref.panelId;
      const oldTarget = before.panels
        .find((panel) => panel.panelId === panelId)
        ?.axes.find((axis) => axis.axisId === targetId);
      const newTarget = after.panels
        .find((panel) => panel.panelId === panelId)
        ?.axes.find((axis) => axis.axisId === targetId);
      if (oldTarget?.scale !== 'category' && newTarget?.scale === 'category')
        paths.push(['details', 'placement']);
    }
    if (!paths.length) continue;
    const affected = (path: string[]) =>
      paths.some((other) => overlappingPaths(path, other));
    const patches = draft.patches
      .flatMap(expandObjectPatch)
      .filter((patch) => !affected(patch.path));
    if (
      draft.ref.kind === 'axis' &&
      oldValue.kind === 'axis' &&
      newValue.kind === 'axis' &&
      pending.kind === 'axis' &&
      newValue.details.scale === 'category' &&
      (oldValue.details.scale !== 'category' ||
        draft.ref.panelId === resetPanel)
    ) {
      const minorGrid = pending.details.grid?.minor;
      if (
        minorGrid &&
        ((Number.isFinite(minorGrid.widthPt) && minorGrid.widthPt >= 0) ||
          newValue.details.grid?.minor)
      )
        patches.push({
          path: ['details', 'grid', 'minor', 'visible'],
          value: false,
        });
    }
    drafts[key] = {
      ...clearNumberDrafts(draft, paths),
      patches,
    };
  }
}

// 新建的可选对象可能共用一条 patch；拆成叶字段后才能只重置其中失效的分支。
function expandObjectPatch(patch: PropertyPatch): PropertyPatch[] {
  if (
    !patch.remove &&
    patch.value !== null &&
    typeof patch.value === 'object' &&
    !Array.isArray(patch.value)
  ) {
    const entries = Object.entries(patch.value);
    if (entries.length)
      return entries.flatMap(([key, value]) =>
        expandObjectPatch({ path: [...patch.path, key], value }),
      );
  }
  return [patch];
}

function numericDraftError(
  draft: ObjectDraft,
  value: PropertyObjectSettings | undefined,
): string | undefined {
  for (const [label, paths] of Object.entries(draft.numberPaths)) {
    if (!Object.hasOwn(draft.numberTexts, label)) continue;
    for (const path of paths) {
      const input = path.reduce<unknown>(
        (item, key) =>
          item !== null && typeof item === 'object'
            ? (item as Record<string, unknown>)[key]
            : undefined,
        value,
      );
      if (typeof input === 'number' && !Number.isFinite(input))
        return `${label}：请输入完整的有效数字`;
    }
  }
  return undefined;
}

function settleDrafts(
  state: FigurePropertyDraftState,
  initial: string[],
  ratioEdit?: { key: string; paths: string[][] },
): FigurePropertyDraftState {
  let template = state.template;
  const drafts = { ...state.drafts };
  const queue = new Set(initial);
  while (queue.size) {
    const key = queue.values().next().value!;
    queue.delete(key);
    const draft = drafts[key]!;
    let value: PropertyObjectSettings | undefined;
    try {
      value = applyPropertyPatches(
        readPropertyObjectSettings(template, draft.ref),
        draft.patches,
      );
      let next = updatePropertyObjectSettings(
        template,
        draft.ref,
        value,
        state.data,
      );
      if (state.preserveLayerSize && draft.ref.kind === 'page') {
        next = resizePageLayers(template, next, true);
        assertTemplate(next);
        const errors = validateFixedAxisTicks(next);
        if (errors.length)
          throw new Error(errors.map((e) => e.message).join('；'));
      }
      const normalizedPaths = propertyPatches(
        value,
        readPropertyObjectSettings(next, draft.ref),
      ).map((patch) => patch.path);
      const applied = {
        ...clearNumberDrafts(draft, normalizedPaths),
        patches: draft.patches.filter((patch) => {
          if (!isRangeText(patch)) return false;
          const canonical = readPropertyObjectSettings(next, draft.ref);
          if (canonical.kind !== 'axis') return true;
          const bound = patch.path[1] as 'min' | 'max';
          const text = canonical.range[bound];
          return patch.value === ''
            ? text === ''
            : text !== '' && Number(patch.value) === Number(text);
        }),
      };
      delete applied.error;
      drafts[key] = applied;
      const ratioPaths = key === ratioEdit?.key ? ratioEdit.paths : [];
      clearLinkedDrafts(template, next, draft.ref, drafts, ratioPaths);
      const changed = !samePropertyValue(template, next);
      template = next;
      // 联动可能让其他对象此前无效的字段组合恢复有效，应用剩余修改后才能解除提交错误。
      if (changed || ratioPaths.length)
        for (const [other, value] of Object.entries(drafts))
          if (other !== key && value.error) queue.add(other);
    } catch (cause) {
      drafts[key] = {
        ...draft,
        error:
          numericDraftError(draft, value) ??
          (cause instanceof Error ? cause.message : '图形属性无效'),
      };
    }
  }
  return { ...state, template, drafts };
}

// 几何命令只作用于有效草稿，避免覆盖其他对象尚未完成的数字输入。
export function applyPropertyGeometry(
  state: FigurePropertyDraftState,
  template: FigureTemplate,
): FigurePropertyDraftState {
  if (Object.values(state.drafts).some((d) => d.error)) return state;
  assertTemplate(template);
  const errors = [
    ...validateFixedAxisTicks(template),
    ...validateXyLineConnections(template, state.data),
  ];
  if (errors.length) throw new Error(errors.map((e) => e.message).join('；'));
  const drafts = { ...state.drafts };
  for (const [key, draft] of Object.entries(drafts)) {
    const paths = propertyPatches(
      readPropertyObjectSettings(state.template, draft.ref),
      readPropertyObjectSettings(template, draft.ref),
    ).map((p) => p.path);
    drafts[key] = {
      ...clearNumberDrafts(draft, paths),
      patches: draft.patches.filter(
        (p) => !paths.some((path) => overlappingPaths(path, p.path)),
      ),
    };
  }
  return { ...state, template, drafts };
}

export function clearPropertyGeometryTexts(
  state: FigurePropertyDraftState,
): FigurePropertyDraftState {
  const key = propertyObjectKey(state.selection),
    draft = state.drafts[key];
  if (!draft || draft.error) return state;
  return {
    ...state,
    drafts: {
      ...state.drafts,
      [key]: clearNumberDrafts(draft, [['frame'], ['page', 'size']]),
    },
  };
}

export function changePropertyDraft(
  state: FigurePropertyDraftState,
  ref: PropertyObjectRef,
  displayed: PropertyObjectSettings,
  value: PropertyObjectSettings,
): FigurePropertyDraftState {
  const canonical = readPropertyObjectSettings(state.template, ref);
  const resets: string[][] = [];
  if (
    displayed.kind === 'axis' &&
    value.kind === 'axis' &&
    canonical.kind === 'axis'
  ) {
    if (
      displayed.details.minorTicks.lengthMode !== 'auto' &&
      value.details.minorTicks.lengthMode === 'auto' &&
      (!Number.isFinite(value.details.minorTicks.lengthPt) ||
        value.details.minorTicks.lengthPt < 0)
    ) {
      // 隐藏无效手动输入时回退；被其他错误暂缓提交的有效长度仍需保留。
      value = structuredClone(value);
      value.details.minorTicks.lengthPt = canonical.details.minorTicks.lengthPt;
      resets.push(['details', 'minorTicks', 'lengthPt']);
    }
    const beforePlacement = displayed.details.placement;
    const afterPlacement = value.details.placement;
    if (
      beforePlacement?.mode === 'cross' &&
      afterPlacement?.mode === 'cross' &&
      beforePlacement.axisId !== afterPlacement.axisId
    )
      resets.push(['details', 'placement', 'value']);
  }
  if (
    displayed.kind === 'plot' &&
    value.kind === 'plot' &&
    canonical.kind === 'plot' &&
    !displayed.settings.marker.followLineOpacity &&
    value.settings.marker.followLineOpacity
  ) {
    const opacity = value.settings.marker.opacity;
    if (
      opacity !== undefined &&
      (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
    ) {
      value = structuredClone(value);
      const validOpacity = canonical.settings.marker.opacity;
      if (validOpacity === undefined) delete value.settings.marker.opacity;
      else value.settings.marker.opacity = validOpacity;
    }
    resets.push(['settings', 'marker', 'opacity']);
  }
  const changes = propertyPatches(displayed, value);
  const previous = draftFor(state, ref);
  const current = clearNumberDrafts(
    previous,
    [...changes.map((patch) => patch.path), ...resets],
    previous.pendingLabel,
  );
  const candidate = applyPropertyPatches(
    readPropertyDraft(state, ref),
    changes,
  );
  const patches = propertyPatches(
    readPropertyObjectSettings(state.template, ref),
    candidate,
  );
  const numberPaths = { ...current.numberPaths };
  if (
    current.pendingLabel &&
    changes.length &&
    !numberPaths[current.pendingLabel]
  )
    numberPaths[current.pendingLabel] = changes.map((patch) => patch.path);
  const draft = { ...current, patches, numberPaths };
  delete draft.pendingLabel;
  const key = propertyObjectKey(ref);
  // 同层轴/图层入口共用比例；成功提交同一个数值也表示显式修正旧输入。
  const ratioPaths = [
    ...changes.map((patch) => patch.path),
    ...(previous.pendingLabel
      ? (previous.numberPaths[previous.pendingLabel] ?? [])
      : []),
  ].filter((path) => path[0] === 'axisLengthRatio');
  return settleDrafts(
    { ...state, drafts: { ...state.drafts, [key]: draft } },
    [key],
    { key, paths: ratioPaths },
  );
}

export function resetPropertyAxisRange(
  state: FigurePropertyDraftState,
  ref: PropertyObjectRef,
  action: 'auto' | 'fit' = 'auto',
): FigurePropertyDraftState {
  if (ref.kind !== 'axis') return state;
  const sourceKey = propertyObjectKey(ref);
  const refs = new Map<string, PropertyObjectRef>([[sourceKey, ref]]);
  for (const group of state.template.sharedAxisGroups ?? [])
    if (
      group.members.some(
        (member) =>
          member.panelId === ref.panelId && member.axisId === ref.axisId,
      )
    )
      for (const member of group.members) {
        const peer = { kind: 'axis' as const, ...member };
        refs.set(propertyObjectKey(peer), peer);
      }
  const value = readPropertyObjectSettings(state.template, ref);
  if (value.kind !== 'axis') return state;
  let template: FigureTemplate;
  try {
    if (action === 'auto') {
      // 完整窗口可保留；尚待数据解析的单端约束必须随恢复自动一起解除。
      if (!value.range.min || !value.range.max) {
        value.range.min = '';
        value.range.max = '';
      }
      if (value.details.scale !== 'category')
        value.details.rescale = { ...value.details.rescale, mode: 'auto' };
      template = updatePropertyObjectSettings(
        state.template,
        ref,
        value,
        state.data,
      );
    } else if (!value.details.rescale && value.details.scale !== 'category') {
      value.details.rescale = {
        mode: value.range.min && value.range.max ? 'normal' : 'auto',
      };
      template = updatePropertyObjectSettings(
        state.template,
        ref,
        value,
        state.data,
      );
    } else template = structuredClone(state.template);
    if (state.data) {
      const result = rescaleFigureRanges({
        before: state.template,
        candidate: template,
        beforeData: state.data,
        data: state.data,
        reason: 'fit',
        axisIds: [ref.axisId],
      });
      const errors = result.diagnostics.filter((d) => d.severity === 'error');
      if (errors.length)
        throw new Error(errors.map((d) => d.message).join('；'));
      template = result.template;
    }
  } catch (cause) {
    return {
      ...state,
      drafts: {
        ...state.drafts,
        [sourceKey]: {
          ...draftFor(state, ref),
          error: cause instanceof Error ? cause.message : '无法重缩放',
        },
      },
    };
  }
  const drafts = { ...state.drafts };
  clearLinkedDrafts(state.template, template, ref, drafts);
  for (const [key, target] of refs) {
    const draft = draftFor({ ...state, drafts }, target);
    const paths = [
      ['range', 'min'],
      ['range', 'max'],
      ...(action === 'auto' ? [['details', 'rescale', 'mode']] : []),
    ];
    if (key !== sourceKey) paths.push(['details', 'scale']);
    drafts[key] = {
      ...clearNumberDrafts(draft, paths),
      patches: draft.patches.filter(
        (patch) => !paths.some((path) => overlappingPaths(patch.path, path)),
      ),
    };
  }
  return settleDrafts({ ...state, template, drafts }, [...refs.keys()]);
}
