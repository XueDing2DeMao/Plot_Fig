export type BatchField = {
  key: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'boolean'
    | 'select'
    | 'opacity'
    | 'custom-dash'
    | 'curve-arrows'
    | 'drop-line'
    | 'row-range'
    | 'series-sampling'
    | 'marker-shape'
    | 'marker-mapping'
    | 'marker-details'
    | 'point-overrides'
    | 'f4-object'
    | 'f5-object';
  // F5 配置以每项完整对象应用，保留目标其他轴外观。
  // 符号映射按整个规则设置，数据列仍由各条曲线单独绑定。
  options?: Record<string, string>;
  optional?: boolean;
};
export type BatchGroup = {
  id: string;
  label: string;
  root: string;
  defaults: Record<string, unknown>;
  fields: BatchField[];
};
export const textField = (key: string, label: string): BatchField => ({
  key,
  label,
  type: 'text',
});
export const numberField = (
  key: string,
  label: string,
  optional = false,
): BatchField => ({ key, label, type: 'number', optional });
export const boolField = (key: string, label: string): BatchField => ({
  key,
  label,
  type: 'boolean',
});
export const selectField = (
  key: string,
  label: string,
  options: Record<string, string>,
  optional = false,
): BatchField => ({ key, label, type: 'select', options, optional });
export const dashOptions = {
  solid: '实线',
  dashed: '虚线',
  dotted: '点线',
  'dash-dot': '点划线',
};
export function lineFields(prefix = ''): BatchField[] {
  return [
    boolField(prefix + 'visible', '显示'),
    textField(prefix + 'color', '颜色'),
    numberField(prefix + 'widthPt', '宽度 (pt)'),
    selectField(prefix + 'dash', '线型', dashOptions),
  ];
}
export const lineDefaults = {
  visible: false,
  color: '#b0b0b0',
  widthPt: 0.5,
  dash: 'solid',
};

export function batchValueAt(value: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (item, key) =>
        item !== null && typeof item === 'object'
          ? (item as Record<string, unknown>)[key]
          : undefined,
      value,
    );
}
