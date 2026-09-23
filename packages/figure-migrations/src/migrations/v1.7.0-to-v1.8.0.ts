import {
  canonicalizeFigurePayload,
  validateV170Structure,
  type FigureTemplate,
} from '@plot-fig/figure-schema';

function upgradeTemplate(template: FigureTemplate) {
  // 旧版无精确可用曲线时以全层数据生成辅助轴；显式保存该兼容语义。
  for (const panel of template.panels)
    for (const axis of panel.axes) {
      const shared = template.sharedAxisGroups?.some((group) =>
        group.members.some(
          (member) =>
            member.panelId === panel.panelId && member.axisId === axis.axisId,
        ),
      );
      if (!shared && axis.range.mode !== 'fixed')
        axis.compatibility = { unboundRange: 'panel-v1.7' };
    }
  return { ...template, schemaVersion: '1.8.0' };
}

export function migrateV170ToV180(input: unknown): unknown {
  const value = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(value?.kind) ||
    !validateV170Structure(value, value.kind)
  )
    throw new Error('1.7.0 图形结构无效');
  return value.kind === 'figure-template'
    ? upgradeTemplate(value)
    : {
        ...value,
        schemaVersion: '1.8.0',
        templateSnapshot: upgradeTemplate(value.templateSnapshot),
      };
}
