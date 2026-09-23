import { useContext, useState } from 'react';
import type {
  DataLabels,
  LabelOverrides,
  MarkerSource,
} from '@plot-fig/figure-schema';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertySelect,
  PropertyFill,
  PropertyNumberDraftContext,
} from './PropertyInputs.js';

export type DataLabelFieldsProps = {
  plotKind?: 'xy' | 'bar' | 'area';
  value: DataLabels | undefined;
  onChange: (next: DataLabels | undefined) => void;
  columns?: { id: string; name: string }[];
  labelColumnId?: string;
  onLabelColumnChange?: (id: string) => void;
  overrides?: LabelOverrides | undefined;
  onOverridesChange?: (next: LabelOverrides | undefined) => void;
  source?: MarkerSource | undefined;
  rowCount?: number;
};
const defaultFont = { family: 'Arial', sizePt: 10, bold: false, italic: false };
const defaultOffset = { x: 0, y: 0, unit: 'pt' as const };
const sourceOptions = {
  x: 'X 值',
  y: 'Y 值',
  xy: 'X 与 Y',
  column: '标签列',
  row: '原始行号',
  custom: '文本模板',
};
export function DataLabelFields({
  plotKind = 'xy',
  value,
  onChange,
  columns = [],
  labelColumnId = '',
  onLabelColumnChange,
  overrides,
  onOverridesChange,
  source,
  rowCount = 100000,
}: DataLabelFieldsProps) {
  const drafts = useContext(PropertyNumberDraftContext),
    [activeRow, setActiveRow] = useState(1);
  const config: DataLabels = value ?? { visible: false, source: 'y' };
  const update = <K extends keyof DataLabels>(key: K, next: DataLabels[K]) => {
    const result = { ...config };
    if (next === undefined) delete result[key];
    else result[key] = next;
    onChange(result);
  };
  const font = config.font ?? defaultFont,
    format = config.format ?? { mode: 'auto' as const, precision: 2 },
    offset = config.offset ?? defaultOffset;
  const leader = config.leader ?? {
    visible: false,
    color: '#555555',
    widthPt: 0.5,
  };
  const box = config.box ?? {
    visible: false,
    fill: '#ffffff',
    stroke: '#000000',
    widthPt: 0.5,
    paddingPt: 2,
  };
  const paused =
    !!overrides &&
    (!source ||
      Object.keys(source).some(
        (k) =>
          source[k as keyof MarkerSource] !==
          overrides.source[k as keyof MarkerSource],
      ));
  const rowValid =
    Number.isInteger(activeRow) && activeRow >= 1 && activeRow <= rowCount;
  const patch = overrides?.points.find((p) => p.row === activeRow);
  const resetPatchDrafts = () => {
    drafts?.setText('此行标签水平偏移', String(offset.x));
    drafts?.setText('此行标签垂直偏移', String(offset.y));
  };
  const setPatch = (next: LabelOverrides['points'][number] | undefined) => {
    if (!source || paused || !rowValid || !onOverridesChange) return;
    if (!next || !patch) resetPatchDrafts();
    const points = (overrides?.points ?? []).filter((p) => p.row !== activeRow);
    if (next) points.push(next);
    onOverridesChange(
      points.length
        ? { source, points: points.sort((a, b) => a.row - b.row) }
        : undefined,
    );
  };
  const updatePatch = (next: Partial<LabelOverrides['points'][number]>) =>
    setPatch({ ...patch, row: activeRow, ...next });
  const inputRows =
    config.sampling?.mode === 'rows' ? config.sampling.rows.join(', ') : '1';
  return (
    <>
      <fieldset className="property-group">
        <legend>数据标签</legend>
        <PropertyCheck
          label="显示数据标签"
          checked={config.visible}
          onChange={(v) => update('visible', v)}
        />
        {config.visible && (
          <>
            <PropertySelect
              label="标签来源"
              value={config.source}
              options={
                plotKind === 'bar'
                  ? { ...sourceOptions, x: '类别', y: '柱值', xy: '类别与柱值' }
                  : sourceOptions
              }
              onChange={(v) => {
                const next = { ...config, source: v };
                if (v === 'custom' && !next.template)
                  next.template = '{row}: {y}';
                onChange(next);
              }}
            />
            {(config.source === 'column' || config.source === 'custom') && (
              <PropertySelect
                label="标签数据列"
                value={labelColumnId}
                options={{
                  '': '未选择',
                  ...Object.fromEntries(columns.map((c) => [c.id, c.name])),
                }}
                onChange={(v) => onLabelColumnChange?.(v)}
              />
            )}
            {config.source === 'custom' && (
              <>
                <PropertyInput
                  label="标签文本模板"
                  value={config.template ?? ''}
                  onChange={(e) => update('template', e.target.value)}
                />
                <p className="property-hint">
                  可使用 {'{x}'}、{'{y}'}、{'{label}'} 和 {'{row}'}
                  。模板只替换文字。
                </p>
              </>
            )}
            <div className="property-grid">
              <PropertySelect
                label="标签数值格式"
                value={format.mode}
                options={{
                  auto: '自动',
                  fixed: '固定小数',
                  scientific: '科学计数',
                }}
                onChange={(mode) => update('format', { ...format, mode })}
              />
              <PropertyNumber
                label="标签小数位数"
                value={format.precision}
                step={1}
                onChange={(precision) =>
                  update('format', { ...format, precision })
                }
              />
              <PropertyInput
                label="标签前缀"
                value={format.prefix ?? ''}
                onChange={(e) =>
                  update('format', { ...format, prefix: e.target.value })
                }
              />
              <PropertyInput
                label="标签后缀"
                value={format.suffix ?? ''}
                onChange={(e) =>
                  update('format', { ...format, suffix: e.target.value })
                }
              />
            </div>
            <div className="property-grid">
              <PropertyInput
                label="标签字体"
                value={font.family}
                onChange={(e) =>
                  update('font', { ...font, family: e.target.value })
                }
              />
              <PropertyNumber
                label="标签字号 (pt)"
                value={font.sizePt}
                step="any"
                min={1}
                onChange={(sizePt) => update('font', { ...font, sizePt })}
              />
              <PropertyCheck
                label="标签粗体"
                checked={font.bold}
                onChange={(bold) => update('font', { ...font, bold })}
              />
              <PropertyCheck
                label="标签斜体"
                checked={font.italic}
                onChange={(italic) => update('font', { ...font, italic })}
              />
            </div>
            <PropertySelect
              label="标签颜色来源"
              value={config.color?.mode ?? 'fixed'}
              options={{
                fixed: '固定颜色',
                line: '跟随线条',
                marker: plotKind === 'xy' ? '跟随符号' : '跟随填充',
              }}
              onChange={(mode) =>
                update(
                  'color',
                  mode === 'fixed' ? { mode, value: '#000000' } : { mode },
                )
              }
            />
            {(!config.color || config.color.mode === 'fixed') && (
              <PropertyInput
                label="标签颜色"
                type="color"
                value={
                  config.color?.mode === 'fixed'
                    ? config.color.value
                    : '#000000'
                }
                onChange={(e) =>
                  update('color', { mode: 'fixed', value: e.target.value })
                }
              />
            )}
            <PropertySelect
              label="标签锚点"
              value={config.anchor ?? 'point'}
              options={{
                point: '数据点',
                baseline: '基线',
                'x-error-lower': 'X 误差下端点',
                'x-error-upper': 'X 误差上端点',
                'y-error-lower': 'Y 误差下端点',
                'y-error-upper': 'Y 误差上端点',
              }}
              onChange={(v) => update('anchor', v)}
            />
            {config.anchor === 'baseline' && (
              <PropertyNumber
                label="标签基线值"
                value={config.baseline ?? 0}
                step="any"
                min={null}
                onChange={(v) => update('baseline', v)}
              />
            )}
            <div className="property-grid">
              <PropertySelect
                label="标签位置"
                value={config.position ?? 'above'}
                options={{
                  above: '上方',
                  below: '下方',
                  left: '左侧',
                  right: '右侧',
                  center: '居中',
                }}
                onChange={(v) => update('position', v)}
              />
              <PropertyNumber
                label="标签旋转角度"
                value={config.rotationDeg ?? 0}
                step="any"
                min={null}
                onChange={(v) => update('rotationDeg', v)}
              />
              <PropertyNumber
                label="标签水平偏移"
                value={offset.x}
                step="any"
                min={null}
                onChange={(x) => update('offset', { ...offset, x })}
              />
              <PropertyNumber
                label="标签垂直偏移"
                value={offset.y}
                step="any"
                min={null}
                onChange={(y) => update('offset', { ...offset, y })}
              />
              <PropertySelect
                label="标签偏移单位"
                value={offset.unit}
                options={{ pt: 'pt', 'font-percent': '字号百分比' }}
                onChange={(unit) => update('offset', { ...offset, unit })}
              />
              <PropertyNumber
                label="标签与锚点间距 (pt)"
                value={config.gapPt ?? 3}
                step="any"
                onChange={(v) => update('gapPt', v)}
              />
              <PropertyNumber
                label="标签每行字符数"
                value={config.wrapChars ?? 0}
                step={1}
                onChange={(v) => update('wrapChars', v)}
              />
              <PropertyNumber
                label="标签行距倍数"
                value={config.lineSpacing ?? 1.2}
                step="any"
                min={1}
                onChange={(v) => update('lineSpacing', v)}
              />
            </div>
            <p className="property-hint">
              每行字符数设为 0 时不自动换行。水平正值向右，垂直正值向下。
            </p>
            <PropertySelect
              label="标签重叠处理"
              value={config.collision ?? 'none'}
              options={{
                none: '允许重叠',
                hide: '隐藏重叠标签',
                move: '移动避让',
              }}
              onChange={(v) => update('collision', v)}
            />
            <PropertyCheck
              label="显示标签引导线"
              checked={leader.visible}
              onChange={(visible) => update('leader', { ...leader, visible })}
            />
            {leader.visible && (
              <div className="property-grid">
                <PropertyInput
                  label="标签引导线颜色"
                  type="color"
                  value={leader.color}
                  onChange={(e) =>
                    update('leader', { ...leader, color: e.target.value })
                  }
                />
                <PropertyNumber
                  label="标签引导线宽度 (pt)"
                  value={leader.widthPt}
                  step="any"
                  onChange={(widthPt) =>
                    update('leader', { ...leader, widthPt })
                  }
                />
              </div>
            )}
            <PropertyCheck
              label="显示标签边框和背景"
              checked={box.visible}
              onChange={(visible) => update('box', { ...box, visible })}
            />
            {box.visible && (
              <div className="property-grid">
                <PropertyFill
                  label="标签背景颜色"
                  value={box.fill}
                  onChange={(fill) => update('box', { ...box, fill })}
                />
                <PropertyFill
                  label="标签边框颜色"
                  value={box.stroke}
                  onChange={(stroke) => update('box', { ...box, stroke })}
                />
                <PropertyNumber
                  label="标签边框宽度 (pt)"
                  value={box.widthPt}
                  step="any"
                  onChange={(widthPt) => update('box', { ...box, widthPt })}
                />
                <PropertyNumber
                  label="标签框内边距 (pt)"
                  value={box.paddingPt}
                  step="any"
                  onChange={(paddingPt) => update('box', { ...box, paddingPt })}
                />
              </div>
            )}
            <PropertySelect
              label="标签抽样"
              value={config.sampling?.mode ?? 'all'}
              options={{
                all: '全部原行',
                every: '按原行间隔',
                count: '限定数量',
                rows: '指定原行',
              }}
              onChange={(mode) => {
                drafts?.setText('标签抽样值', mode === 'count' ? '20' : '2');
                drafts?.setText('标签指定原行', '1');
                update(
                  'sampling',
                  mode === 'all'
                    ? { mode }
                    : mode === 'every'
                      ? { mode, step: 2 }
                      : mode === 'count'
                        ? { mode, count: 20 }
                        : { mode, rows: [1] },
                );
              }}
            />
            {(config.sampling?.mode === 'every' ||
              config.sampling?.mode === 'count') && (
              <PropertyNumber
                label="标签抽样值"
                value={
                  config.sampling.mode === 'every'
                    ? config.sampling.step
                    : config.sampling.count
                }
                step={1}
                min={1}
                onChange={(v) =>
                  update(
                    'sampling',
                    config.sampling?.mode === 'every'
                      ? { mode: 'every', step: v }
                      : { mode: 'count', count: v },
                  )
                }
              />
            )}
            {config.sampling?.mode === 'rows' && (
              <PropertyInput
                label="标签指定原行"
                value={drafts?.texts['标签指定原行'] ?? inputRows}
                onChange={(e) => {
                  const raw = e.target.value;
                  drafts?.setText('标签指定原行', raw);
                  const items = raw.split(/[,，\s]+/).filter(Boolean);
                  update('sampling', {
                    mode: 'rows',
                    rows: items.length
                      ? items.map((v) => (/^\d+$/.test(v) ? Number(v) : NaN))
                      : [NaN],
                  });
                }}
              />
            )}
            <p className="property-hint">
              标签抽样独立于曲线显示抽样，行号取原始数据行。最多绘制 2000
              个标签。
            </p>
          </>
        )}
        <button
          type="button"
          className="property-link"
          onClick={() => {
            const defaults: Record<string, string> = {
              标签小数位数: '2',
              '标签字号 (pt)': '10',
              标签基线值: '0',
              标签旋转角度: '0',
              标签水平偏移: '0',
              标签垂直偏移: '0',
              '标签与锚点间距 (pt)': '3',
              标签每行字符数: '0',
              标签行距倍数: '1.2',
              '标签引导线宽度 (pt)': '0.5',
              '标签边框宽度 (pt)': '0.5',
              '标签框内边距 (pt)': '2',
              标签抽样值: '2',
              标签指定原行: '1',
            };
            for (const [key, text] of Object.entries(defaults))
              drafts?.setText(key, text);
            onChange(undefined);
          }}
        >
          恢复默认标签
        </button>
      </fieldset>
      {onOverridesChange && (
        <fieldset className="property-group">
          <legend>标签单点覆盖</legend>
          {paused ? (
            <p className="property-hint">
              源数据或绑定已变化，旧标签单点覆盖已暂停。清除后可重新设置。
            </p>
          ) : !source ? (
            <p className="property-hint">
              当前数据缺少完整来源，暂不能设置单点覆盖。
            </p>
          ) : (
            <>
              <PropertyNumber
                label="标签原始行号"
                value={activeRow}
                step={1}
                min={1}
                onChange={(v) => {
                  setActiveRow(v);
                  const selected =
                    overrides?.points.find((p) => p.row === v)?.offset ??
                    offset;
                  drafts?.setText('此行标签水平偏移', String(selected.x));
                  drafts?.setText('此行标签垂直偏移', String(selected.y));
                }}
              />
              {!rowValid ? (
                <p className="property-hint">
                  请选择 1–{rowCount} 范围内的原始行。
                </p>
              ) : (
                <>
                  <PropertyCheck
                    label="覆盖此行标签"
                    checked={!!patch}
                    onChange={(on) =>
                      setPatch(
                        on ? { row: activeRow, visible: true } : undefined,
                      )
                    }
                  />
                  {patch && (
                    <>
                      <PropertyCheck
                        label="此行标签可见"
                        checked={patch.visible !== false}
                        onChange={(visible) => updatePatch({ visible })}
                      />
                      <PropertyInput
                        label="此行标签文字"
                        placeholder="留空表示空标签"
                        value={patch.text ?? ''}
                        onChange={(e) => updatePatch({ text: e.target.value })}
                      />
                      <button
                        type="button"
                        className="property-link"
                        onClick={() => {
                          const next = { ...patch };
                          delete next.text;
                          setPatch(next);
                        }}
                      >
                        恢复此行自动文字
                      </button>
                      <div className="property-grid">
                        <PropertyNumber
                          label="此行标签水平偏移"
                          value={patch.offset?.x ?? offset.x}
                          step="any"
                          min={null}
                          onChange={(x) =>
                            updatePatch({
                              offset: { ...(patch.offset ?? offset), x },
                            })
                          }
                        />
                        <PropertyNumber
                          label="此行标签垂直偏移"
                          value={patch.offset?.y ?? offset.y}
                          step="any"
                          min={null}
                          onChange={(y) =>
                            updatePatch({
                              offset: { ...(patch.offset ?? offset), y },
                            })
                          }
                        />
                        <PropertySelect
                          label="此行标签偏移单位"
                          value={patch.offset?.unit ?? offset.unit}
                          options={{ pt: 'pt', 'font-percent': '字号百分比' }}
                          onChange={(unit) =>
                            updatePatch({
                              offset: { ...(patch.offset ?? offset), unit },
                            })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="property-link"
                        onClick={() => setPatch(undefined)}
                      >
                        恢复此行标签
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          )}
          {!!overrides && (
            <button
              type="button"
              className="property-link"
              onClick={() => {
                resetPatchDrafts();
                onOverridesChange(undefined);
              }}
            >
              清除全部标签覆盖
            </button>
          )}
        </fieldset>
      )}
    </>
  );
}
