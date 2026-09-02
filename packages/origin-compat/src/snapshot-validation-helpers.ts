type ReflectionResult<T> = { ok: true; value: T } | { ok: false };
export type SemVer = { major: number; minor: number; patch: number };
export type SafeCloneResult =
  | { ok: true; value: unknown }
  | { ok: false; sourcePath: string; message: string };

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

export function cloneForValidation(
  input: unknown,
  path = '/',
): SafeCloneResult {
  if (
    input === null ||
    typeof input === 'string' ||
    typeof input === 'number' ||
    typeof input === 'boolean'
  ) {
    return { ok: true, value: input };
  }

  if (typeof input === 'undefined' || typeof input === 'bigint') {
    return {
      ok: false,
      sourcePath: path,
      message: 'Snapshot values must be JSON-compatible',
    };
  }
  if (typeof input === 'symbol' || typeof input === 'function') {
    return {
      ok: false,
      sourcePath: path,
      message: 'Snapshot values must not include executable values',
    };
  }
  if (typeof input !== 'object') {
    return {
      ok: false,
      sourcePath: path,
      message: 'Snapshot value type is unsupported',
    };
  }

  const isArray = readIsArray(input);
  if (isArray === undefined) {
    return {
      ok: false,
      sourcePath: path,
      message: 'Snapshot reflection failed',
    };
  }
  if (isArray) {
    return cloneArray(input, path);
  }
  if (!isPlainRecord(input)) {
    return {
      ok: false,
      sourcePath: path,
      message: 'Snapshot objects must be plain JSON records',
    };
  }
  return cloneObject(input, path);
}

function readDescriptorKeys(
  descriptors: PropertyDescriptorMap,
  path: string,
  kind: 'array' | 'object',
):
  | { ok: true; keys: string[] }
  | { ok: false; sourcePath: string; message: string } {
  const keys = reflect(() => Reflect.ownKeys(descriptors));
  if (!keys.ok) {
    return {
      ok: false,
      sourcePath: path,
      message: `Snapshot ${kind} reflection failed`,
    };
  }

  const stringKeys: string[] = [];
  for (const key of keys.value) {
    if (typeof key === 'symbol') {
      return {
        ok: false,
        sourcePath: path,
        message: `Snapshot ${kind} fields must not use symbol keys`,
      };
    }
    stringKeys.push(key);
  }

  return { ok: true, keys: stringKeys };
}

function cloneArray(value: object, path: string): SafeCloneResult {
  const descriptors = reflect(() => Object.getOwnPropertyDescriptors(value));
  if (!descriptors.ok) {
    return {
      ok: false,
      sourcePath: path,
      message: 'Snapshot array reflection failed',
    };
  }

  const length = descriptors.value.length;
  if (
    !length ||
    'get' in length ||
    'set' in length ||
    typeof length.value !== 'number' ||
    !Number.isSafeInteger(length.value) ||
    length.value < 0
  ) {
    return {
      ok: false,
      sourcePath: path,
      message: 'Snapshot array length is invalid',
    };
  }

  const keys = readDescriptorKeys(descriptors.value, path, 'array');
  if (!keys.ok) {
    return keys;
  }

  for (const key of keys.keys) {
    if (key !== 'length' && !/^(0|[1-9]\d*)$/u.test(key)) {
      return {
        ok: false,
        sourcePath: appendPath(path, key),
        message: 'Snapshot arrays must not carry named properties',
      };
    }
  }

  const clone: unknown[] = [];
  for (let index = 0; index < length.value; index += 1) {
    const key = String(index);
    const descriptor = descriptors.value[key];
    if (
      !descriptor ||
      'get' in descriptor ||
      'set' in descriptor ||
      !descriptor.enumerable
    ) {
      return {
        ok: false,
        sourcePath: appendPath(path, key),
        message: 'Snapshot arrays must contain own data values',
      };
    }
    const child = cloneForValidation(descriptor.value, appendPath(path, key));
    if (!child.ok) {
      return child;
    }
    clone.push(child.value);
  }
  return { ok: true, value: clone };
}

function cloneObject(value: object, path: string): SafeCloneResult {
  const descriptors = reflect(() => Object.getOwnPropertyDescriptors(value));
  if (!descriptors.ok) {
    return {
      ok: false,
      sourcePath: path,
      message: 'Snapshot object reflection failed',
    };
  }

  const clone: Record<string, unknown> = {};
  const keys = readDescriptorKeys(descriptors.value, path, 'object');
  if (!keys.ok) {
    return keys;
  }

  for (const key of keys.keys) {
    const descriptor = descriptors.value[key];
    if (!descriptor) {
      return {
        ok: false,
        sourcePath: appendPath(path, key),
        message: 'Snapshot object reflection failed',
      };
    }
    if (!descriptor.enumerable) {
      continue;
    }
    if ('get' in descriptor || 'set' in descriptor) {
      return {
        ok: false,
        sourcePath: appendPath(path, key),
        message: 'Snapshot fields must be own data properties',
      };
    }
    const child = cloneForValidation(descriptor.value, appendPath(path, key));
    if (!child.ok) {
      return child;
    }
    clone[key] = child.value;
  }
  return { ok: true, value: clone };
}
