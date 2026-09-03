import {
  appendPath,
  isPlainRecord,
  readIsArray,
  reflect,
} from './snapshot-validation-helpers.js';

export type SafeCloneResult = { ok: true; value: unknown } | CloneFailureResult;

type CloneFailureResult = {
  ok: false;
  sourcePath: string;
  message: string;
};

type CloneState = {
  activeAncestors: WeakSet<object>;
};

type DescriptorKeysResult = { ok: true; keys: string[] } | CloneFailureResult;

function cloneFailure(sourcePath: string, message: string): CloneFailureResult {
  return {
    ok: false,
    sourcePath,
    message,
  };
}

function withCycleGuard(
  value: object,
  path: string,
  state: CloneState,
  clone: () => SafeCloneResult,
): SafeCloneResult {
  if (state.activeAncestors.has(value)) {
    return cloneFailure(path, 'Snapshot values must not contain cycles');
  }

  state.activeAncestors.add(value);
  try {
    return clone();
  } finally {
    state.activeAncestors.delete(value);
  }
}

function readDescriptorKeys(
  descriptors: PropertyDescriptorMap,
  path: string,
  kind: 'array' | 'object',
): DescriptorKeysResult {
  const keys = reflect(() => Reflect.ownKeys(descriptors));
  if (!keys.ok) {
    return cloneFailure(path, `Snapshot ${kind} reflection failed`);
  }

  const stringKeys: string[] = [];
  for (const key of keys.value) {
    if (typeof key === 'symbol') {
      return cloneFailure(
        path,
        `Snapshot ${kind} fields must not use symbol keys`,
      );
    }
    stringKeys.push(key);
  }

  return { ok: true, keys: stringKeys };
}

function cloneArray(
  value: object,
  path: string,
  state: CloneState,
): SafeCloneResult {
  return withCycleGuard(value, path, state, () => {
    const descriptors = reflect(() => Object.getOwnPropertyDescriptors(value));
    if (!descriptors.ok) {
      return cloneFailure(path, 'Snapshot array reflection failed');
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
      return cloneFailure(path, 'Snapshot array length is invalid');
    }

    const keys = readDescriptorKeys(descriptors.value, path, 'array');
    if (!keys.ok) {
      return keys;
    }

    for (const key of keys.keys) {
      if (key !== 'length' && !/^(0|[1-9]\d*)$/u.test(key)) {
        return cloneFailure(
          appendPath(path, key),
          'Snapshot arrays must not carry named properties',
        );
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
        return cloneFailure(
          appendPath(path, key),
          'Snapshot arrays must contain own data values',
        );
      }

      const child = cloneValue(descriptor.value, appendPath(path, key), state);
      if (!child.ok) {
        return child;
      }
      clone.push(child.value);
    }

    return { ok: true, value: clone };
  });
}

function cloneObject(
  value: object,
  path: string,
  state: CloneState,
): SafeCloneResult {
  return withCycleGuard(value, path, state, () => {
    const descriptors = reflect(() => Object.getOwnPropertyDescriptors(value));
    if (!descriptors.ok) {
      return cloneFailure(path, 'Snapshot object reflection failed');
    }

    const clone: Record<string, unknown> = {};
    const keys = readDescriptorKeys(descriptors.value, path, 'object');
    if (!keys.ok) {
      return keys;
    }

    for (const key of keys.keys) {
      const descriptor = descriptors.value[key];
      if (!descriptor) {
        return cloneFailure(
          appendPath(path, key),
          'Snapshot object reflection failed',
        );
      }
      if (!descriptor.enumerable) {
        return cloneFailure(
          appendPath(path, key),
          'Snapshot object properties must be enumerable',
        );
      }
      if ('get' in descriptor || 'set' in descriptor) {
        return cloneFailure(
          appendPath(path, key),
          'Snapshot fields must be own data properties',
        );
      }

      const child = cloneValue(descriptor.value, appendPath(path, key), state);
      if (!child.ok) {
        return child;
      }
      clone[key] = child.value;
    }

    return { ok: true, value: clone };
  });
}

function cloneValue(
  input: unknown,
  path: string,
  state: CloneState,
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
    return cloneFailure(path, 'Snapshot values must be JSON-compatible');
  }
  if (typeof input === 'symbol' || typeof input === 'function') {
    return cloneFailure(
      path,
      'Snapshot values must not include executable values',
    );
  }
  if (typeof input !== 'object') {
    return cloneFailure(path, 'Snapshot value type is unsupported');
  }

  const isArray = readIsArray(input);
  if (isArray === undefined) {
    return cloneFailure(path, 'Snapshot reflection failed');
  }
  if (isArray) {
    return cloneArray(input, path, state);
  }
  if (!isPlainRecord(input)) {
    return cloneFailure(path, 'Snapshot objects must be plain JSON records');
  }
  return cloneObject(input, path, state);
}

export function cloneForValidation(
  input: unknown,
  path = '/',
): SafeCloneResult {
  return cloneValue(input, path, {
    activeAncestors: new WeakSet<object>(),
  });
}
