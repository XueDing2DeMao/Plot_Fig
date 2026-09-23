import { useEffect, useRef, useId } from 'react';

export function SvgSurface({
  svg,
  label = '图形预览',
}: {
  svg: string | undefined;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prefix = 'preview-' + useId().replace(/[^\w-]/g, '');
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.replaceChildren();
    if (!svg) return;
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = document.documentElement;
    if (root.localName !== 'svg' || document.querySelector('parsererror'))
      return;
    root.setAttribute('aria-label', label);
    isolateIds(root, prefix);
    container.append(root.cloneNode(true));
  }, [svg, label, prefix]);
  return <div className="svg-surface" ref={ref} />;
}

function isolateIds(root: Element, prefix: string) {
  const ids = new Map<string, string>();
  for (const element of root.querySelectorAll('[id]')) {
    const id = element.id;
    ids.set(id, prefix + '-' + id);
    element.id = ids.get(id)!;
  }
  for (const element of root.querySelectorAll('*')) {
    for (const attribute of Array.from(element.attributes)) {
      const value = attribute.value.replace(/url\(#([^)]+)\)/g, (match, id) =>
        ids.has(id) ? `url(#${ids.get(id)})` : match,
      );
      if (value !== attribute.value)
        element.setAttribute(attribute.name, value);
    }
  }
}
