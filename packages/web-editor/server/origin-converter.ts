import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  ORIGIN_NATIVE_MAX_BYTES,
  ORIGIN_NATIVE_TIMEOUT_MS,
} from '../src/templates/origin-native-contract.js';
import { mapOriginNative } from './origin-map.js';
import { runOriginProcess } from './origin-process.js';
import type { OriginConversion } from './origin-service.js';

const executeFile = promisify(execFile);
const readerScript = fileURLToPath(
  new URL('./origin-reader.ps1', import.meta.url),
);
const readerArgs = [
  '-NoLogo',
  '-NoProfile',
  '-NonInteractive',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  readerScript,
];

export const convertOriginNative: OriginConversion = async (
  bytes,
  filename,
  signal,
) => {
  if (process.platform !== 'win32')
    throw new Error('原生模板导入需要 Windows 与本机 Origin');
  if (signal.aborted) throw new Error('已取消 Origin 模板导入');
  if (!bytes.length || bytes.length > ORIGIN_NATIVE_MAX_BYTES)
    throw new Error('原生模板文件为空或超过 16 MiB');
  if (!/\.otpu?$/i.test(filename) || basename(filename) !== filename)
    throw new Error('模板文件名无效');
  const temporaryRoot = resolve(tmpdir());
  const directory = await mkdtemp(join(temporaryRoot, 'plot-fig-origin-'));
  const input = join(
    directory,
    /\.otpu$/i.test(filename) ? 'input.otpu' : 'input.otp',
  );
  const output = join(directory, 'snapshot.json');
  const owner = join(directory, 'owner.json');
  const cancelled = join(directory, 'cancelled');
  const powershell = join(
    process.env.SystemRoot ?? 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe',
  );
  let cleanupFailed = false;
  const cleanup = async () => {
    try {
      await executeFile(
        powershell,
        [...readerArgs, '-CleanupOwnerPath', owner],
        {
          windowsHide: true,
          timeout: 12_000,
          maxBuffer: 64 * 1024,
        },
      );
    } catch {
      cleanupFailed = true;
      throw new Error(
        '无法确认独立 Origin 实例已关闭，请关闭本次导入实例后再重试',
      );
    }
  };
  try {
    await writeFile(input, bytes);
    await runOriginProcess({
      command: powershell,
      args: [
        ...readerArgs,
        '-InputPath',
        input,
        '-OutputPath',
        output,
        '-OwnerPath',
        owner,
        '-CancelPath',
        cancelled,
      ],
      signal,
      timeoutMs: ORIGIN_NATIVE_TIMEOUT_MS,
      cleanup,
      cancel: () => writeFile(cancelled, 'cancelled'),
    });
    if ((await stat(output)).size > 8 * 1024 * 1024)
      throw new Error('模板格式信息超过转换上限，请简化图层或曲线数量');
    const snapshot: unknown = JSON.parse(
      (await readFile(output, 'utf8')).replace(/^\uFEFF/, ''),
    );
    const result = mapOriginNative(
      snapshot,
      filename,
      createHash('sha256').update(bytes).digest('hex'),
    );
    if (Buffer.byteLength(JSON.stringify(result.template)) > 2 * 1024 * 1024)
      throw new Error('转换后的模板超过模板库 2 MiB 上限');
    if (signal.aborted) throw new Error('已取消 Origin 模板导入');
    return result;
  } finally {
    // 只移除本次 mkdtemp 创建且位于系统临时目录直属层的目录。
    if (
      !cleanupFailed &&
      dirname(resolve(directory)) === temporaryRoot &&
      basename(directory).startsWith('plot-fig-origin-')
    ) {
      await rm(directory, { recursive: true, force: true });
    }
  }
};
