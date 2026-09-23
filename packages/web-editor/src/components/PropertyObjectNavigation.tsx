import { useId, useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { PropertyObjectRef } from '../state/property-objects.js';
import { propertyObjectKey } from '../state/property-objects.js';

type Entry = {
  ref: PropertyObjectRef;
  key: string;
  label: string;
  caption: string;
  depth: number;
};

export function PropertyObjectNavigation({
  objects,
  selected,
  onSelect,
  errors,
  label = '属性对象',
}: {
  objects: Entry[];
  selected: PropertyObjectRef;
  onSelect: (ref: PropertyObjectRef) => void;
  errors: Array<{ ref: PropertyObjectRef; message: string }>;
  label?: string;
}) {
  const id = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedKey = propertyObjectKey(selected);
  const invalid = new Set(errors.map((error) => propertyObjectKey(error.ref)));
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const positions: Record<string, number> = {
      ArrowDown: (index + 1) % objects.length,
      ArrowUp: (index - 1 + objects.length) % objects.length,
      Home: 0,
      End: objects.length - 1,
    };
    const next = positions[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSelect(objects[next]!.ref);
    buttons.current[next]?.focus();
  };
  return (
    <nav className="origin-object-nav" aria-label={label}>
      <p className="origin-tree-heading">绘图对象</p>
      <ul>
        {objects.map((object, index) => (
          <li
            key={object.key}
            style={{ '--object-depth': object.depth } as CSSProperties}
          >
            <button
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              aria-label={object.label}
              data-property-key={object.key}
              aria-describedby={`${id}-${index}`}
              aria-current={object.key === selectedKey ? 'true' : undefined}
              onClick={() => onSelect(object.ref)}
              onKeyDown={(event) => onKey(event, index)}
            >
              <span className="origin-node-icon" aria-hidden="true">
                {object.depth < 2 ? '▾' : '•'}
              </span>
              <span>
                <strong>{object.label}</strong>
                <small id={`${id}-${index}`}>
                  {object.caption}
                  {invalid.has(object.key) ? ' · 输入需修正' : ''}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="origin-tree-note">选择对象后，在分类标签中修改其属性。</p>
    </nav>
  );
}
