import { isPlainRecord, readIsArray } from './snapshot-validation-helpers.js';
import { SECURITY_LIMITS, utf8ByteLength } from './security-config.js';
import { visitArray } from './security-array.js';
import { visitObject } from './security-object.js';
import {
  addBytes,
  createState,
  invalidDiagnostic,
  limitDiagnostic,
  noteValue,
  stopWith,
  type PathContext,
  type WalkState,
} from './security-runtime.js';
import type { CompatibilityItem, ImportDiagnostic } from './types.js';

function visitValue(
  value: unknown,
  context: PathContext,
  state: WalkState,
): unknown {
  noteValue(state, context);
  if (state.failed) {
    return undefined;
  }
  if (value === null) {
    addBytes(state, context, context.path, utf8ByteLength('null'));
    return null;
  }
  if (typeof value === 'string') {
    if (value.length > SECURITY_LIMITS.stringLength) {
      stopWith(
        state,
        limitDiagnostic(
          context.path,
          'Snapshot string length limit was exceeded',
        ),
      );
      return undefined;
    }
    addBytes(state, context, context.path, utf8ByteLength(value));
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      stopWith(
        state,
        invalidDiagnostic(context.path, 'Snapshot numbers must be finite'),
      );
      return undefined;
    }
    addBytes(state, context, context.path, utf8ByteLength(String(value)));
    return value;
  }
  if (typeof value === 'boolean') {
    addBytes(state, context, context.path, utf8ByteLength(String(value)));
    return value;
  }
  if (
    typeof value === 'undefined' ||
    typeof value === 'bigint' ||
    typeof value === 'function' ||
    typeof value === 'symbol'
  ) {
    stopWith(
      state,
      invalidDiagnostic(context.path, 'Snapshot values must be JSON-safe data'),
    );
    return undefined;
  }
  const isArray = readIsArray(value);
  if (isArray === undefined) {
    stopWith(
      state,
      invalidDiagnostic(context.path, 'Snapshot reflection failed'),
    );
    return undefined;
  }
  if (isArray) {
    return visitArray(value, context, state, visitValue);
  }
  if (!isPlainRecord(value)) {
    stopWith(
      state,
      invalidDiagnostic(
        context.path,
        'Snapshot objects must be plain JSON records',
      ),
    );
    return undefined;
  }
  return visitObject(value, context, state, visitValue);
}

export function scrubSnapshotClone(input: unknown):
  | {
      ok: true;
      value: unknown;
      diagnostics: ImportDiagnostic[];
      items: CompatibilityItem[];
    }
  | {
      ok: false;
      diagnostics: ImportDiagnostic[];
      items: CompatibilityItem[];
    } {
  const state = createState();
  const value = visitValue(
    input,
    { depth: 0, inExtension: false, path: '/' },
    state,
  );

  if (state.failed) {
    return { ok: false, diagnostics: state.diagnostics, items: state.items };
  }
  return {
    ok: true,
    value,
    diagnostics: state.diagnostics,
    items: state.items,
  };
}
