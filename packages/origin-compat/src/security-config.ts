export const SECURITY_LIMITS = {
  depth: 32,
  arrayLength: 10_000,
  objectKeys: 1_000,
  nodes: 100_000,
  stringLength: 65_536,
  totalBytes: 2_000_000,
  extensionBytes: 262_144,
} as const;

const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SCRIPT_LIKE_KEYS = new Set([
  'script',
  'labtalk',
  'originc',
  'python',
  'macro',
]);
const encoder = new TextEncoder();

function normalizeScriptLikeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/gu, '');
}

export function isDangerousKey(key: string): boolean {
  return DANGEROUS_KEYS.has(key);
}

export function isScriptLikeKey(key: string): boolean {
  return SCRIPT_LIKE_KEYS.has(normalizeScriptLikeKey(key));
}

export function utf8ByteLength(value: string): number {
  return encoder.encode(value).byteLength;
}
