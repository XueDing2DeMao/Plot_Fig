import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { originMenuData } from '../state/origin-menu-data.js';
import {
  originResourceCommands,
  originShortcuts,
  type OriginMenuContext,
  type OriginMenuCommand,
  type OriginResourceItem,
  type OriginResourceMenu,
} from '../state/origin-menu-model.js';
import './origin-menu-bar.css';
export type {
  OriginMenuCommand,
  OriginMenuContext,
} from '../state/origin-menu-model.js';

type Props = {
  context: OriginMenuContext;
  onCommand: (command: OriginMenuCommand) => void;
  canExecute?: ((command: OriginMenuCommand) => boolean) | undefined;
  menus?: OriginResourceMenu[];
  appearance?: 'bar' | 'actions';
};
type Anchor = { left: number; top: number; right: number };

function Popup({
  label,
  anchor,
  children,
  submenu = false,
  onScroll,
}: {
  label: string;
  anchor: Anchor;
  children: ReactNode;
  submenu?: boolean;
  onScroll: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(anchor);
  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      ...anchor,
      left: Math.max(
        4,
        anchor.left + rect.width > window.innerWidth
          ? submenu
            ? anchor.right - rect.width
            : window.innerWidth - rect.width - 4
          : anchor.left,
      ),
      top: Math.max(
        4,
        Math.min(anchor.top, window.innerHeight - rect.height - 4),
      ),
    });
  }, [anchor, submenu]);
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      onScroll={onScroll}
      className={`origin-menu-popup${submenu ? ' origin-submenu' : ''}`}
      style={{ left: position.left, top: position.top }}
    >
      {children}
    </div>
  );
}
const focusSoon = (action: () => void) => queueMicrotask(action);
const menuButtons = (menu: Element | null) =>
  menu
    ? Array.from(
        menu.querySelectorAll<HTMLButtonElement>(
          ':scope > .origin-menu-entry > button:not(:disabled)',
        ),
      )
    : [];
const first = (menu: Element | null) => menuButtons(menu)[0]?.focus();

// 原版菜单随窗口切换；并列绘图菜单保留状态，避免聚焦时切换上下文关掉菜单。
export function OriginMenuBar(props: Props) {
  return (
    <MenuBar
      key={props.appearance === 'actions' ? 'actions' : props.context}
      {...props}
    />
  );
}

function MenuBar({
  context,
  onCommand,
  canExecute,
  menus: suppliedMenus,
  appearance = 'bar',
}: Props) {
  const menus = suppliedMenus ?? originMenuData[context];
  const [open, setOpen] = useState<number | null>(null);
  const [path, setPath] = useState('');
  const [anchors, setAnchors] = useState<Record<string, Anchor>>({});
  const ref = useRef<HTMLElement>(null);
  const roots = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = (item: OriginResourceItem) =>
    Boolean(
      item.children?.length ||
      (item.resourceId &&
        originResourceCommands[item.resourceId] &&
        canExecute?.(originResourceCommands[item.resourceId]!) !== false),
    );
  const close = (restore = false) => {
    if (restore && open !== null) roots.current[open]?.focus();
    setOpen(null);
    setPath('');
  };
  const openRoot = (index: number, focus = false) => {
    const button = roots.current[index];
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setAnchors({
      root: { left: rect.left, top: rect.bottom, right: rect.right },
    });
    setOpen(index);
    setPath('');
    if (focus)
      focusSoon(() =>
        first(button.parentElement?.querySelector('[role="menu"]') ?? null),
      );
  };
  const openChild = (
    button: HTMLButtonElement,
    next: string,
    focus = false,
  ) => {
    const rect = button.getBoundingClientRect();
    setAnchors((current) => ({
      ...current,
      [next]: { left: rect.right, top: rect.top, right: rect.left },
    }));
    setPath(next);
    if (focus)
      focusSoon(() =>
        first(button.parentElement?.querySelector('[role="menu"]') ?? null),
      );
  };
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const keyboard = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        document.querySelector(
          'dialog[open], [role="dialog"][aria-modal="true"]',
        ) ||
        (target instanceof Element &&
          target.closest('input, textarea, select, [contenteditable="true"]'))
      )
        return;
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const index = menus.findIndex(
          (menu) => menu.accessKey.toLowerCase() === event.key.toLowerCase(),
        );
        if (index >= 0) {
          event.preventDefault();
          openRoot(index, true);
        }
        return;
      }
      const key = `${event.ctrlKey || event.metaKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.key.length === 1 ? event.key.toLowerCase() : event.key}`;
      const command = !event.altKey && originShortcuts[key];
      if (
        command &&
        canExecute?.(command) !== false &&
        (context === 'graph' || command.startsWith('file.'))
      ) {
        event.preventDefault();
        close();
        onCommand(command);
      }
    };
    const resized = () => close();
    const scrolled = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('.origin-menu-popup')
      )
        return;
      close();
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', keyboard);
    window.addEventListener('resize', resized);
    window.addEventListener('scroll', scrolled, true);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', keyboard);
      window.removeEventListener('resize', resized);
      window.removeEventListener('scroll', scrolled, true);
    };
  });
  const renderItems = (items: OriginResourceItem[], parent = ''): ReactNode =>
    items.map((item, index) => {
      if (item.separator)
        return (
          <div role="separator" className="origin-menu-separator" key={index} />
        );
      const key = `${parent}/${index}`;
      const expanded = path === key || path.startsWith(`${key}/`);
      const children = item.children;
      return (
        <div key={key} className="origin-menu-entry">
          <button
            type="button"
            role="menuitem"
            disabled={!enabled(item)}
            tabIndex={-1}
            aria-haspopup={children ? 'menu' : undefined}
            aria-expanded={children ? expanded : undefined}
            onMouseEnter={(event) => {
              if (children) openChild(event.currentTarget, key);
              else setPath(parent);
            }}
            onClick={(event) => {
              if (children) openChild(event.currentTarget, key, true);
              else {
                const command =
                  item.resourceId && originResourceCommands[item.resourceId];
                if (command) {
                  close(true);
                  onCommand(command);
                }
              }
            }}
            onKeyDown={(event) => {
              const button = event.currentTarget;
              const popup = button.closest('[role="menu"]');
              const siblings = menuButtons(popup);
              const current = siblings.indexOf(button);
              if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? siblings.length - 1
                      : (current +
                          (event.key === 'ArrowDown' ? 1 : -1) +
                          siblings.length) %
                        siblings.length;
                siblings[next]?.focus();
              } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                if (children) openChild(button, key, true);
                else if (!parent && open !== null)
                  openRoot((open + 1) % menus.length, true);
              } else if (event.key === 'ArrowLeft' || event.key === 'Escape') {
                event.preventDefault();
                if (parent) {
                  setPath(parent.slice(0, parent.lastIndexOf('/')));
                  (
                    popup?.previousElementSibling as HTMLButtonElement | null
                  )?.focus();
                } else if (event.key === 'ArrowLeft' && open !== null)
                  openRoot((open - 1 + menus.length) % menus.length, true);
                else close(true);
              } else if (event.key === 'Tab') close();
              else if (
                event.key.length === 1 &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey
              ) {
                const match = siblings.find(
                  (candidate) =>
                    candidate.textContent
                      ?.match(/\(([A-Za-z])\)/)?.[1]
                      ?.toLowerCase() === event.key.toLowerCase(),
                );
                if (match) {
                  event.preventDefault();
                  match.click();
                }
              }
            }}
          >
            <span>{item.label}</span>
            <span className="origin-menu-shortcut">
              {item.resourceId === '36333' ? 'F12' : item.shortcut}
            </span>
            {children && <span aria-hidden="true">›</span>}
          </button>
          {children && expanded && anchors[key] && (
            <Popup
              label={item.label}
              anchor={anchors[key]!}
              onScroll={() => setPath(key)}
              submenu
            >
              {renderItems(children, key)}
            </Popup>
          )}
        </div>
      );
    });
  return (
    <nav
      ref={ref}
      className={
        appearance === 'actions' ? 'figure-action-menus' : 'origin-menu-bar'
      }
      role="menubar"
      aria-orientation="horizontal"
      aria-label={appearance === 'actions' ? '图形管理菜单' : 'Origin 菜单栏'}
    >
      {menus.map((menu, index) => (
        <div className="origin-menu" key={menu.label}>
          <button
            type="button"
            className={
              appearance === 'actions' ? 'property-trigger' : undefined
            }
            ref={(element) => {
              roots.current[index] = element;
            }}
            aria-label={menu.label}
            aria-haspopup="menu"
            aria-expanded={open === index}
            onMouseEnter={() => {
              if (open !== null && open !== index) openRoot(index);
            }}
            onClick={() => (open === index ? close() : openRoot(index))}
            onKeyDown={(event) => {
              if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
                event.preventDefault();
                openRoot(index, true);
              } else if (
                event.key === 'ArrowRight' ||
                event.key === 'ArrowLeft'
              ) {
                event.preventDefault();
                const next =
                  (index +
                    (event.key === 'ArrowRight' ? 1 : -1) +
                    menus.length) %
                  menus.length;
                roots.current[next]?.focus();
                if (open !== null) openRoot(next);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                close(true);
              }
            }}
          >
            {menu.label}
            {appearance === 'actions' ? (
              <span aria-hidden="true"> ▾</span>
            ) : (
              <>
                (<u>{menu.accessKey}</u>)
              </>
            )}
          </button>
          {open === index && anchors.root && (
            <Popup
              label={menu.label}
              anchor={anchors.root}
              onScroll={() => setPath('')}
            >
              {renderItems(menu.items)}
            </Popup>
          )}
        </div>
      ))}
    </nav>
  );
}
