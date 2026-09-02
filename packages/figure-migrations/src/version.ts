export type PayloadKind = 'figure-template' | 'figure-document';

export type RawEnvelope = {
  kind: PayloadKind;
  schemaVersion: string;
};

export type SchemaVersion = {
  major: number;
  minor: number;
  patch: number;
};

type EnvelopeReadResult = { ok: true; envelope: RawEnvelope } | { ok: false };
type ReflectionResult<T> = { ok: true; value: T } | { ok: false };

function reflect<T>(read: () => T): ReflectionResult<T> {
  try {
    return { ok: true, value: read() };
  } catch {
    return { ok: false };
  }
}

function readIsArray(value: unknown): boolean | undefined {
  const result = reflect(() => Array.isArray(value));

  return result.ok ? result.value : undefined;
}

function isPlainRecord(value: object): boolean {
  const prototype = reflect(() => Object.getPrototypeOf(value));

  return (
    prototype.ok &&
    (prototype.value === Object.prototype || prototype.value === null)
  );
}

function readOwnDataProperty(
  value: object,
  key: 'kind' | 'schemaVersion',
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

function isPayloadKind(value: unknown): value is PayloadKind {
  return value === 'figure-template' || value === 'figure-document';
}

function parseSafeInteger(value: string): number | undefined {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function parseSchemaVersion(value: string): SchemaVersion | undefined {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);

  if (!match) {
    return undefined;
  }

  const [, majorPart, minorPart, patchPart] = match;
  if (
    majorPart === undefined ||
    minorPart === undefined ||
    patchPart === undefined
  ) {
    return undefined;
  }

  const major = parseSafeInteger(majorPart);
  const minor = parseSafeInteger(minorPart);
  const patch = parseSafeInteger(patchPart);
  if (major === undefined || minor === undefined || patch === undefined) {
    return undefined;
  }

  return { major, minor, patch };
}

export function readEnvelope(input: unknown): EnvelopeReadResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false };
  }

  const isArray = readIsArray(input);
  if (isArray === undefined || isArray) {
    return { ok: false };
  }
  if (!isPlainRecord(input)) {
    return { ok: false };
  }

  const kind = readOwnDataProperty(input, 'kind');
  const schemaVersion = readOwnDataProperty(input, 'schemaVersion');
  if (!kind.ok || !schemaVersion.ok) {
    return { ok: false };
  }
  if (!isPayloadKind(kind.value) || typeof schemaVersion.value !== 'string') {
    return { ok: false };
  }

  return {
    ok: true,
    envelope: { kind: kind.value, schemaVersion: schemaVersion.value },
  };
}
