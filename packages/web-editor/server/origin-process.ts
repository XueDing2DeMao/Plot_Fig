export type OriginProcessOptions = {
  command: string;
  args: string[];
  signal: AbortSignal;
  timeoutMs: number;
  cleanup: () => Promise<void>;
  cancel: () => Promise<void>;
};
export async function runOriginProcess(
  options: OriginProcessOptions,
): Promise<void> {
  if (options.signal.aborted) throw new Error('已取消 Origin 模板导入');
  const child = spawn(options.command, options.args, {
    windowsHide: true,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '',
    stopped: Error | undefined,
    cleanupFailure: unknown;
  let stopping: Promise<void> | undefined;
  child.stdout.resume();
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr = (stderr + chunk).slice(-8192);
  });
  const stop = (reason: Error) => {
    if (stopping) return;
    stopped = reason;
    stopping = (async () => {
      try {
        await options.cancel();
        await options.cleanup();
      } catch (error) {
        cleanupFailure = error;
      } finally {
        child.kill();
      }
    })();
  };
  const abort = () => stop(new Error('已取消 Origin 模板导入'));
  options.signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(
    () => stop(new Error('Origin 模板转换超时，请检查 Origin 是否可正常启动')),
    options.timeoutMs,
  );
  let code: number | null = null,
    processFailure: unknown;
  try {
    code = await new Promise<number | null>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
  } catch (error) {
    processFailure = error;
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener('abort', abort);
  }
  await stopping;
  // 再次核对 owner，覆盖取消期间 COM 构造刚结束的竞态。
  await options.cleanup();
  if (cleanupFailure) throw cleanupFailure;
  if (stopped) throw stopped;
  if (processFailure)
    throw new Error('无法启动 Origin 读取器，请检查本机 Windows PowerShell');
  if (code !== 0)
    throw new Error(stderr.trim() || `Origin 读取器失败（${code}）`);
  if (options.signal.aborted) throw new Error('已取消 Origin 模板导入');
}
import { spawn } from 'node:child_process';
