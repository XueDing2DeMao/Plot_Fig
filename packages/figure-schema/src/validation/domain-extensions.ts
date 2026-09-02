import type { ValidationIssue } from './types.js';

const MAX_DEPTH = 8;
const MAX_STRING_LENGTH = 65_536;
const MAX_COLLECTION_SIZE = 1_000;
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

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

function isPlainJsonObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function findUnsafeArrayPath(
  value: unknown[],
  path: string,
  depth: number,
): string | undefined {
  if (value.length > MAX_COLLECTION_SIZE) {
    return path;
  }

  for (let index = 0; index < value.length; index += 1) {
    const issuePath = findUnsafeJsonPath(
      value[index],
      `${path}/${index}`,
      depth + 1,
    );
    if (issuePath) {
      return issuePath;
    }
  }

  return undefined;
}

function findUnsafeObjectPath(
  value: object,
  path: string,
  depth: number,
): string | undefined {
  if (
    !isPlainJsonObject(value) ||
    Object.getOwnPropertySymbols(value).length > 0
  ) {
    return path;
  }

  const keys = Object.getOwnPropertyNames(value).sort();
  if (keys.length > MAX_COLLECTION_SIZE) {
    return path;
  }

  for (const key of keys) {
    if (DANGEROUS_KEYS.has(key)) {
      return appendPath(path, key);
    }
    const issuePath = findUnsafeJsonPath(
      (value as Record<string, unknown>)[key],
      appendPath(path, key),
      depth + 1,
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
    return findUnsafeArrayPath(value, path, depth);
  }

  if (typeof value === 'object') {
    return findUnsafeObjectPath(value, path, depth);
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
