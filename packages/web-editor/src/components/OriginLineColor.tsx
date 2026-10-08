import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { FigureSettings } from '../state/figure-settings.js';
import {
  colorShades,
  lineColorLists,
  lineColorMaps,
  originLineColors,
} from '../palettes/origin-line-colors.js';
import './origin-line-color.css';

type Mode = 'solid' | 'point' | 'curve';
type Props = {
  value: FigureSettings;
  onChange: (value: FigureSettings) => void;
  onCurveColors?:
    ((colors: readonly string[], continuous: boolean) => void) | undefined;
  onOpenGroup?: (() => void) | undefined;
};

export function OriginLineColor({
  value,
  onChange,
  onCurveColors,
  onOpenGroup,
}: Props) {
  const mapping = value.plot.kind === 'xy' ? value.plot.lineMapping : undefined;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(mapping ? 'point' : 'solid');
  const [colors, setColors] = useState<readonly string[]>(
    mapping?.colors ?? originLineColors,
  );
  const [continuous, setContinuous] = useState(mapping?.mode === 'continuous');
  const [hex, setHex] = useState(value.line.color);
  const [position, setPosition] = useState({ left: 0, top: 0, maxHeight: 440 });
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => setHex(value.line.color), [value.line.color]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  useLayoutEffect(() => {
    if (!open) return;
    popup.current?.showPopover?.();
    popup.current
      ?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
      ?.focus();
    const dismiss = (event: PointerEvent) => {
      if (
        !popup.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  const solid = (color: string) => {
    const plot = { ...value.plot };
    if (plot.kind === 'xy') delete plot.lineMapping;
    onChange({ ...value, plot, line: { ...value.line, color } });
  };
  const choosePalette = (
    next: readonly string[],
    nextContinuous = continuous,
  ) => {
    setColors(next);
    setContinuous(nextContinuous);
    if (mode !== 'point' || value.plot.kind !== 'xy') return;
    onChange({
      ...value,
      plot: {
        ...value.plot,
        lineMapping: {
          ...(mapping ?? { mode: 'increment' as const }),
          colors: [...next],
        },
      },
    });
    close();
  };
  const selectedList = lineColorLists.find(
    (list) =>
      list.colors.length === colors.length &&
      list.colors.every(
        (color, i) => color.toLowerCase() === colors[i]?.toLowerCase(),
      ),
  );
  const openPanel = () => {
    if (open) {
      close();
      return;
    }
    const rect = trigger.current!.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const top =
      below >= 400 || rect.top < 410
        ? Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 410))
        : rect.top - 404;
    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 472)),
      top,
      maxHeight: window.innerHeight - top - 12,
    });
    if (mapping) {
      setMode('point');
      setColors(mapping.colors);
    }
    setOpen(true);
  };
  const swatches = (row: readonly string[], label: string) => (
    <div
      className="origin-color-swatches"
      role="group"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
    >
      {row.map((color, index) => (
        <button
          key={index}
          type="button"
          title={color}
          aria-label={`颜色 ${color.toLowerCase()}`}
          aria-pressed={
            !mapping && value.line.color.toLowerCase() === color.toLowerCase()
          }
          style={{ backgroundColor: color }}
          onClick={() => {
            solid(color.toLowerCase());
            close();
          }}
        />
      ))}
    </div>
  );
  return (
    <div className="origin-line-color">
      <span id={`${id}-label`}>线条颜色</span>
      <div className="origin-color-control">
        <button
          ref={trigger}
          type="button"
          aria-label="打开线条颜色面板"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={openPanel}
        >
          <span
            className="origin-color-sample"
            aria-hidden="true"
            style={{
              background: mapping
                ? `linear-gradient(to right, ${mapping.colors.join(', ')})`
                : value.line.color,
            }}
          />
          <span>{mapping ? '按点' : '单色'}</span>
          <span aria-hidden="true">▾</span>
        </button>
        <input
          aria-label="线条颜色"
          title="输入十六进制颜色，如 #2070d4"
          value={hex}
          maxLength={7}
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value;
            setHex(next);
            if (/^#[\da-f]{6}$/i.test(next)) solid(next);
          }}
          onBlur={() => setHex(value.line.color)}
        />
      </div>
      {open && (
        <div
          ref={popup}
          id={id}
          popover="auto"
          role="dialog"
          aria-label="线条颜色面板"
          className="origin-color-popup"
          style={position}
          onToggle={(event) => {
            if (event.newState === 'closed') setOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
          }}
        >
          <div
            role="tablist"
            aria-label="颜色方式"
            className="origin-color-tabs"
          >
            {(
              [
                ['solid', '单色'],
                ['point', '按点'],
                ['curve', '按曲线'],
              ] as const
            ).map(([key, label], index) => (
              <button
                key={key}
                id={`${id}-${key}`}
                type="button"
                role="tab"
                aria-selected={mode === key}
                aria-controls={`${id}-panel`}
                disabled={
                  key === 'point'
                    ? value.plot.kind !== 'xy'
                    : key === 'curve' && !onCurveColors
                }
                tabIndex={mode === key ? 0 : -1}
                onClick={() => setMode(key)}
                onKeyDown={(event) => {
                  if (
                    !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const tabs = Array.from(
                    event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                      'button',
                    ),
                  );
                  let next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? 2
                        : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                  while (tabs[next]!.disabled)
                    next =
                      (next +
                        (event.key === 'ArrowLeft' || event.key === 'End'
                          ? 2
                          : 1)) %
                      3;
                  tabs[next]!.click();
                  tabs[next]!.focus();
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`${id}-panel`}
            aria-labelledby={`${id}-${mode}`}
            className="origin-color-content"
          >
            <label className="origin-color-list-label">
              增量列表：
              <select
                aria-label="增量列表"
                value={selectedList?.id ?? ''}
                onChange={(event) => {
                  const list = lineColorLists.find(
                    (item) => item.id === event.target.value,
                  );
                  if (list) choosePalette(list.colors, list.continuous);
                }}
              >
                <option value="" disabled>
                  当前 / 自定义
                </option>
                {lineColorLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </label>
            {mode === 'solid' ? (
              <>
                {swatches(colors, '常用颜色')}
                <div className="origin-color-shades">
                  {colorShades(colors).map((row, i) => (
                    <div key={i}>{swatches(row, `色阶 ${i + 1}`)}</div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="origin-color-palette-strip"
                  aria-label="使用当前递增色列"
                  onClick={() => choosePalette(colors)}
                >
                  {colors.map((color, i) => (
                    <i key={i} style={{ background: color }} />
                  ))}
                </button>
                <div className="origin-color-shades">
                  {colorShades(colors).map((row, i) => (
                    <button
                      key={i}
                      type="button"
                      className="origin-color-palette-strip"
                      aria-label={`使用色阶 ${i + 1}`}
                      onClick={() => choosePalette(row)}
                    >
                      {row.map((color, index) => (
                        <i key={index} style={{ background: color }} />
                      ))}
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="origin-color-section-label">调色板</p>
            <div className="origin-color-maps">
              {lineColorMaps.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  aria-label={`调色板 ${map.name}`}
                  title={map.name}
                  onClick={() => choosePalette(map.colors, true)}
                  style={{
                    background: `linear-gradient(to right, ${map.colors.join(', ')})`,
                  }}
                />
              ))}
            </div>
            {mode === 'solid' && (
              <label className="origin-color-custom">
                自定义颜色
                <input
                  type="color"
                  aria-label="自定义线条颜色"
                  value={value.line.color}
                  onChange={(event) => solid(event.target.value)}
                />
              </label>
            )}
            {mode === 'point' && (
              <p className="origin-color-help">
                {mapping?.mode === 'continuous'
                  ? '当前按数据列数值映射，选择色带会保留映射来源和范围。'
                  : mapping?.mode === 'categorical'
                    ? '当前按数据分类着色，选择色列会保留分类来源。'
                    : '按数据点顺序循环使用色列，每段采用起点颜色。'}{' '}
                按数据列映射可在下方“线条颜色映射”中设置。
              </p>
            )}
            {mode === 'curve' && (
              <>
                <p className="origin-color-help">
                  {continuous
                    ? '按当前图层的曲线顺序连续渐变，首尾曲线对应色带两端。已有曲线组的颜色映射会改为全图层曲线顺序，隐藏曲线保留颜色位置。'
                    : '按当前图层的曲线顺序循环配色，每条曲线使用一种颜色。已有曲线组会切换为该色列，分别按组顺序递增。'}
                </p>
                <button
                  type="button"
                  className="origin-color-apply"
                  onClick={() => {
                    onCurveColors?.(colors, continuous);
                    close();
                  }}
                >
                  应用色列到当前图层
                </button>
                {onOpenGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onOpenGroup();
                    }}
                  >
                    组与数值映射…
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
