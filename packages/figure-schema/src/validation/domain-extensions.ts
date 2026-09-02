import type { ValidationIssue } from './types.js';

const MAX_DEPTH = 8;
const MAX_STRING_LENGTH = 65_536;
const MAX_COLLECTION_SIZE = 1_000;
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

type ReflectionResult<T> = { ok: true; value: T } | { ok: false };
type JsonVisitContext = { path: string; depth: number };

function domainIssue(path: string, message: string): ValidationIssue {
  return {
    code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
    path,
    message,
  };
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1');
}

function appendPath(path: string, segment: string): string {
  return `${path}/${escapeJsonPointerSegment(segment)}`;
}

function reflect<T>(read: () => T): ReflectionResult<T> {
  try {
    return { ok: true, value: read() };
  } catch {
    return { ok: false };
  }
}

function isArrayIndexKey(key: string, length: number): boolean {
  if (!/^(0|[1-9]\d*)$/.test(key)) {
    return false;
  }
  const index = Number(key);
  return Number.isSafeInteger(index) && index < length;
}

function getOwnDescriptor(
  value: object,
  key: string,
): ReflectionResult<PropertyDescriptor | undefined> {
  return reflect(() => Object.getOwnPropertyDescriptor(value, key));
}

function getArrayLength(value: unknown[], path: string): number | undefined {
  const descriptor = getOwnDescriptor(value, 'length');

  if (
    !descriptor.ok ||
    !descriptor.value ||
    'get' in descriptor.value ||
    typeof descriptor.value.value !== 'number'
  ) {
    return undefined;
  }

  const length = descriptor.value.value;
  return Number.isInteger(length) ? length : undefined;
}

function findUnsafeArrayPath(
  value: unknown[],
  context: JsonVisitContext,
): string | undefined {
  const ownKeys = reflect(() => Reflect.ownKeys(value));
  const length = getArrayLength(value, context.path);

  if (!ownKeys.ok || length === undefined) {
    return `${context.path}/length`;
  }
  if (length > MAX_COLLECTION_SIZE) {
    return context.path;
  }
  if (ownKeys.value.some((key) => typeof key === 'symbol')) {
    return context.path;
  }

  for (let index = 0; index < length; index += 1) {
    const key = `${index}`;
    const descriptor = getOwnDescriptor(value, key);
    if (!descriptor.ok || !descriptor.value) {
      return appendPath(context.path, key);
    }
    if ('get' in descriptor.value) {
      return appendPath(context.path, key);
    }
    const issuePath = findUnsafeJsonPath(
      descriptor.value.value,
      appendPath(context.path, key),
      context.depth + 1,
    );
    if (issuePath) {
      return issuePath;
    }
  }

  const extraKeys = ownKeys.value
    .filter((key): key is string => typeof key === 'string')
    .filter((key) => key !== 'length' && !isArrayIndexKey(key, length))
    .sort();
  return extraKeys[0] ? appendPath(context.path, extraKeys[0]) : undefined;
}

function isPlainJsonObject(value: object): boolean {
  const prototype = reflect(() => Object.getPrototypeOf(value));
  return (
    prototype.ok &&
    (prototype.value === Object.prototype || prototype.value === null)
  );
}

function findUnsafeObjectPath(
  value: object,
  context: JsonVisitContext,
): string | undefined {
  if (!isPlainJsonObject(value)) {
    return context.path;
  }

  const ownKeys = reflect(() => Reflect.ownKeys(value));
  if (!ownKeys.ok || ownKeys.value.some((key) => typeof key === 'symbol')) {
    return context.path;
  }

  const keys = ownKeys.value
    .filter((key): key is string => typeof key === 'string')
    .sort();
  if (keys.length > MAX_COLLECTION_SIZE) {
    return context.path;
  }

  for (const key of keys) {
    if (DANGEROUS_KEYS.has(key)) {
      return appendPath(context.path, key);
    }
    const descriptor = getOwnDescriptor(value, key);
    if (!descriptor.ok || !descriptor.value || 'get' in descriptor.value) {
      return appendPath(context.path, key);
    }
    const issuePath = findUnsafeJsonPath(
      descriptor.value.value,
      appendPath(context.path, key),
      context.depth + 1,
    );
    if (issuePath) {
      return issuePath;
    }
  }

  return undefined;
}

export function findUnsafeJsonPath(
  value: unknown,
  path: string,
  depth = 0,
): string | undefined {
  if (depth > MAX_DEPTH) {
    return path;
  }
  if (value === null || typeof value === 'boolean') {
    return undefined;
  }
  if (typeof value === 'string') {
    return value.length <= MAX_STRING_LENGTH ? undefined : path;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? undefined : path;
  }
  if (Array.isArray(value)) {
    return findUnsafeArrayPath(value, { path, depth });
  }
  if (typeof value === 'object') {
    return findUnsafeObjectPath(value, { path, depth });
  }
  return path;
}

export function validateExtensionEntries(
  entries: Array<readonly [string, unknown | undefined]>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [path, value] of entries) {
    if (value === undefined) {
      continue;
    }
    const issuePath = findUnsafeJsonPath(value, path);
    if (issuePath) {
      issues.push(
        domainIssue(
          issuePath,
          'extension values must be finite JSON-safe data',
        ),
      );
    }
  }

  return issues;
}
