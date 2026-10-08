import { expect, it, vi } from 'vitest';
import { runOriginProcess } from './origin-process.js';

function options(code: string) {
  return {
    command: process.execPath,
    args: ['-e', code],
    signal: new AbortController().signal,
    timeoutMs: 5000,
    cleanup: vi.fn(async () => {}),
    cancel: vi.fn(async () => {}),
  };
}
it('cleans the isolated Origin owner after successful process exit', async () => {
  const o = options('process.exit(0)');
  await expect(runOriginProcess(o)).resolves.toBeUndefined();
  expect(o.cleanup).toHaveBeenCalledOnce();
  expect(o.cancel).not.toHaveBeenCalled();
});
it('returns a failed reader diagnostic and still performs owner cleanup', async () => {
  const o = options('console.error("Origin unavailable");process.exit(2)');
  await expect(runOriginProcess(o)).rejects.toThrow('Origin unavailable');
  expect(o.cleanup).toHaveBeenCalled();
});
it('terminates a hung reader after writing cancellation and cleaning its owner', async () => {
  const o = { ...options('setInterval(()=>{},1000)'), timeoutMs: 150 };
  await expect(runOriginProcess(o)).rejects.toThrow('超时');
  expect(o.cancel).toHaveBeenCalledOnce();
  expect(o.cleanup).toHaveBeenCalled();
});
it('cancels an in-flight reader and rejects rather than delivering a late result', async () => {
  const controller = new AbortController();
  const o = {
    ...options('setInterval(()=>{},1000)'),
    signal: controller.signal,
  };
  const running = runOriginProcess(o);
  controller.abort();
  await expect(running).rejects.toThrow('取消');
  expect(o.cancel).toHaveBeenCalled();
  expect(o.cleanup).toHaveBeenCalled();
});
it('never starts a process for an already cancelled request', async () => {
  const o = { ...options('process.exit(0)'), signal: AbortSignal.abort() };
  await expect(runOriginProcess(o)).rejects.toThrow('取消');
  expect(o.cancel).not.toHaveBeenCalled();
  expect(o.cleanup).not.toHaveBeenCalled();
});
it('surfaces cleanup failures even when conversion itself succeeded', async () => {
  const o = options('process.exit(0)');
  o.cleanup.mockRejectedValue(new Error('无法关闭独立 Origin 实例'));
  await expect(runOriginProcess(o)).rejects.toThrow('无法关闭');
});
