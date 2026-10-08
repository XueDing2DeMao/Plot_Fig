export type RecoverySchedulerEvent<Candidate, Result> =
  | { status: 'pending' | 'saving'; candidate: Candidate }
  | {
      status: 'saved';
      candidate: Candidate;
      result: Result;
      hasPending: boolean;
    }
  | {
      status: 'error';
      candidate: Candidate;
      error: unknown;
      hasPending: boolean;
    };

export function createProjectRecoveryScheduler<Candidate, Result>(options: {
  write: (candidate: Candidate, signal: AbortSignal) => Promise<Result>;
  onEvent?: (event: RecoverySchedulerEvent<Candidate, Result>) => void;
  debounceMs?: number;
  maxWaitMs?: number;
}) {
  let pending: { candidate: Candidate } | undefined;
  let trailing: ReturnType<typeof setTimeout> | undefined;
  let maximum: ReturnType<typeof setTimeout> | undefined;
  let active: AbortController | undefined;
  let generation = 0;
  let due = false;
  const clearTimers = () => {
    clearTimeout(trailing);
    clearTimeout(maximum);
    trailing = maximum = undefined;
  };
  const submit = () => {
    if (active || !pending || !due) return;
    const { candidate } = pending;
    pending = undefined;
    due = false;
    clearTimers();
    const ticket = generation;
    const controller = new AbortController();
    active = controller;
    options.onEvent?.({ status: 'saving', candidate });
    // 同步序列化抛错与异步写入失败走同一条完成路径。
    const run = async () => options.write(candidate, controller.signal);
    void run()
      .then(
        (result) => {
          if (ticket === generation)
            options.onEvent?.({
              status: 'saved',
              candidate,
              result,
              hasPending: !!pending,
            });
        },
        (error: unknown) => {
          if (ticket === generation)
            options.onEvent?.({
              status: 'error',
              candidate,
              error,
              hasPending: !!pending,
            });
        },
      )
      .finally(() => {
        active = undefined;
        submit();
      });
  };
  const flush = () => {
    if (!pending) return;
    due = true;
    clearTimers();
    submit();
  };
  return {
    schedule(candidate: Candidate) {
      const first = !pending;
      pending = { candidate };
      options.onEvent?.({ status: 'pending', candidate });
      if (due) {
        submit();
        return;
      }
      clearTimeout(trailing);
      trailing = setTimeout(flush, options.debounceMs ?? 2_000);
      if (first) maximum = setTimeout(flush, options.maxWaitMs ?? 30_000);
    },
    flush,
    cancel() {
      generation += 1;
      pending = undefined;
      due = false;
      clearTimers();
      active?.abort();
    },
  };
}
