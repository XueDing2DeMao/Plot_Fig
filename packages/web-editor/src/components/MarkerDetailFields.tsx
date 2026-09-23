import { useContext } from 'react';
import type { MarkerDetails } from '@plot-fig/figure-schema';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertyNumberDraftContext,
  PropertySelect,
} from './PropertyInputs.js';
const labels = [
  '固定数据尺寸',
  '边框半径百分比',
  '重复点间距 (pt)',
  '图例符号尺寸 (pt)',
  '图例原始行号',
];
export function MarkerDetailFields({
  value,
  onChange,
  followLineOpacity = false,
  properties = [
    'fixedSize',
    'fillOnlyOpacity',
    'strokeRadiusPct',
    'character',
    'overlap',
    'legend',
  ],
}: {
  value: MarkerDetails;
  onChange: (next: MarkerDetails) => void;
  followLineOpacity?: boolean;
  properties?: (keyof MarkerDetails)[];
}) {
  const drafts = useContext(PropertyNumberDraftContext);
  const update = <K extends keyof MarkerDetails>(
    key: K,
    next: MarkerDetails[K],
  ) => {
    const v = { ...value };
    if (next === undefined) delete v[key];
    else v[key] = next;
    onChange(v);
  };
  const c = value.character,
    o = value.overlap,
    l = value.legend;
  return (
    <fieldset className="property-group">
      <legend>符号细节</legend>
      {properties.includes('fixedSize') && (
        <>
          <PropertyCheck
            label="按数据单位固定尺寸"
            checked={!!value.fixedSize}
            onChange={(on) => {
              drafts?.setText('固定数据尺寸', '0.5');
              update(
                'fixedSize',
                on ? { value: 0.5, unit: 'x-data' } : undefined,
              );
            }}
          />
          {value.fixedSize && (
            <div className="property-grid">
              <PropertyNumber
                label="固定数据尺寸"
                value={value.fixedSize.value}
                step="any"
                onChange={(v) =>
                  update('fixedSize', { ...value.fixedSize!, value: v })
                }
              />
              <PropertySelect
                label="固定尺寸单位"
                value={value.fixedSize.unit}
                options={{ 'x-data': 'X 数据单位', 'y-data': 'Y 数据单位' }}
                onChange={(unit) =>
                  update('fixedSize', { ...value.fixedSize!, unit })
                }
              />
            </div>
          )}
          <p className="property-hint">
            数据尺寸随绑定坐标轴缩放。大小映射和单点尺寸优先；缺失映射值使用固定尺寸。
          </p>
        </>
      )}
      {properties.includes('fillOnlyOpacity') && (
        <>
          <PropertyCheck
            label="仅填充使用符号透明度"
            checked={!!value.fillOnlyOpacity}
            onChange={(v) => update('fillOnlyOpacity', v || undefined)}
          />
          {followLineOpacity && (
            <p className="property-hint">
              正在跟随线条透明度，透明度作用于整个符号；关闭跟随后，恢复仅填充设置。
            </p>
          )}
        </>
      )}
      {properties.includes('strokeRadiusPct') && (
        <>
          <PropertyCheck
            label="边框按符号半径缩放"
            checked={value.strokeRadiusPct !== undefined}
            onChange={(on) => {
              drafts?.setText('边框半径百分比', '10');
              update('strokeRadiusPct', on ? 10 : undefined);
            }}
          />
          {value.strokeRadiusPct !== undefined && (
            <>
              <PropertyNumber
                label="边框半径百分比"
                value={value.strokeRadiusPct}
                step="any"
                onChange={(v) => update('strokeRadiusPct', v)}
              />
              <p className="property-hint">
                范围 0–100%。0
                表示使用最小可见符号换算的统一边框宽度；单点边框设置优先。
              </p>
            </>
          )}
        </>
      )}
      {properties.includes('character') && (
        <>
          <PropertyCheck
            label="使用字符符号"
            checked={!!c}
            onChange={(on) =>
              update(
                'character',
                on
                  ? {
                      mode: 'constant',
                      text: 'A',
                      fontFamily: 'Arial',
                      outline: 'none',
                    }
                  : undefined,
              )
            }
          />
          {c && (
            <>
              <PropertySelect
                label="字符构造方式"
                value={c.mode}
                options={{
                  constant: '固定字符',
                  sequence: '循环字符序列',
                  'row-number': '原始数据行号',
                }}
                onChange={(mode) => {
                  const common = {
                    fontFamily: c.fontFamily,
                    outline: c.outline,
                  };
                  update(
                    'character',
                    mode === 'constant'
                      ? { ...common, mode, text: 'A' }
                      : mode === 'sequence'
                        ? { ...common, mode, alphabet: 'ABC' }
                        : { ...common, mode },
                  );
                }}
              />
              {c.mode === 'constant' && (
                <PropertyInput
                  label="固定符号字符"
                  value={c.text}
                  onChange={(e) =>
                    update('character', { ...c, text: e.target.value })
                  }
                />
              )}
              {c.mode === 'sequence' && (
                <PropertyInput
                  label="循环字符序列"
                  value={c.alphabet}
                  onChange={(e) =>
                    update('character', { ...c, alphabet: e.target.value })
                  }
                />
              )}
              <PropertyInput
                label="符号字体"
                value={c.fontFamily}
                onChange={(e) =>
                  update('character', { ...c, fontFamily: e.target.value })
                }
              />
              <PropertySelect
                label="字符轮廓"
                value={c.outline}
                options={{ none: '无', box: '方框', circle: '圆框' }}
                onChange={(outline) => update('character', { ...c, outline })}
              />
              <p className="property-hint">
                字符和行号对应完整数据区原行；单点形状设置优先。使用本机字体，未安装时由浏览器回退。
              </p>
            </>
          )}
        </>
      )}
      {properties.includes('overlap') && (
        <>
          <PropertyCheck
            label="展开重合数据点"
            checked={!!o}
            onChange={(on) => {
              drafts?.setText('重复点间距 (pt)', '2');
              update(
                'overlap',
                on
                  ? { direction: 'horizontal', gapPt: 2, center: true }
                  : undefined,
              );
            }}
          />
          {o && (
            <>
              <div className="property-grid">
                <PropertySelect
                  label="重复点展开方向"
                  value={o.direction}
                  options={{ horizontal: '水平', vertical: '垂直' }}
                  onChange={(direction) =>
                    update('overlap', { ...o, direction })
                  }
                />
                <PropertyNumber
                  label="重复点间距 (pt)"
                  value={o.gapPt}
                  step="any"
                  onChange={(gapPt) => update('overlap', { ...o, gapPt })}
                />
              </div>
              <PropertyCheck
                label="标出真实位置"
                checked={o.center}
                onChange={(center) => update('overlap', { ...o, center })}
              />
              <p className="property-hint">
                只展开 X、Y
                完全相同的符号。连线、误差棒和坐标轴范围仍依据真实数据。
              </p>
            </>
          )}
        </>
      )}
      {properties.includes('legend') && (
        <>
          <PropertyCheck
            label="显示映射图例样本"
            checked={!!l}
            onChange={(on) => {
              drafts?.setText('图例原始行号', '1');
              drafts?.setText('图例符号尺寸 (pt)', '10');
              update('legend', on ? { rows: [1], sizePt: 10 } : undefined);
            }}
          />
          {l && (
            <>
              <PropertyInput
                label="图例原始行号"
                value={drafts?.texts['图例原始行号'] ?? l.rows.join(', ')}
                onChange={(e) => {
                  const raw = e.target.value;
                  drafts?.setText('图例原始行号', raw);
                  update('legend', {
                    ...l,
                    rows: raw
                      .split(/[,，]/)
                      .map((v) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN)),
                  });
                }}
              />
              <PropertyNumber
                label="图例符号尺寸 (pt)"
                value={l.sizePt}
                step="any"
                onChange={(sizePt) => update('legend', { ...l, sizePt })}
              />
              <p className="property-hint">
                填入 1–8
                个不同原行号，用逗号分隔。图例显示相应颜色、形状和映射值，符号尺寸统一为
                4–36 pt。
              </p>
            </>
          )}
        </>
      )}
      <button
        type="button"
        onClick={() => {
          labels.forEach((l) => drafts?.setText(l, ''));
          const next = { ...value };
          for (const key of properties) delete next[key];
          onChange(next);
        }}
      >
        恢复符号细节默认值
      </button>
    </fieldset>
  );
}
