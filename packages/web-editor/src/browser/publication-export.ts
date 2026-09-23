import { rasterizePng } from './figure-export.js';
const UNITS: Record<string, number> = {
  in: 1,
  mm: 1 / 25.4,
  cm: 1 / 2.54,
  px: 1 / 96,
  pt: 1 / 72,
};
const MAX_EDGE = 16384,
  MAX_PIXELS = 64000000;
function inches(value: string | null) {
  const match = value?.match(/^(\d+(?:\.\d+)?)(in|mm|cm|px|pt)$/);
  if (!match) throw new Error('图形缺少物理尺寸');
  return Number(match[1]) * UNITS[match[2]!]!;
}
export function preparePngDpi(svg: string, dpi: number) {
  if (!Number.isInteger(dpi) || dpi < 72 || dpi > 2400)
    throw new Error('DPI 范围为 72–2400');
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml'),
    root = doc.documentElement;
  if (doc.querySelector('parsererror') || root.localName !== 'svg')
    throw new Error('SVG 无效');
  const width = Math.round(inches(root.getAttribute('width')) * dpi),
    height = Math.round(inches(root.getAttribute('height')) * dpi);
  if (
    width < 1 ||
    height < 1 ||
    Math.max(width, height) > MAX_EDGE ||
    width * height > MAX_PIXELS
  )
    throw new Error('PNG 超出 16384 px 或 64 MP，请降低 DPI');
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  return { width, height, svg: new XMLSerializer().serializeToString(root) };
}
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function pngWithDpi(
  bytes: Uint8Array,
  dpi: number,
): Uint8Array<ArrayBuffer> {
  if (
    bytes.length < 33 ||
    bytes[0] !== 137 ||
    new TextDecoder().decode(bytes.slice(1, 4)) !== 'PNG'
  )
    throw new Error('PNG 编码无效');
  const chunk = new Uint8Array(21),
    view = new DataView(chunk.buffer),
    density = Math.round(dpi / 0.0254);
  view.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  view.setUint32(8, density);
  view.setUint32(12, density);
  chunk[16] = 1;
  view.setUint32(17, crc32(chunk.slice(4, 17)));
  const parts: Uint8Array[] = [bytes.slice(0, 33), chunk];
  let offset = 33;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error('PNG 块被截断');
    const length =
      new DataView(bytes.buffer, bytes.byteOffset + offset).getUint32(0) + 12;
    if (offset + length > bytes.length) throw new Error('PNG 块尺寸无效');
    if (
      new TextDecoder().decode(bytes.slice(offset + 4, offset + 8)) !== 'pHYs'
    )
      parts.push(bytes.slice(offset, offset + length));
    offset += length;
  }
  const output = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  offset = 0;
  for (const p of parts) {
    output.set(p, offset);
    offset += p.length;
  }
  return output;
}
export async function createPublicationPng(svg: string, dpi: number) {
  await document.fonts?.ready;
  const png = await rasterizePng(preparePngDpi(svg, dpi));
  return new Blob([pngWithDpi(new Uint8Array(await png.arrayBuffer()), dpi)], {
    type: 'image/png',
  });
}
