// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createPngBlob,
  createSvgBlob,
  downloadBlob,
  preparePng,
} from './figure-export.js';

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="89mm" height="65mm" viewBox="0 0 1000 800"><text>载荷</text></svg>';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
}

describe('figure export', () => {
  it('keeps wide physical pages proportional at each PNG resolution', () => {
    const wide =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 288"/>';
    expect(preparePng(wide, 2)).toMatchObject({ width: 2000, height: 1333 });
  });
  it('exports the exact SVG with the right MIME type', async () => {
    const blob = createSvgBlob(svg);
    expect(blob.type).toBe('image/svg+xml;charset=utf-8');
    expect(await readBlob(blob)).toBe(svg);
  });

  it('uses viewBox proportions and explicit pixel dimensions for PNG', () => {
    const image = preparePng(svg, 2);
    expect([image.width, image.height]).toEqual([2000, 1600]);
    expect(image.svg).toContain('width="2000"');
    expect(image.svg).toContain('height="1600"');
    expect(image.svg).toContain('载荷');
  });

  it.each([
    '',
    '<div/>',
    '<svg viewBox="0 0 0 800"/>',
    '<svg viewBox="0 0 -10 -20"/>',
    '<svg viewBox="0 0 10 -20"/>',
    '<svg viewBox="0 0 Infinity 800"/>',
  ])('rejects invalid SVG dimensions: %s', (source) => {
    expect(() => preparePng(source, 1)).toThrow();
  });

  it.each([0, -1, 4, NaN, Infinity])(
    'rejects unsupported PNG scale %s',
    (scale) => {
      expect(() => preparePng(svg, scale)).toThrow();
    },
  );

  it('downloads with a cleaned filename and releases the URL after dispatch', () => {
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    let filename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      filename = this.download;
    });
    downloadBlob(createSvgBlob(svg), 'sample.csv', 'svg');
    expect(filename).toBe('sample.svg');
    expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:download');
  });

  it('rejects image decode errors and frees the source URL', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:source');
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    vi.stubGlobal(
      'Image',
      class {
        onerror: (() => void) | null = null;
        set src(_value: string) {
          queueMicrotask(() => this.onerror?.());
        }
      },
    );
    await expect(createPngBlob(svg, 1)).rejects.toThrow(/加载/);
    expect(revoke).toHaveBeenCalledWith('blob:source');
  });

  it('encodes PNG at the requested size and frees resources', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:source');
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      function (this: HTMLCanvasElement, callback, type) {
        expect([this.width, this.height]).toEqual([3000, 2400]);
        callback(new Blob(['png'], { type: type ?? 'image/png' }));
      },
    );
    expect((await createPngBlob(svg, 3)).type).toBe('image/png');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 3000, 2400);
    expect(revoke).toHaveBeenCalledWith('blob:source');
  });
});
