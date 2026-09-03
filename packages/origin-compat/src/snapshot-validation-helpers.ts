type ReflectionResult<T> = { ok: true; value: T } | { ok: false };

export type SemVer = { major: number; minor: number; patch: number };

export function reflect<T>(read: () => T): ReflectionResult<T> {
  try {
    return { ok: true, value: read() };
  } catch {
    return { ok: false };
  }
}

export function readIsArray(value: unknown): boolean | undefined {
  const result = reflect(() => Array.isArray(value));
  return result.ok ? result.value : undefined;
}

export function isPlainRecord(value: object): boolean {
  const prototype = reflect(() => Object.getPrototypeOf(value));
  return (
    prototype.ok &&
    (prototype.value === Object.prototype || prototype.value === null)
  );
}

export function readOwnDataProperty(
  value: object,
  key: string,
): ReflectionResult<unknown> {
  const descriptor = reflect(() => Object.getOwnPropertyDescriptor(value, key));
  if (
    !descriptor.ok ||
    !descriptor.value ||
    'get' in descriptor.value ||
    'set' in descriptor.value
  ) {
    return { ok: false };
  }
  return { ok: true, value: descriptor.value.value };
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1');
}

export function appendPath(path: string, segment: string): string {
  return path === '/'
    ? `/${escapeJsonPointerSegment(segment)}`
    : `${path}/${escapeJsonPointerSegment(segment)}`;
}

export function parseSemVer(value: string): SemVer | undefined {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) {
    return undefined;
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (
    !Number.isSafeInteger(major) ||
    !Number.isSafeInteger(minor) ||
    !Number.isSafeInteger(patch)
  ) {
    return undefined;
  }

  return { major, minor, patch };
}

export function compareSemVer(left: SemVer, right: SemVer): number {
  return (
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch
  );
}
