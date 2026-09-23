import { afterEach, expect, it, vi } from 'vitest';
import { createExportServer } from './server.js';
const servers: ReturnType<typeof createExportServer>[] = [];
afterEach(async () => {
  await Promise.all(
    servers.map(
      (s) =>
        new Promise<void>((r) => {
          s.closeAllConnections();
          s.close(() => r());
        }),
    ),
  );
});
it('enforces origin, token and content type before conversion', async () => {
  let called = 0;
  const server = createExportServer({
    token: 'secret',
    origins: ['http://localhost:5173'],
    executable: 'unused',
    convert: async () => {
      called++;
      return Buffer.from('%PDF-test');
    },
  });
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  const url = `http://127.0.0.1:${address.port}/export`,
    headers = {
      Origin: 'http://localhost:5173',
      Authorization: 'Bearer secret',
      'Content-Type': 'application/json',
    };
  expect(
    (
      await fetch(url, {
        method: 'POST',
        headers: { ...headers, Origin: 'https://evil' },
        body: '{}',
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await fetch(url, {
        method: 'POST',
        headers: { ...headers, Authorization: 'Bearer wrong' },
        body: '{}',
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await fetch(url, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'text/plain' },
        body: '{}',
      })
    ).status,
  ).toBe(415);
  expect(
    (await fetch(url, { method: 'POST', headers, body: '{}' })).status,
  ).toBe(200);
  expect(called).toBe(1);
});
it('bounds active conversions to two and releases capacity after completion', async () => {
  const release: Array<() => void> = [];
  const server = createExportServer({
    token: 'secret',
    origins: ['http://localhost:5173'],
    executable: 'unused',
    convert: async () => {
      await new Promise<void>((resolve) => release.push(resolve));
      return Buffer.from('%PDF-test');
    },
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('no port');
  const post = () =>
    fetch(`http://127.0.0.1:${address.port}/export`, {
      method: 'POST',
      body: '{}',
      headers: {
        Origin: 'http://localhost:5173',
        Authorization: 'Bearer secret',
        'Content-Type': 'application/json',
      },
    });
  const first = post(),
    second = post();
  await vi.waitFor(() => expect(release).toHaveLength(2));
  expect((await post()).status).toBe(429);
  release.forEach((resolve) => resolve());
  expect((await first).status).toBe(200);
  expect((await second).status).toBe(200);
  const retry = post();
  await vi.waitFor(() => expect(release).toHaveLength(3));
  release[2]!();
  expect((await retry).status).toBe(200);
});
