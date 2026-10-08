import { afterEach, expect, it, vi } from 'vitest';
import { createProjectRecoveryScheduler } from './project-recovery-scheduler.js';

afterEach(() => vi.useRealTimers());
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

it('defers serialization until the trailing deadline and saves only the latest reference', async () => {
  vi.useFakeTimers();
  const serialize = vi.fn((model: { value: number }) => JSON.stringify(model));
  const write = vi.fn(async (model: { value: number }) => serialize(model));
  const scheduler = createProjectRecoveryScheduler({ write });
  scheduler.schedule({ value: 1 });
  await vi.advanceTimersByTimeAsync(1_000);
  const latest = { value: 2 };
  scheduler.schedule(latest);
  await vi.advanceTimersByTimeAsync(1_999);
  expect(serialize).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(write).toHaveBeenCalledExactlyOnceWith(
    latest,
    expect.any(AbortSignal),
  );
  expect(serialize).toHaveBeenCalledTimes(1);
});

it('attempts the latest snapshot within 30 seconds of continuous edits', async () => {
  vi.useFakeTimers();
  const write = vi.fn(async (value: number) => value);
  const scheduler = createProjectRecoveryScheduler({ write });
  for (let revision = 0; revision < 30; revision += 1) {
    scheduler.schedule(revision);
    await vi.advanceTimersByTimeAsync(1_000);
  }
  expect(write).toHaveBeenCalledExactlyOnceWith(29, expect.any(AbortSignal));
});

it('keeps one in-flight write and one latest candidate while it is busy', async () => {
  vi.useFakeTimers();
  const first = deferred<number>();
  const write = vi.fn((value: number, _signal: AbortSignal) =>
    value === 1 ? first.promise : Promise.resolve(value),
  );
  const onEvent = vi.fn();
  const scheduler = createProjectRecoveryScheduler({ write, onEvent });
  scheduler.schedule(1);
  await vi.advanceTimersByTimeAsync(2_000);
  scheduler.schedule(2);
  scheduler.schedule(3);
  await vi.advanceTimersByTimeAsync(2_000);
  expect(write).toHaveBeenCalledTimes(1);
  first.resolve(1);
  await vi.advanceTimersByTimeAsync(0);
  expect(write.mock.calls.map(([value]) => value)).toEqual([1, 3]);
  expect(onEvent).toHaveBeenCalledWith({
    status: 'saved',
    candidate: 1,
    result: 1,
    hasPending: true,
  });
});

it('aborts and discards old completion events without allowing overlapping writes', async () => {
  vi.useFakeTimers();
  const first = deferred<number>();
  const write = vi.fn((value: number, _signal: AbortSignal) =>
    value === 1 ? first.promise : Promise.resolve(value),
  );
  const onEvent = vi.fn();
  const scheduler = createProjectRecoveryScheduler({ write, onEvent });
  scheduler.schedule(1);
  scheduler.flush();
  const signal = write.mock.calls[0]![1];
  scheduler.cancel();
  expect(signal.aborted).toBe(true);
  scheduler.schedule(2);
  await vi.advanceTimersByTimeAsync(2_000);
  expect(write).toHaveBeenCalledTimes(1);
  first.resolve(1);
  await vi.advanceTimersByTimeAsync(0);
  expect(write.mock.calls.map(([value]) => value)).toEqual([1, 2]);
  expect(
    onEvent.mock.calls
      .map(([event]) => event)
      .filter((event) => event.status === 'saved'),
  ).toEqual([{ status: 'saved', candidate: 2, result: 2, hasPending: false }]);
});

it('does not retry a failed snapshot until another candidate is explicitly scheduled', async () => {
  vi.useFakeTimers();
  const write = vi.fn(async () => {
    throw new Error('quota');
  });
  const onEvent = vi.fn();
  const scheduler = createProjectRecoveryScheduler({ write, onEvent });
  scheduler.schedule(1);
  await vi.advanceTimersByTimeAsync(90_000);
  expect(write).toHaveBeenCalledTimes(1);
  expect(onEvent).toHaveBeenLastCalledWith({
    status: 'error',
    candidate: 1,
    error: expect.any(Error),
    hasPending: false,
  });
  scheduler.schedule(2);
  await vi.advanceTimersByTimeAsync(2_000);
  expect(write).toHaveBeenCalledTimes(2);
});

it('flushes pending work on demand and cancel removes both deadlines', async () => {
  vi.useFakeTimers();
  const write = vi.fn(async (value: number) => value);
  const scheduler = createProjectRecoveryScheduler({ write });
  scheduler.schedule(1);
  scheduler.flush();
  await vi.advanceTimersByTimeAsync(0);
  expect(write).toHaveBeenCalledTimes(1);
  scheduler.schedule(2);
  scheduler.cancel();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(write).toHaveBeenCalledTimes(1);
});
