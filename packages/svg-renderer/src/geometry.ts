export type Rect = { x: number; y: number; width: number; height: number };

export function panelRect(frame: Rect, viewport: Rect): Rect {
  return {
    x: viewport.x + frame.x * viewport.width,
    y: viewport.y + frame.y * viewport.height,
    width: frame.width * viewport.width,
    height: frame.height * viewport.height,
  };
}

export function formatNumber(value: number): string {
  return Number.isFinite(value) ? Number(value.toFixed(6)).toString() : '0';
}

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
