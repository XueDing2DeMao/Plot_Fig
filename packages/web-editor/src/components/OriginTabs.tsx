import { useId } from 'react';
export type OriginTab = { key: string; label: string; disabled?: boolean };
export function OriginTabs({
  items,
  selected,
  onSelect,
  label,
  id: suppliedId,
}: {
  items: readonly OriginTab[];
  selected: string;
  onSelect: (key: string) => void;
  label: string;
  id?: string;
}) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <div className="origin-tabs" role="tablist" aria-label={label}>
      {items.map((tab, index) => (
        <button
          key={tab.key}
          id={`${id}-${tab.key}`}
          type="button"
          role="tab"
          disabled={tab.disabled}
          tabIndex={selected === tab.key ? 0 : -1}
          aria-selected={selected === tab.key}
          aria-controls={`${id}-panel`}
          onClick={() => onSelect(tab.key)}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
              return;
            event.preventDefault();
            const available = items.filter((item) => !item.disabled);
            const current = available.indexOf(items[index]!);
            const next =
              event.key === 'Home'
                ? available[0]
                : event.key === 'End'
                  ? available.at(-1)
                  : available[
                      (current +
                        (event.key === 'ArrowRight' ? 1 : -1) +
                        available.length) %
                        available.length
                    ];
            if (next) {
              onSelect(next.key);
              document.getElementById(`${id}-${next.key}`)?.focus();
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
export const originAxisTabs: OriginTab[] = [
  { key: 'display', label: '显示' },
  { key: 'scale', label: '刻度' },
  { key: 'labels', label: '刻度线标签' },
  { key: 'title', label: '标题' },
  { key: 'grid', label: '网格' },
  { key: 'ticks', label: '轴线和刻度线' },
  { key: 'advanced-ticks', label: '特殊刻度线' },
  { key: 'references', label: '参照线' },
  { key: 'breaks', label: '断点' },
  { key: 'rug', label: '轴须' },
];
