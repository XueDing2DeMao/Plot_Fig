import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  ORIGIN_NATIVE_ENDPOINT,
  ORIGIN_NATIVE_MAX_BYTES,
  type OriginNativeResult,
} from '../src/templates/origin-native-contract.js';

export type OriginConversion = (
  bytes: Buffer,
  filename: string,
  signal: AbortSignal,
) => Promise<OriginNativeResult>;

class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function localRequest(req: IncomingMessage): boolean {
  const ip = req.socket.remoteAddress;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip ?? ''))
    return false;
  try {
    const host = req.headers.host ?? '';
    const scheme =
      'encrypted' in req.socket && req.socket.encrypted ? 'https' : 'http';
    const url = new URL(`${scheme}://${host}`);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
      return false;
    if (url.username || url.password || url.host !== host.toLowerCase())
      return false;
    if (req.method === 'GET' && !req.headers.origin) return true;
    return req.headers.origin === url.origin;
  } catch {
    return false;
  }
}

function filenameFrom(req: IncomingMessage): string {
  try {
    const header = req.headers['x-plot-fig-filename'];
    if (typeof header !== 'string' || header.length > 1800) throw new Error();
    const name = decodeURIComponent(header);
    if (
      !/\.otpu?$/i.test(name) ||
      /[\\/\x00-\x1f\x7f]/.test(name) ||
      name.length > 240 ||
      name.startsWith('.')
    )
      throw new Error();
    return name;
  } catch {
    throw new RequestError(400, '请选择有效的 Origin .otp / .otpu 文件');
  }
}

function readInput(req: IncomingMessage, signal: AbortSignal): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0,
      rejected = false;
    const timer = setTimeout(
      () => stop(new RequestError(408, '模板上传超时，请重新选择文件')),
      15_000,
    );
    const abort = () => stop(new RequestError(499, '已取消导入'));
    const stop = (error: Error) => {
      if (rejected) return;
      rejected = true;
      chunks.length = 0;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(error);
    };
    req.on('data', (chunk: Buffer) => {
      if (rejected) return;
      size += chunk.length;
      if (size > ORIGIN_NATIVE_MAX_BYTES)
        stop(new RequestError(413, '原生模板超过 16 MiB'));
      else chunks.push(chunk);
    });
    req.on('end', () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      if (!rejected) resolve(Buffer.concat(chunks));
    });
    req.on('error', (error) => stop(error));
    req.on('aborted', () => stop(new RequestError(499, '已取消导入')));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

function reply(res: ServerResponse, status: number, value: unknown) {
  if (res.destroyed || res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(value));
}

export function createOriginImportMiddleware(options: {
  convert: OriginConversion;
  available: boolean;
}) {
  let busy = false,
    closed = false;
  let running: Promise<void> | undefined, active: AbortController | undefined;
  const handler = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    if (req.url?.split('?')[0] !== ORIGIN_NATIVE_ENDPOINT) return next();
    if (closed) return reply(res, 503, { error: '本机导入接口已关闭' });
    if (!localRequest(req))
      return reply(res, 403, { error: '原生模板导入仅接受本机同源请求' });
    if (req.method === 'GET')
      return reply(res, 200, {
        available: options.available,
        ...(!options.available
          ? {
              reason: '原生模板导入需要在安装 Origin 的 Windows 本机运行编辑器',
            }
          : {}),
      });
    if (req.method !== 'POST')
      return reply(res, 405, { error: '不支持此请求方法' });
    if (req.headers['x-plot-fig-origin-import'] !== '1')
      return reply(res, 403, { error: '缺少导入请求标识' });
    if (!options.available)
      return reply(res, 503, {
        error: '原生模板导入需要 Windows 与本机 Origin',
      });
    if (
      req.headers['content-type']?.split(';')[0]?.trim() !==
      'application/octet-stream'
    )
      return reply(res, 415, { error: '请上传原生模板文件' });
    if (busy)
      return reply(res, 409, {
        error: '另一个 Origin 模板正在转换，请稍后重试',
      });
    let filename: string;
    try {
      filename = filenameFrom(req);
    } catch (error) {
      return reply(res, 400, { error: (error as Error).message });
    }
    if (Number(req.headers['content-length']) > ORIGIN_NATIVE_MAX_BYTES)
      return reply(res, 413, { error: '原生模板超过 16 MiB' });
    busy = true;
    const controller = new AbortController();
    active = controller;
    res.once('close', () => {
      if (!res.writableEnded) controller.abort();
    });
    running = (async () => {
      try {
        const bytes = await readInput(req, controller.signal);
        if (controller.signal.aborted) return;
        const prefix = bytes.subarray(0, 24).toString('ascii');
        if (!/^CPY(?:UA|A)\s/.test(prefix))
          throw new RequestError(
            400,
            '文件不是有效的 Origin 原生模板，不能将 JSON 改后缀导入',
          );
        const result = await options.convert(
          bytes,
          filename,
          controller.signal,
        );
        if (!controller.signal.aborted) reply(res, 200, result);
      } catch (error) {
        reply(res, error instanceof RequestError ? error.status : 422, {
          error:
            error instanceof Error
              ? error.message.slice(0, 800)
              : 'Origin 模板读取失败',
        });
      } finally {
        busy = false;
        active = undefined;
      }
    })();
  };
  return Object.assign(handler, {
    dispose: async () => {
      closed = true;
      active?.abort();
      await running;
    },
  });
}
