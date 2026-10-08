import { EventEmitter } from 'node:events';
import { expect, it, vi } from 'vitest';
import type { PreviewServer } from 'vite';
import { originNativeImportPlugin } from './origin-plugin.js';

const control = vi.hoisted(() => ({ dispose: vi.fn<() => Promise<void>>() }));
vi.mock('./origin-converter.js', () => ({ convertOriginNative: vi.fn() }));
vi.mock('./origin-service.js', () => ({
  createOriginImportMiddleware: () =>
    Object.assign(vi.fn(), { dispose: control.dispose }),
}));

it('awaits Origin cleanup before allowing the preview server to close', async () => {
  let cleaned = false,
    finish!: () => void;
  control.dispose.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = () => {
          cleaned = true;
          resolve();
        };
      }),
  );
  const originalClose = vi.fn(async () => {
    expect(cleaned).toBe(true);
  });
  const server = {
    middlewares: { use: vi.fn() },
    httpServer: new EventEmitter(),
    close: originalClose,
  } as unknown as PreviewServer;
  const plugin = originNativeImportPlugin();
  const configure = plugin.configurePreviewServer;
  if (typeof configure !== 'function') throw new Error('preview hook');
  configure(server);
  const closing = server.close();
  expect(control.dispose).toHaveBeenCalled();
  expect(originalClose).not.toHaveBeenCalled();
  finish();
  await closing;
  expect(originalClose).toHaveBeenCalledOnce();
});
