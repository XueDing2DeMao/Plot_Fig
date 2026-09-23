import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  canPasteLayerFormat,
  copyLayerFormat,
  layerFormatOptions,
  pasteLayerFormat,
  type LayerFormatScope,
  type LayerFormatSnapshot,
} from '../state/layer-format.js';
import './layer-format.css';

export function LayerFormatControls({
  template,
  activePanelId,
  onApply,
}: {
  template: FigureTemplate;
  activePanelId: string;
  onApply: (
    template: FigureTemplate,
    snapshot: LayerFormatSnapshot,
    scope: LayerFormatScope,
  ) => boolean | void;
}) {
  const [clipboard, setClipboard] = useState<LayerFormatSnapshot | null>(null);
  const [open, setOpen] = useState<'copy' | 'paste' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const copyButton = useRef<HTMLButtonElement>(null);
  const pasteButton = useRef<HTMLButtonElement>(null);
  const active = template.panels.find(
    (panel) => panel.panelId === activePanelId,
  );
  const activeName =
    active?.name ?? `图层 ${template.panels.indexOf(active!) + 1}`;
  const close = (focus = false) => {
    if (focus)
      (open === 'copy' ? copyButton : pasteButton).current?.focus({
        preventScroll: true,
      });
    setOpen(null);
  };
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = (open === 'copy' ? copyButton : pasteButton).current;
    const popup = menu.current;
    if (!trigger || !popup) return;
    const anchor = trigger.getBoundingClientRect();
    const bounds = popup.getBoundingClientRect();
    setPosition({
      left: Math.max(
        8,
        Math.min(anchor.left, window.innerWidth - bounds.width - 8),
      ),
      top: Math.max(
        8,
        Math.min(anchor.bottom + 6, window.innerHeight - bounds.height - 8),
      ),
    });
    popup
      .querySelector<HTMLButtonElement>('button:not(:disabled)')
      ?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    };
    const scroll = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(null);
    };
    const resize = () => setOpen(null);
    document.addEventListener('mousedown', outside);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', resize);
    };
  }, [open]);
  const choose = (scope: LayerFormatScope) => {
    try {
      const label = layerFormatOptions.find(
        (option) => option.id === scope,
      )!.label;
      if (open === 'copy') {
        setClipboard(copyLayerFormat(template, activePanelId, scope));
        setMessage(`已复制「${activeName}」的${label}`);
      } else if (clipboard) {
        const next = pasteLayerFormat(
          template,
          clipboard,
          activePanelId,
          scope,
        );
        if (onApply(next, clipboard, scope) === false)
          throw new Error('未能粘贴格式，请检查当前设置');
        setMessage(`已粘贴并应用${label}至「${activeName}」`);
      }
      setError(false);
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : '无法复制或粘贴格式');
    }
    close(true);
  };
  return (
    <div className="layer-format-controls" ref={root}>
      <div className="layer-format-buttons" role="group" aria-label="图层格式">
        {(['copy', 'paste'] as const).map((action) => (
          <button
            key={action}
            ref={action === 'copy' ? copyButton : pasteButton}
            type="button"
            aria-label={action === 'copy' ? '复制格式' : '粘贴格式'}
            aria-haspopup="menu"
            aria-expanded={open === action}
            disabled={!active || (action === 'paste' && !clipboard)}
            title={
              action === 'copy'
                ? `从「${activeName}」选择要复制的格式`
                : clipboard
                  ? `选择要粘贴的范围，来源：${clipboard.name}`
                  : '请先从一个图层复制格式'
            }
            onClick={() => setOpen(open === action ? null : action)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setOpen(action);
              }
            }}
          >
            {action === 'copy' ? '复制格式' : '粘贴格式'}{' '}
            <span aria-hidden="true">▾</span>
          </button>
        ))}
      </div>
      {open && (
        <div
          ref={menu}
          role="menu"
          aria-label={open === 'copy' ? '选择复制格式' : '选择粘贴格式'}
          className="layer-format-menu"
          style={position}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              close(true);
              return;
            }
            if (event.key === 'Tab') {
              close(true);
              return;
            }
            const buttons = Array.from(
              menu.current?.querySelectorAll<HTMLButtonElement>(
                '[role="menuitem"]:not(:disabled)',
              ) ?? [],
            );
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? buttons.length - 1
                  : event.key === 'ArrowDown'
                    ? (index + 1) % buttons.length
                    : event.key === 'ArrowUp'
                      ? (index - 1 + buttons.length) % buttons.length
                      : -1;
            if (next >= 0) {
              event.preventDefault();
              buttons[next]?.focus();
            }
          }}
        >
          <p className="layer-format-source">
            {open === 'copy'
              ? `复制自：${activeName}`
              : `粘贴至：${activeName}`}
          </p>
          {open === 'paste' && clipboard && (
            <p className="layer-format-source">
              来源：{clipboard.name} ·{' '}
              {
                layerFormatOptions.find(
                  (option) => option.id === clipboard.scope,
                )!.label
              }
            </p>
          )}
          {layerFormatOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={
                option.id === 'colors' ||
                option.id === 'styles' ||
                option.id === 'all'
                  ? 'layer-format-divider'
                  : undefined
              }
              disabled={
                open === 'paste' &&
                (!clipboard || !canPasteLayerFormat(clipboard, option.id))
              }
              title={
                open === 'paste' &&
                clipboard &&
                !canPasteLayerFormat(clipboard, option.id)
                  ? '尚未复制此范围'
                  : option.detail
              }
              onClick={() => choose(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {message && (
        <span
          className={`layer-format-status${error ? ' is-error' : ''}`}
          role={error ? 'alert' : 'status'}
        >
          {message}
        </span>
      )}
    </div>
  );
}
