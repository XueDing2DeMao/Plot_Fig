import type { IncomingMessage } from 'node:http';
import type { ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { convertFigure, findInkscape, runInkscape } from './converter.js';
import { MAX_SVG_BYTES } from './security.js';
type Config = {
  token: string;
  origins: string[];
  executable?: string;
  convert?: typeof convertFigure;
};
const MAX_BODY = MAX_SVG_BYTES * 2,
  MAX_CONCURRENT = 2;
function authorized(request: IncomingMessage, config: Config) {
  const value = Buffer.from(request.headers.authorization ?? ''),
    expected = Buffer.from('Bearer ' + config.token);
  return value.length === expected.length && timingSafeEqual(value, expected);
}
function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(value));
}
async function body(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('请求文件过大');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

type ServerState = { config: Config; active: number };
function accept(req: IncomingMessage, res: ServerResponse, config: Config) {
  const origin = req.headers.origin,
    host = req.headers.host ?? '';
  if (
    !/^(127\.0\.0\.1|localhost):\d+$/.test(host) ||
    !origin ||
    !config.origins.includes(origin)
  ) {
    json(res, 403, { error: '来源未获授权' });
    return false;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    res.end();
    return false;
  }
  if (!authorized(req, config)) {
    json(res, 401, { error: '请填写本次服务启动令牌' });
    return false;
  }
  return true;
}
async function exportRequest(
  req: IncomingMessage,
  res: ServerResponse,
  context: { state: ServerState; executable: string },
) {
  const { state, executable } = context;
  if (!req.headers['content-type']?.startsWith('application/json')) {
    json(res, 415, { error: '需要 JSON 请求' });
    return;
  }
  if (state.active >= MAX_CONCURRENT) {
    json(res, 429, { error: '已有两个转换任务运行，请稍后重试' });
    return;
  }
  state.active++;
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });
  try {
    const data = await (state.config.convert ?? convertFigure)(
      await body(req),
      { executable, signal: controller.signal },
    );
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': data.length,
    });
    res.end(data);
  } finally {
    state.active--;
  }
}
async function route(
  req: IncomingMessage,
  res: ServerResponse,
  state: ServerState,
) {
  if (!accept(req, res, state.config)) return;
  const executable = state.config.executable ?? (await findInkscape());
  if (req.method === 'GET' && req.url === '/capabilities') {
    json(res, 200, {
      formats: ['pdf', 'eps'],
      version: (await runInkscape(executable, ['--version'])).trim(),
      maxConcurrent: MAX_CONCURRENT,
    });
    return;
  }
  if (req.method !== 'POST' || req.url !== '/export') {
    json(res, 404, { error: '接口不存在' });
    return;
  }
  await exportRequest(req, res, { state, executable });
}
export function createExportServer(config: Config) {
  const state = { config, active: 0 };
  const server = createServer((req, res) => {
    void route(req, res, state).catch((e) => {
      if (!res.headersSent && !res.destroyed)
        json(res, 400, { error: e instanceof Error ? e.message : '导出失败' });
    });
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}
