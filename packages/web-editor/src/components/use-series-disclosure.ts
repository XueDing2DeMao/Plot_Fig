import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export type SeriesRevealRequest = { plotSlotId: string; version: number };

export function useSeriesDisclosure(
  panelId: string,
  ids: string[],
  request?: SeriesRevealRequest,
) {
  const listRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({
    panelId,
    ids,
    expanded: ids[0] ?? null,
    focus: false,
  });
  const identity = ids.join('\u0000');
  if (state.panelId !== panelId) {
    setState({ panelId, ids, expanded: ids[0] ?? null, focus: false });
  } else if (state.ids.join('\u0000') !== identity) {
    const added = ids.find((id) => !state.ids.includes(id));
    const removed = state.expanded !== null && !ids.includes(state.expanded);
    const next =
      added ??
      (removed
        ? (ids[Math.min(state.ids.indexOf(state.expanded!), ids.length - 1)] ??
          null)
        : state.expanded);
    setState({
      panelId,
      ids,
      expanded: next,
      focus: Boolean(added || removed),
    });
  }
  const handledRequest = useRef<SeriesRevealRequest | undefined>(undefined);
  useEffect(() => {
    if (
      !request ||
      handledRequest.current === request ||
      !ids.includes(request.plotSlotId)
    )
      return;
    handledRequest.current = request;
    setState((current) => ({
      ...current,
      expanded: request.plotSlotId,
      focus: true,
    }));
  }, [request, panelId, identity]);
  useLayoutEffect(() => {
    if (!state.focus || !state.expanded) return;
    const list = listRef.current;
    const row = Array.from(
      list?.querySelectorAll<HTMLElement>('[data-series-id]') ?? [],
    ).find((item) => item.dataset.seriesId === state.expanded);
    if (!row || !list) return;
    const input =
      row.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      row.querySelector<HTMLElement>('select');
    // 优先滚动列表，并确保靠后的字段及移出页面视口的输入框可见。
    if (getComputedStyle(list).overflowY === 'auto') {
      const bounds = list.getBoundingClientRect();
      const target = row.getBoundingClientRect();
      if (target.top < bounds.top || target.bottom > bounds.bottom)
        list.scrollTop += target.top - bounds.top;
    } else row.scrollIntoView?.({ block: 'nearest' });
    (input?.closest('.slot-row') ?? input)?.scrollIntoView?.({
      block: 'nearest',
    });
    input?.focus({ preventScroll: true });
    setState((current) => ({ ...current, focus: false }));
  }, [state.expanded, state.focus, identity]);
  return {
    listRef,
    expanded: state.expanded,
    toggle: (id: string) =>
      setState((current) => ({
        ...current,
        expanded: current.expanded === id ? null : id,
        focus: false,
      })),
  };
}
