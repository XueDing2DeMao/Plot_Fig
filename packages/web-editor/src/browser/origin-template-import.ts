import {
  ORIGIN_NATIVE_ENDPOINT,
  ORIGIN_NATIVE_MAX_BYTES,
  ORIGIN_NATIVE_TIMEOUT_MS,
  type OriginNativeReport,
  type OriginNativeResult,
} from '../templates/origin-native-contract.js';
import { parseLibraryTemplate } from '../templates/library-storage.js';

const UNAVAILABLE =
  '本地 Origin 导入服务不可用。请在 Windows 上安装 Origin，并通过本项目的本地开发或预览服务打开页面；静态网页不支持原生模板转换。';
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const boundedText = (value: unknown, max = 2048): value is string =>
  typeof value === 'string' && value.length <= max;

function readReport(value: unknown): OriginNativeReport {
  if (
    !record(value) ||
    !boundedText(value.originVersion, 128) ||
    !Array.isArray(value.mapped) ||
    value.mapped.length > 1000 ||
    !value.mapped.every((item) => boundedText(item)) ||
    !Array.isArray(value.warnings) ||
    value.warnings.length > 1000 ||
    !value.warnings.every(
      (item) =>
        record(item) &&
        boundedText(item.path, 512) &&
        boundedText(item.message),
    )
  )
    throw new Error('Origin 转换报告无效或超过限制');
  return {
    originVersion: value.originVersion,
    mapped: value.mapped as string[],
    warnings: value.warnings.map((item) => ({
      path: item.path as string,
      message: item.message as string,
    })),
  };
}

async function responseJson(
  response: Response,
  signal: AbortSignal,
): Promise<unknown> {
  if (
    response.status === 404 ||
    response.status === 405 ||
    !response.headers.get('content-type')?.includes('application/json')
  )
    throw new Error(UNAVAILABLE);
  if (Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES)
    throw new Error('Origin 转换响应超过限制');
  const reader = response.body?.getReader();
  let text: string;
  if (reader) {
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let bytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        signal.throwIfAborted();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_RESPONSE_BYTES)
          throw new Error('Origin 转换响应超过限制');
        chunks.push(decoder.decode(value, { stream: true }));
      }
      chunks.push(decoder.decode());
      text = chunks.join('');
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
  } else text = await response.text();
  signal.throwIfAborted();
  if (new TextEncoder().encode(text).length > MAX_RESPONSE_BYTES)
    throw new Error('Origin 转换响应超过限制');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Origin 转换服务返回了损坏的 JSON');
  }
  if (!response.ok)
    throw new Error(
      record(value) && boundedText(value.error)
        ? value.error
        : 'Origin 模板转换失败',
    );
  return value;
}

async function request(
  options: RequestInit,
  signal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ORIGIN_NATIVE_TIMEOUT_MS);
  try {
    controller.signal.throwIfAborted();
    let response: Response;
    try {
      response = await fetch(ORIGIN_NATIVE_ENDPOINT, {
        ...options,
        signal: controller.signal,
        credentials: 'same-origin',
        cache: 'no-store',
      });
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new Error(UNAVAILABLE);
    }
    controller.signal.throwIfAborted();
    return await responseJson(response, controller.signal);
  } catch (error) {
    if (timedOut)
      throw new Error('Origin 模板转换超时，请重试或减少模板复杂度');
    if (signal?.aborted) throw signal.reason;
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export async function checkOriginTemplateImport(
  signal?: AbortSignal,
): Promise<{ available: boolean; reason?: string }> {
  const result = await request({ method: 'GET' }, signal);
  if (
    !record(result) ||
    typeof result.available !== 'boolean' ||
    (result.reason !== undefined && !boundedText(result.reason))
  )
    throw new Error('Origin 导入服务状态无效');
  return {
    available: result.available,
    ...(typeof result.reason === 'string' ? { reason: result.reason } : {}),
  };
}

export async function importOriginTemplate(
  file: File,
  signal?: AbortSignal,
): Promise<OriginNativeResult> {
  if (!/\.(otp|otpu)$/i.test(file.name))
    throw new Error('请选择 Origin OTP 或 OTPU 模板');
  if (!file.size) throw new Error('Origin 模板文件为空');
  if (file.size > ORIGIN_NATIVE_MAX_BYTES)
    throw new Error('Origin 模板文件超过 16 MiB');
  const value = await request(
    {
      method: 'POST',
      body: file,
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-plot-fig-origin-import': '1',
        'x-plot-fig-filename': encodeURIComponent(file.name),
      },
    },
    signal,
  );
  if (!record(value) || !record(value.template))
    throw new Error('Origin 转换结果缺少有效模板');
  const template = parseLibraryTemplate(JSON.stringify(value.template));
  const report = readReport(value.report);
  return { template, report };
}
