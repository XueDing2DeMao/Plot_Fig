import { useEffect, useRef, useId } from 'react';

export function SvgSurface({
  svg,
  label = '图形预览',
  panelId,
}: {
  svg: string | undefined;
  label?: string;
  panelId?: string | undefined;
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
    if (panelId !== undefined) showOnlyPanel(root, panelId);
    isolateIds(root, prefix);
    container.append(root.cloneNode(true));
  }, [svg, label, prefix, panelId]);
  return <div className="svg-surface" ref={ref} />;
}

/** 只筛选显示节点；完整图形仍参与共享轴计算、校验和应用。 */
function showOnlyPanel(root: Element, panelId: string) {
  for (const panel of root.querySelectorAll('[data-role="panel"]')) {
    if (panel.getAttribute('data-panel-id') !== panelId) panel.remove();
  }
  const plots = new Set(
    Array.from(
      root.querySelectorAll('[data-role="panel"] [data-role="plot-slot"]'),
      (plot) => plot.getAttribute('data-plot-slot-id'),
    ),
  );
  for (const entry of root.querySelectorAll('[data-role="legend-entry"]')) {
    if (!plots.has(entry.getAttribute('data-plot-slot-id'))) entry.remove();
  }
  for (const legend of root.querySelectorAll('[data-role="legend"]')) {
    if (!legend.querySelector('[data-role="legend-entry"]')) legend.remove();
  }
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
