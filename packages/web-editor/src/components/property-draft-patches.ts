export type PropertyPatch = { path: string[]; value: unknown; remove?: true };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function samePropertyValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length &&
      left.every((item, i) => samePropertyValue(item, right[i]))
    );
  if (!record(left) || !record(right)) return false;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) =>
        Object.hasOwn(right, key) && samePropertyValue(left[key], right[key]),
    )
  );
}

export function propertyPatches(
  before: unknown,
  after: unknown,
  path: string[] = [],
): PropertyPatch[] {
  if (samePropertyValue(before, after)) return [];
  if (record(before) && record(after))
    return [
      ...new Set([...Object.keys(before), ...Object.keys(after)]),
    ].flatMap((key) =>
      Object.hasOwn(after, key)
        ? propertyPatches(before[key], after[key], [...path, key])
        : [{ path: [...path, key], value: undefined, remove: true as const }],
    );
  return [{ path, value: structuredClone(after) }];
}

export function applyPropertyPatches<T>(value: T, patches: PropertyPatch[]): T {
  let next = structuredClone(value);
  for (const patch of patches) {
    if (!patch.path.length) {
      next = structuredClone(patch.value) as T;
      continue;
    }
    let parent = next as Record<string, unknown>;
    for (const key of patch.path.slice(0, -1)) {
      if (!record(parent[key])) parent[key] = {};
      parent = parent[key] as Record<string, unknown>;
    }
    const key = patch.path.at(-1)!;
    if (patch.remove) delete parent[key];
    else parent[key] = structuredClone(patch.value);
  }
  return next;
}

export function overlappingPaths(left: string[], right: string[]): boolean {
  return left
    .slice(0, Math.min(left.length, right.length))
    .every((key, i) => key === right[i]);
}

export function isRangeText(patch: PropertyPatch): boolean {
  return (
    patch.path.length === 2 &&
    patch.path[0] === 'range' &&
    ['min', 'max'].includes(patch.path[1]!)
  );
}
