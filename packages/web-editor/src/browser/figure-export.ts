const URL_RELEASE_DELAY_MS = 1000;
const IMAGE_LOAD_TIMEOUT_MS = 15000;
const MAX_PNG_EDGE = 8192;
const BASE_PNG_WIDTH = 1000;

export function createSvgBlob(svg: string): Blob {
  if (!svg.trim()) throw new Error('请先生成图形');
  return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
}

export function preparePng(svg: string, scale: number) {
  if (![1, 2, 3].includes(scale)) throw new Error('请选择 1×、2× 或 3× 分辨率');
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = document.documentElement;
  const box = root
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    document.querySelector('parsererror') ||
    root.localName !== 'svg' ||
    !box ||
    box.length !== 4 ||
    !box.every(Number.isFinite) ||
    box[2]! <= 0 ||
    box[3]! <= 0
  )
    throw new Error('图形尺寸无效，无法导出 PNG');
  const width = BASE_PNG_WIDTH * scale;
  const height = Math.round((width * box[3]!) / box[2]!);
  if (width <= 0 || height <= 0 || Math.max(width, height) > MAX_PNG_EDGE)
    throw new Error('PNG 尺寸超出支持范围');
  // 显式设置像素尺寸，避免 SVG 的 mm/in 尺寸导致栅格化比例偏差。
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  return { width, height, svg: new XMLSerializer().serializeToString(root) };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(
      () => finish(new Error('图形加载超时，请重试')),
      IMAGE_LOAD_TIMEOUT_MS,
    );
    const finish = (error?: Error) => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (error) reject(error);
      else resolve(image);
    };
    image.onload = () => finish();
    image.onerror = () => finish(new Error('图形加载失败，无法生成 PNG'));
    image.src = url;
  });
}

function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG 编码失败，请重试'));
    }, 'image/png');
  });
}

export async function createPngBlob(svg: string, scale: number): Promise<Blob> {
  return rasterizePng(preparePng(svg, scale));
}

export async function rasterizePng(output: {
  svg: string;
  width: number;
  height: number;
}): Promise<Blob> {
  const url = URL.createObjectURL(createSvgBlob(output.svg));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = output.width;
    canvas.height = output.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('浏览器无法创建 PNG 画布');
    context.drawImage(image, 0, 0, output.width, output.height);
    return await encodeCanvas(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(
  blob: Blob,
  sourceName: string,
  extension: 'svg' | 'png' | 'pdf' | 'eps' | 'json' | 'zip',
): void {
  const base =
    sourceName
      .replace(/\.[^.]+$/, '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .trim() || 'SZ-Plot';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = `${base}.${extension}`;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // 让浏览器完成下载调度，再释放对象 URL。
    setTimeout(() => URL.revokeObjectURL(url), URL_RELEASE_DELAY_MS);
  }
}
