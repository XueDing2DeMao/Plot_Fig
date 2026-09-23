import { useContext } from 'react';
import {
  AxisAdvancedSchema,
  AxisScaleOptionsSchema,
  type Axis,
  type AxisAdvanced,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertySelect,
  PropertyNumberDraftContext,
} from './PropertyInputs.js';
// 只读描述驱动 F5 表单，所有输入仍通过正式模板与领域校验后才能应用。
type Schema = {
  type?: string;
  const?: string;
  anyOf?: Schema[];
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
};
type Model = Record<string, unknown>;
const labels: Record<string, string> = {
  calendar: '日历刻度',
  unit: '时间单位',
  step: '间隔',
  anchor: '锚点（UTC 毫秒）',
  categoryOrder: '分类顺序',
  mode: '方式',
  values: '位置序列',
  ticks: '指定刻度位置',
  major: '主刻度',
  minor: '次刻度',
  dataSlotId: '数据列',
  labels: '标签来源',
  source: '来源',
  positionSlotId: '位置匹配列',
  match: '匹配方式',
  metadata: '列信息',
  format: '日期格式',
  timeZone: '时区',
  title: '行标题',
  labelTable: '多行标签表',
  rows: '标签行',
  gapPt: '行间距 (pt)',
  minorLabels: '次刻度标签',
  visible: '显示',
  fontSizePt: '字号 (pt)',
  color: '颜色',
  specialTicks: '特殊刻度',
  at: '位置',
  value: '数值',
  label: '文字',
  lengthPt: '长度 (pt)',
  leaderPt: '引线长度 (pt)',
  hide: '隐藏此刻度',
  arrow: '轴线箭头',
  references: '参考线与填色',
  items: '参考线',
  id: '名称',
  kind: '类型',
  plotSlotId: '统计曲线',
  statistic: '统计量',
  quantile: '分位数 (0–1)',
  domain: '统计范围',
  widthPt: '线宽 (pt)',
  dash: '线型',
  showValue: '显示数值',
  labelPosition: '标签沿线位置 (0–1)',
  fill: '区间填色',
  opacity: '不透明度 (0–1)',
  rug: 'Rug 分布标记',
  plotSlotIds: '曲线',
  arrangement: '多曲线排列',
  side: '位置',
  followStyle: '跟随曲线颜色',
  offsetPt: '离轴距离 (pt)',
  breaks: '断轴',
  intervals: '断区',
  from: '断区起点',
  to: '断区终点',
  gapPercent: '断区间隙 (%)',
  after: '后续区段设置',
  scale: '尺度',
  majorStep: '主刻度增量',
  minorCount: '次刻度数量',
  notation: '数字格式',
  precision: '小数位数',
  weights: '保留区段权重',
  mark: '断轴符号',
  markSizePt: '符号大小 (pt)',
  link: '公式轴链接',
  panelId: '源图层',
  axisId: '源坐标轴',
  formula: '正逆公式',
  forward: '正向公式 f(x)',
  inverse: '反向公式 f⁻¹(x)',
  min: '公式定义域下界',
  max: '公式定义域上界',
  offset: '偏移常数',
};
const words: Record<string, string> = {
  second: '秒',
  minute: '分钟',
  hour: '小时',
  day: '日',
  week: '周',
  month: '月',
  quarter: '季度',
  year: '年',
  appearance: '首次出现',
  ascending: '升序',
  descending: '降序',
  custom: '自定义',
  values: '手动位置',
  column: '数据列',
  value: '数值',
  date: '日期时间',
  metadata: '列信息',
  index: '序号',
  name: '列名',
  unit: '单位',
  table: '表名',
  min: '最小值',
  max: '最大值',
  start: '起点',
  end: '终点',
  both: '两端',
  constant: '常数',
  statistic: '统计量',
  mean: '均值',
  median: '中位数',
  sd: '样本标准差',
  quantile: '分位数',
  all: '全部样本',
  visible: '当前可见样本',
  solid: '实线',
  dash: '虚线',
  dot: '点线',
  paired: '成对填充',
  alternating: '交替填充',
  raw: '原始样本',
  display: '显示样本',
  overlap: '重叠',
  stack: '分层',
  inside: '轴内',
  outside: '轴外',
  linear: '线性',
  log10: 'Log10',
  ln: 'Ln',
  log2: 'Log2',
  auto: '自动',
  fixed: '固定小数',
  scientific: '科学计数法',
  engineering: '工程计数法',
  slash: '双斜线',
  zigzag: '折线',
};
type Context = {
  template?: FigureTemplate | undefined;
  axis?: Axis | undefined;
  columns?: { id: string; name: string }[] | undefined;
};
function preset(schema: Schema, key: string, context: Context): unknown {
  const special: Record<string, unknown> = {
    calendar: { unit: 'month', step: 1 },
    labels: { source: 'value' },
    labelTable: { rows: [{ source: 'index' }] },
    minorLabels: { visible: true },
    ticks: { major: { mode: 'values', values: [0, 1] } },
    major: { mode: 'values', values: [0, 1] },
    minor: { mode: 'values', values: [0.5] },
    references: { items: [{ id: 'reference-1', kind: 'constant', value: 0 }] },
    rug: {
      plotSlotIds: [],
      source: 'raw',
      arrangement: 'overlap',
      side: 'outside',
      followStyle: true,
    },
    breaks: { intervals: [{ from: 25, to: 75, gapPercent: 3 }] },
    intervals: { from: 25, to: 75, gapPercent: 3 },
    formula: { forward: 'x', inverse: 'x', min: 0, max: 100 },
    specialTicks: [{ at: 'max', label: '最大值' }],
    rows: { source: 'value' },
    fill: { mode: 'paired', color: '#dbeafe', opacity: 0.3 },
    categoryOrder: { mode: 'ascending' },
  };
  if (key === 'link') {
    const panel = context.template?.panels.find((p) =>
        p.axes.some(
          (a) =>
            a.dimension === context.axis?.dimension &&
            a.axisId !== context.axis?.axisId,
        ),
      ),
      axis = panel?.axes.find(
        (a) =>
          a.dimension === context.axis?.dimension &&
          a.axisId !== context.axis?.axisId,
      );
    return {
      panelId: panel?.panelId ?? '',
      axisId: axis?.axisId ?? '',
      formula: {
        forward: 'x',
        inverse: 'x',
        min: axis?.range.mode === 'fixed' ? axis.range.min : 0,
        max: axis?.range.mode === 'fixed' ? axis.range.max : 100,
      },
    };
  }
  if (key === 'specialTicks' && schema.type === 'object')
    return { at: 'value', value: 0 };
  if (special[key] !== undefined && !schema.properties?.mode?.const)
    return structuredClone(special[key]);
  if (schema.const !== undefined) return schema.const;
  if (schema.anyOf) return preset(schema.anyOf[0]!, key, context);
  if (schema.type === 'object')
    return Object.fromEntries(
      (schema.required ?? []).map((k) => [
        k,
        preset(schema.properties![k]!, k, context),
      ]),
    );
  if (schema.type === 'array')
    return Array.from({ length: schema.minItems ?? 0 }, () =>
      preset(schema.items!, key, context),
    );
  if (schema.type === 'boolean') return false;
  if (schema.type === 'number' || schema.type === 'integer')
    return key === 'max'
      ? 100
      : key === 'offset'
        ? 273.14
        : key === 'opacity'
          ? 0.3
          : key === 'gapPercent'
            ? 3
            : Math.max(
                schema.minimum ?? 0,
                (schema.exclusiveMinimum ?? -1) + 1,
              );
  if (key === 'dataSlotId' || key === 'positionSlotId')
    return context.template?.dataSlots[0]?.dataSlotId ?? '';
  if (key === 'color') return '#2563eb';
  if (key === 'timeZone') return 'UTC';
  if (key === 'format') return 'yyyy-MM-dd';
  if (key === 'id') return `reference-${Date.now()}`;
  return '';
}
function shown(key: string, value: Model): boolean {
  if (value.source) {
    if (['dataSlotId', 'match', 'positionSlotId'].includes(key))
      return (
        ['column', 'metadata'].includes(String(value.source)) &&
        (key !== 'positionSlotId' || value.match === 'value') &&
        (key !== 'match' || value.source === 'column')
      );
    if (key === 'metadata') return value.source === 'metadata';
    if (key === 'format' || key === 'timeZone') return value.source === 'date';
  }
  if (value.kind) {
    if (key === 'value') return value.kind === 'constant';
    if (
      key === 'statistic' ||
      key === 'quantile' ||
      key === 'domain' ||
      key === 'plotSlotId'
    )
      return (
        value.kind === 'statistic' &&
        (key !== 'quantile' || value.statistic === 'quantile')
      );
    if (key === 'dataSlotId')
      return value.kind === 'column' || value.kind === 'statistic';
  }
  if (key === 'value' && value.at) return value.at === 'value';
  return true;
}
export function F5Field({
  schema,
  value,
  onChange,
  path,
  name,
  context = {},
}: {
  schema: Schema;
  value: unknown;
  onChange: (v: unknown) => void;
  path: string;
  name: string;
  context?: Context;
}) {
  const draft = useContext(PropertyNumberDraftContext),
    key = path.split('.').at(-1)!;
  if (schema.anyOf) {
    const choices = schema.anyOf;
    if (choices.every((s) => s.const !== undefined))
      return (
        <PropertySelect
          label={name}
          value={String(value ?? choices[0]!.const)}
          options={Object.fromEntries(
            choices.map((s) => [s.const!, words[s.const!] ?? s.const!]),
          )}
          onChange={onChange}
        />
      );
    const chosen =
      choices.find(
        (s) => s.properties?.mode?.const === (value as Model)?.mode,
      ) ?? choices[0]!;
    return (
      <>
        <PropertySelect
          label={name + '来源'}
          value={String((value as Model)?.mode ?? 'values')}
          options={{ values: '手动位置', column: '数据列' }}
          onChange={(mode) =>
            onChange(
              preset(
                choices.find((s) => s.properties?.mode?.const === mode)!,
                key,
                context,
              ),
            )
          }
        />
        <F5Field
          schema={chosen}
          value={value}
          onChange={onChange}
          path={path}
          name={name}
          context={context}
        />
      </>
    );
  }
  if (schema.const !== undefined) return null;
  if (schema.type === 'object') {
    const object = (value ?? {}) as Model;
    return (
      <div className="property-grid f5-object">
        {Object.entries(schema.properties ?? {})
          .filter(([k]) => shown(k, object))
          .map(([k, s]) => {
            const required = schema.required?.includes(k) ?? false,
              enabled = object[k] !== undefined,
              caption = `${name} · ${labels[k] ?? k}`;
            const update = (v: unknown) => {
              const next = { ...object };
              if (v === undefined) delete next[k];
              else next[k] = v;
              if (k === 'source') {
                for (const other of [
                  'dataSlotId',
                  'positionSlotId',
                  'match',
                  'metadata',
                  'format',
                  'timeZone',
                ])
                  delete next[other];
                if (v === 'column' || v === 'metadata')
                  next.dataSlotId =
                    context.template?.dataSlots[0]?.dataSlotId ?? '';
              }
              if (k === 'kind') {
                for (const other of [
                  'value',
                  'dataSlotId',
                  'plotSlotId',
                  'statistic',
                  'quantile',
                  'domain',
                ])
                  delete next[other];
                if (v === 'constant') next.value = 0;
                if (v === 'column')
                  next.dataSlotId =
                    context.template?.dataSlots[0]?.dataSlotId ?? '';
                if (v === 'statistic') next.statistic = 'mean';
              }
              if (k === 'at' && v === 'value') next.value = 0;
              if (k === 'match' && v === 'value')
                next.positionSlotId =
                  context.template?.dataSlots.find(
                    (s) => s.valueType === 'number',
                  )?.dataSlotId ?? '';
              if (k === 'axisId') {
                const p = context.template?.panels.find((p) =>
                  p.axes.some((a) => a.axisId === v),
                );
                if (p) next.panelId = p.panelId;
              }
              onChange(next);
            };
            return (
              <div key={k} className="f5-field">
                {!required && (
                  <PropertyCheck
                    label={'启用' + caption}
                    checked={enabled}
                    onChange={(yes) =>
                      update(yes ? preset(s, k, context) : undefined)
                    }
                  />
                )}{' '}
                {(required || enabled) && (
                  <F5Field
                    schema={s}
                    value={object[k]}
                    onChange={update}
                    path={`${path}.${k}`}
                    name={caption}
                    context={context}
                  />
                )}
              </div>
            );
          })}
      </div>
    );
  }
  if (schema.type === 'array') {
    const array = (value ?? []) as unknown[],
      item = schema.items!;
    if (
      ['number', 'integer', 'string'].includes(item.type ?? '') &&
      key !== 'plotSlotIds'
    ) {
      const numeric = item.type !== 'string',
        text = draft?.texts[name] ?? array.join(', ');
      return (
        <PropertyInput
          label={name + (numeric ? '（逗号分隔）' : '（每项逗号分隔）')}
          value={text}
          aria-invalid={
            (numeric &&
              array.some(
                (v) => typeof v !== 'number' || !Number.isFinite(v),
              )) ||
            undefined
          }
          onChange={(e) => {
            const raw = e.target.value;
            draft?.setText(name, raw, path.split('.'));
            const parts = raw.trim()
              ? raw.split(/[,，\n]/).map((v) => v.trim())
              : [];
            onChange(
              numeric
                ? parts.map((p) =>
                    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(p)
                      ? Number(p)
                      : NaN,
                  )
                : parts,
            );
          }}
        />
      );
    }
    if (key === 'plotSlotIds') {
      const plots =
        context.template?.panels
          .flatMap((p) => p.plotSlots)
          .filter(
            (p) =>
              !context.axis ||
              (context.axis.dimension === 'x' ? p.xAxisId : p.yAxisId) ===
                context.axis.axisId,
          ) ?? [];
      return (
        <>
          <p className="property-hint">未勾选时包含当前轴的全部曲线。</p>
          {plots.map((p) => (
            <PropertyCheck
              key={p.plotSlotId}
              label={p.legendEntry.text || p.plotSlotId}
              checked={array.includes(p.plotSlotId)}
              onChange={(yes) =>
                onChange(
                  yes
                    ? [...array, p.plotSlotId]
                    : array.filter((id) => id !== p.plotSlotId),
                )
              }
            />
          ))}
        </>
      );
    }
    return (
      <>
        {array.map((entry, i) => (
          <fieldset className="property-group" key={i}>
            <legend>
              {name} {i + 1}
            </legend>
            <F5Field
              schema={item}
              value={entry}
              path={`${path}.${i}`}
              name={`${name} ${i + 1}`}
              context={context}
              onChange={(v) => onChange(array.map((e, j) => (j === i ? v : e)))}
            />
            <button
              type="button"
              disabled={array.length <= (schema.minItems ?? 0)}
              onClick={() => onChange(array.filter((_, j) => j !== i))}
            >
              删除{name} {i + 1}
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          disabled={array.length >= (schema.maxItems ?? 128)}
          onClick={() => {
            const entry = preset(item, key, context);
            if (
              entry &&
              typeof entry === 'object' &&
              !Array.isArray(entry) &&
              'id' in entry
            )
              entry.id = `reference-${Date.now()}`;
            onChange([...array, entry]);
          }}
        >
          添加{name}
        </button>
      </>
    );
  }
  if (schema.type === 'boolean')
    return (
      <PropertyCheck
        label={name}
        checked={Boolean(value)}
        onChange={onChange}
      />
    );
  if (schema.type === 'number' || schema.type === 'integer')
    return (
      <PropertyNumber
        label={name}
        fieldPath={path}
        value={typeof value === 'number' ? value : NaN}
        min={schema.minimum ?? null}
        step={schema.type === 'integer' ? 1 : 'any'}
        onChange={onChange}
      />
    );
  let options: Record<string, string> | undefined;
  if (key === 'dataSlotId' || key === 'positionSlotId')
    options = Object.fromEntries([
      ...(context.template?.dataSlots ?? []).map((s) => [s.dataSlotId, s.name]),
      ...(context.columns ?? []).map((c) => [
        '@column:' + c.id,
        '数据表 · ' + c.name,
      ]),
    ]);
  if (key === 'plotSlotId')
    options = Object.fromEntries(
      (context.template?.panels.flatMap((p) => p.plotSlots) ?? []).map((p) => [
        p.plotSlotId,
        p.legendEntry.text || p.plotSlotId,
      ]),
    );
  if (key === 'panelId')
    options = Object.fromEntries(
      (context.template?.panels ?? []).map((p) => [
        p.panelId,
        p.name ?? p.panelId,
      ]),
    );
  if (key === 'axisId')
    options = Object.fromEntries(
      (context.template?.panels ?? []).flatMap((p) =>
        p.axes
          .filter(
            (a) =>
              a.axisId !== context.axis?.axisId &&
              (!context.axis || a.dimension === context.axis.dimension),
          )
          .map((a) => [
            a.axisId,
            `${p.name ?? p.panelId} · ${a.title?.text || a.position}`,
          ]),
      ),
    );
  if (options)
    return (
      <PropertySelect
        label={name}
        value={String(value ?? '')}
        options={{ '': '请选择', ...options }}
        onChange={onChange}
      />
    );
  return (
    <PropertyInput
      label={name}
      value={String(value ?? '')}
      type={key === 'color' ? 'color' : 'text'}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
export function AxisAdvancedFields({
  value,
  onChange,
  features,
  template,
  axis,
  columns,
}: {
  value: AxisAdvanced | undefined;
  onChange: (v: AxisAdvanced | undefined) => void;
  features: (keyof AxisAdvanced)[];
  template?: FigureTemplate | undefined;
  axis?: Axis | undefined;
  columns?: Context['columns'];
}) {
  const context = { template, axis, columns },
    properties = (AxisAdvancedSchema as unknown as Schema).properties!;
  return (
    <>
      {features.map((key) => (
        <fieldset className="property-group" key={key}>
          <legend>{labels[key]}</legend>
          <PropertyCheck
            label={'启用' + labels[key]}
            checked={value?.[key] !== undefined}
            onChange={(enabled) => {
              const next = { ...value };
              if (enabled)
                Object.assign(next, {
                  [key]: preset(properties[key]!, key, context),
                });
              else delete next[key];
              onChange(Object.keys(next).length ? next : undefined);
            }}
          />
          {value?.[key] !== undefined && (
            <F5Field
              schema={properties[key]!}
              value={value[key]}
              name={labels[key]!}
              path={`details.advanced.${key}`}
              context={context}
              onChange={(entry) => onChange({ ...value, [key]: entry })}
            />
          )}{' '}
          {key === 'calendar' && (
            <p className="property-hint">
              时间数据使用 UTC
              毫秒。月、季度和年按日历推进，保留锚点日；显示时区在标签来源中设置。
            </p>
          )}
          {key === 'breaks' && (
            <p className="property-hint">
              请先设置完整固定范围。断区按数值递增填写；区段权重从左侧数值下界依次填写。多行标签表、双
              Y 对齐和轴长比例需关闭。
            </p>
          )}
          {key === 'link' && (
            <p className="property-hint">
              目标轴使用线性单位。正向公式将源单位换为目标单位，定义域需覆盖源范围；源轴变化会同步。
            </p>
          )}
          {key === 'rug' && (
            <p className="property-hint">
              保留重复样本。显示样本遵循筛选和抽样；原始样本使用完整输入。
            </p>
          )}
        </fieldset>
      ))}
    </>
  );
}
export function AxisScaleOptionFields({
  value,
  onChange,
  scale,
}: {
  value: Axis['scaleOptions'];
  onChange: (v: Axis['scaleOptions']) => void;
  scale?: Axis['scale'];
}) {
  const schema = AxisScaleOptionsSchema as unknown as Schema;
  const key =
    scale === 'custom'
      ? 'formula'
      : scale === 'offset-reciprocal'
        ? 'offset'
        : undefined;
  return (
    <F5Field
      schema={
        key
          ? { ...schema, properties: { [key]: schema.properties![key]! } }
          : schema
      }
      value={value}
      name="尺度参数"
      path="details.scaleOptions"
      onChange={(v) => onChange(v as Axis['scaleOptions'])}
    />
  );
}
