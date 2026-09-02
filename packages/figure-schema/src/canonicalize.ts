const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function appendPath(path: string, segment: string): string {
  return path === '/' ? `/${segment}` : `${path}/${segment}`;
}

function typeError(path: string, reason: string): TypeError {
  return new TypeError(`canonical JSON ${reason} at ${path}`);
}

function isAccessorDescriptor(descriptor: PropertyDescriptor): boolean {
  return 'get' in descriptor || 'set' in descriptor;
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isArrayIndexKey(key: string, length: number): boolean {
  if (!/^(0|[1-9]\d*)$/.test(key)) {
    return false;
  }

  const index = Number(key);
  return Number.isSafeInteger(index) && index < length;
}

function serializeNumber(value: number, path: string): string {
  if (!Number.isFinite(value)) {
    throw typeError(path, 'requires a finite number');
  }

  return Object.is(value, -0) ? '0' : String(value);
}

function serializeArray(
  value: readonly unknown[],
  path: string,
  stack: WeakSet<object>,
): string {
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === 'symbol')) {
    throw typeError(path, 'does not allow symbol keys');
  }

  const extraKey = ownKeys
    .filter((key): key is string => typeof key === 'string')
    .filter((key) => key !== 'length' && !isArrayIndexKey(key, value.length))
    .sort()[0];
  if (extraKey) {
    throw typeError(
      appendPath(path, extraKey),
      'does not allow extra array keys',
    );
  }

  if (stack.has(value as object)) {
    throw typeError(path, 'does not allow circular references');
  }
  stack.add(value as object);

  try {
    const parts: string[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const key = `${index}`;
      const itemPath = appendPath(path, key);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor) {
        throw typeError(itemPath, 'does not allow sparse arrays');
      }
      if (isAccessorDescriptor(descriptor)) {
        throw typeError(itemPath, 'does not allow accessors');
      }
      parts.push(serializeValue(descriptor.value, itemPath, stack));
    }
    return `[${parts.join(',')}]`;
  } finally {
    stack.delete(value as object);
  }
}

function serializeObject(
  value: object,
  path: string,
  stack: WeakSet<object>,
): string {
  if (!isPlainObject(value)) {
    throw typeError(path, 'requires plain objects');
  }

  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === 'symbol')) {
    throw typeError(path, 'does not allow symbol keys');
  }

  if (stack.has(value)) {
    throw typeError(path, 'does not allow circular references');
  }
  stack.add(value);

  try {
    const keys = ownKeys
      .filter((key): key is string => typeof key === 'string')
      .sort();
    const parts = keys.map((key) => {
      const propertyPath = appendPath(path, key);
      if (DANGEROUS_KEYS.has(key)) {
        throw typeError(propertyPath, 'does not allow dangerous keys');
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable) {
        throw typeError(propertyPath, 'does not allow hidden properties');
      }
      if (isAccessorDescriptor(descriptor)) {
        throw typeError(propertyPath, 'does not allow accessors');
      }

      return `${JSON.stringify(key)}:${serializeValue(descriptor.value, propertyPath, stack)}`;
    });
    return `{${parts.join(',')}}`;
  } finally {
    stack.delete(value);
  }
}

function serializeValue(
  value: unknown,
  path: string,
  stack: WeakSet<object>,
): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    return serializeNumber(value, path);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (Array.isArray(value)) {
    return serializeArray(value, path, stack);
  }
  if (typeof value === 'object') {
    return serializeObject(value, path, stack);
  }

  throw typeError(path, 'contains a non-JSON value');
}

export function canonicalizeFigurePayload(value: unknown): string {
  return serializeValue(value, '/', new WeakSet<object>());
}
