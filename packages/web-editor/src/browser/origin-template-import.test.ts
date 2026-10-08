import { afterEach, expect, it, vi } from 'vitest';
import { defaultTemplate } from '../state/default-template.js';
import {
  ORIGIN_NATIVE_ENDPOINT,
  ORIGIN_NATIVE_MAX_BYTES,
  ORIGIN_NATIVE_TIMEOUT_MS,
} from '../templates/origin-native-contract.js';
import {
  checkOriginTemplateImport,
  importOriginTemplate,
} from './origin-template-import.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const file = () => new File(['origin binary'], '光谱.OTPU');
const output = () => ({
  template: defaultTemplate(),
  report: {
    originVersion: '2025b',
    mapped: ['页面尺寸'],
    warnings: [{ path: '/layers/0', message: '忽略脚本' }],
  },
});
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });

it('uploads the original file to the same-origin converter and validates its output', async () => {
  const fetcher = vi.fn().mockResolvedValue(json(output()));
  vi.stubGlobal('fetch', fetcher);
  const input = file();
  expect(await importOriginTemplate(input)).toEqual(output());
  expect(fetcher).toHaveBeenCalledWith(
    ORIGIN_NATIVE_ENDPOINT,
    expect.objectContaining({
      method: 'POST',
      body: input,
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-plot-fig-origin-import': '1',
        'x-plot-fig-filename': encodeURIComponent(input.name),
      },
    }),
  );
});
it('checks availability only on explicit request', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      json({ available: false, reason: '需要 Windows 上安装 Origin' }),
    );
  vi.stubGlobal('fetch', fetcher);
  expect(await checkOriginTemplateImport()).toEqual({
    available: false,
    reason: '需要 Windows 上安装 Origin',
  });
  expect(fetcher).toHaveBeenCalledWith(
    ORIGIN_NATIVE_ENDPOINT,
    expect.objectContaining({ method: 'GET' }),
  );
});
it.each([
  new File(['x'], 'bad.json'),
  new File([], 'empty.otp'),
  new File([new Uint8Array(ORIGIN_NATIVE_MAX_BYTES + 1)], 'large.otp'),
])('rejects invalid input without a request: $name', async (input) => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  await expect(importOriginTemplate(input)).rejects.toThrow(/OTP|空|16 MiB/);
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([
  { template: {}, report: output().report },
  {
    ...output(),
    report: { ...output().report, warnings: [{ path: '/a', message: 2 }] },
  },
  {
    ...output(),
    report: { ...output().report, mapped: Array(1001).fill('x') },
  },
])('rejects malformed conversion output', async (value) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(value)));
  await expect(importOriginTemplate(file())).rejects.toThrow(/模板|报告/);
});
it('enforces the existing 2 MiB template limit before accepting a conversion', async () => {
  const value = output();
  value.template.metadata.description = 'x'.repeat(2 * 1024 * 1024);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(value)));
  await expect(importOriginTemplate(file())).rejects.toThrow(
    '模板文件超过 2 MiB',
  );
});
it.each([
  new Response('<html>static page</html>', {
    headers: { 'content-type': 'text/html' },
  }),
  new Response('', { status: 404 }),
])(
  'explains unavailable local services instead of parsing HTML as a template',
  async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(importOriginTemplate(file())).rejects.toThrow(/本地|静态/);
  },
);
it('shows a bounded server error', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(json({ error: 'Origin 未安装' }, 503)),
  );
  await expect(importOriginTemplate(file())).rejects.toThrow('Origin 未安装');
});
it('aborts cancellation and rejects a response that arrives after cancellation', async () => {
  let resolve!: (value: Response) => void;
  const fetcher = vi.fn((_url: string, options: RequestInit) => {
    expect(options.signal).toBeDefined();
    return new Promise<Response>((r) => {
      resolve = r;
    });
  });
  vi.stubGlobal('fetch', fetcher);
  const controller = new AbortController();
  const pending = importOriginTemplate(file(), controller.signal);
  controller.abort();
  resolve(json(output()));
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetcher.mock.calls[0]![1].signal?.aborted).toBe(true);
});
it('times out an unresponsive converter', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) =>
          options.signal!.addEventListener('abort', () =>
            reject(options.signal!.reason),
          ),
        ),
    ),
  );
  const pending = expect(importOriginTemplate(file())).rejects.toThrow(/超时/);
  await vi.advanceTimersByTimeAsync(ORIGIN_NATIVE_TIMEOUT_MS);
  await pending;
});
