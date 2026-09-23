import { expect, it } from 'vitest';
import { runInkscape, convertFigure } from './converter.js';
it('checks physical raster area before starting the converter', async () => {
  await expect(
    convertFigure(
      {
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="100in" height="100in" viewBox="0 0 10 10"><rect width="10" height="10" opacity="0.5"/></svg>',
        format: 'eps',
        dpi: 600,
        textToPath: false,
        flattenTransparency: true,
      },
      { executable: 'nonexistent-converter' },
    ),
  ).rejects.toThrow('120 MP');
});
it('aborts the owned conversion process promptly', async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50);
  try {
    await expect(
      runInkscape(
        process.execPath,
        ['-e', 'setInterval(()=>{},1000)'],
        controller.signal,
      ),
    ).rejects.toThrow('取消');
  } finally {
    clearTimeout(timer);
  }
});
