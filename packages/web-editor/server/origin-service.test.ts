import { createServer, request, type Server } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';
import { defaultTemplate } from '../src/state/default-template.js';
import {
  ORIGIN_NATIVE_ENDPOINT as endpoint,
  ORIGIN_NATIVE_MAX_BYTES,
} from '../src/templates/origin-native-contract.js';
import {
  createOriginImportMiddleware,
  type OriginConversion,
} from './origin-service.js';

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
});

async function start(
  convert: OriginConversion = vi.fn(async () => ({
    template: defaultTemplate(),
    report: { originVersion: '10.25', mapped: ['页面'], warnings: [] },
  })),
  available = true,
) {
  const handler = createOriginImportMiddleware({ convert, available });
  const server = createServer((req, res) =>
    handler(req, res, () => {
      res.statusCode = 404;
      res.end('next');
    }),
  );
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('address');
  const origin = `http://127.0.0.1:${address.port}`;
  return {
    convert,
    origin,
    send: (
      options: {
        method?: string;
        path?: string;
        headers?: Record<string, string>;
        body?: string | Buffer;
      } = {},
    ) =>
      new Promise<{
        status: number;
        body: string;
        headers: Record<string, unknown>;
      }>((resolve, reject) => {
        const req = request(
          origin + (options.path ?? endpoint),
          {
            method: options.method ?? 'POST',
            headers: {
              origin,
              'content-type': 'application/octet-stream',
              'x-plot-fig-origin-import': '1',
              'x-plot-fig-filename': encodeURIComponent('中文模板.otpu'),
              ...options.headers,
            },
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () =>
              resolve({
                status: res.statusCode!,
                body: Buffer.concat(chunks).toString(),
                headers: res.headers,
              }),
            );
          },
        );
        req.on('error', reject);
        req.end(
          options.method === 'GET'
            ? undefined
            : (options.body ?? 'CPYUA 4.3747 200\nfixture'),
        );
      }),
  };
}

it('passes native bytes and a decoded basename to the converter', async () => {
  const service = await start();
  const result = await service.send();
  expect(result.status).toBe(200);
  expect(JSON.parse(result.body).template.kind).toBe('figure-template');
  expect(service.convert).toHaveBeenCalledWith(
    expect.any(Buffer),
    '中文模板.otpu',
    expect.any(AbortSignal),
  );
  expect(result.headers['cache-control']).toBe('no-store');
});

it.each([
  { headers: { origin: 'https://foreign.example' }, status: 403 },
  { headers: { host: 'foreign.example' }, status: 403 },
  { headers: { 'x-plot-fig-origin-import': '' }, status: 403 },
  { headers: { origin: '' }, status: 403 },
  { headers: { 'content-type': 'application/json' }, status: 415 },
  { headers: { 'x-plot-fig-filename': 'input.json' }, status: 400 },
  { headers: { 'x-plot-fig-filename': '..%2Finput.otpu' }, status: 400 },
  { headers: { 'x-plot-fig-filename': '%GG.otpu' }, status: 400 },
])(
  'rejects invalid request $headers before converting',
  async ({ headers, status }) => {
    const service = await start();
    expect((await service.send({ headers })).status).toBe(status);
    expect(service.convert).not.toHaveBeenCalled();
  },
);

it('rejects disguised JSON and oversized streaming bodies before running Origin', async () => {
  const service = await start();
  expect(
    (await service.send({ body: '{"kind":"figure-template"}' })).status,
  ).toBe(400);
  expect(
    (
      await service.send({
        body: Buffer.alloc(ORIGIN_NATIVE_MAX_BYTES + 1, 65),
      })
    ).status,
  ).toBe(413);
  expect(service.convert).not.toHaveBeenCalled();
});

it('reports unavailable platforms and lets unrelated routes continue', async () => {
  const service = await start(undefined, false);
  expect(
    JSON.parse((await service.send({ method: 'GET' })).body).available,
  ).toBe(false);
  expect((await service.send()).status).toBe(503);
  expect((await service.send({ path: '/index.html' })).status).toBe(404);
  expect(service.convert).not.toHaveBeenCalled();
});

it('serializes Origin conversions and releases the lock after failures', async () => {
  let fail!: (reason: Error) => void;
  const convert = vi.fn<OriginConversion>(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
  );
  const service = await start(convert);
  const first = service.send();
  await vi.waitFor(() => expect(convert).toHaveBeenCalledTimes(1));
  expect((await service.send()).status).toBe(409);
  fail(new Error('Origin 无法打开模板'));
  expect((await first).status).toBe(422);
  const next = service.send();
  await vi.waitFor(() => expect(convert).toHaveBeenCalledTimes(2));
  fail(new Error('读取失败'));
  expect((await next).status).toBe(422);
});

it('aborts only the active conversion on client disconnect', async () => {
  let conversionSignal: AbortSignal | undefined;
  const service = await start(async (_bytes, _filename, signal) => {
    conversionSignal = signal;
    return new Promise((_resolve, reject) =>
      signal.addEventListener('abort', () => reject(new Error('取消')), {
        once: true,
      }),
    );
  });
  const req = request(service.origin + endpoint, {
    method: 'POST',
    headers: {
      origin: service.origin,
      'content-type': 'application/octet-stream',
      'x-plot-fig-origin-import': '1',
      'x-plot-fig-filename': 'input.otp',
    },
  });
  req.on('error', () => {});
  req.end('CPYA 4.3264 106\nfixture');
  await vi.waitFor(() => expect(conversionSignal).toBeDefined());
  req.destroy();
  await vi.waitFor(() => expect(conversionSignal!.aborted).toBe(true));
});

it('waits for active Origin cleanup when the service is closed', async () => {
  let signal: AbortSignal | undefined,
    cleaned = false;
  const handler = createOriginImportMiddleware({
    available: true,
    convert: async (_b, _f, activeSignal) => {
      signal = activeSignal;
      await new Promise<void>((resolve) =>
        activeSignal.addEventListener(
          'abort',
          () => {
            setTimeout(() => {
              cleaned = true;
              resolve();
            }, 10);
          },
          { once: true },
        ),
      );
      throw new Error('取消');
    },
  });
  const server = createServer((req, res) => handler(req, res, () => res.end()));
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('address');
  const origin = `http://127.0.0.1:${address.port}`;
  const req = request(
    origin + endpoint,
    {
      method: 'POST',
      headers: {
        origin,
        'content-type': 'application/octet-stream',
        'x-plot-fig-origin-import': '1',
        'x-plot-fig-filename': 'native.otp',
      },
    },
    (res) => res.resume(),
  );
  req.on('error', () => {});
  req.end('CPYA 4.3 template');
  await vi.waitFor(() => expect(signal).toBeDefined());
  await handler.dispose();
  expect(signal!.aborted).toBe(true);
  expect(cleaned).toBe(true);
});
