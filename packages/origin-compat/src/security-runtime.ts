import { SECURITY_LIMITS } from './security-config.js';
import type { CompatibilityItem, ImportDiagnostic } from './types.js';

export type PathContext = {
  depth: number;
  inExtension: boolean;
  path: string;
};

export type WalkState = {
  diagnostics: ImportDiagnostic[];
  extensionBytes: number;
  failed: boolean;
  items: CompatibilityItem[];
  nodes: number;
  stack: WeakSet<object>;
  totalBytes: number;
};

export type VisitValue = (
  value: unknown,
  context: PathContext,
  state: WalkState,
) => unknown;

export function isAccessorDescriptor(descriptor: PropertyDescriptor): boolean {
  return 'get' in descriptor || 'set' in descriptor;
}

export function invalidDiagnostic(
  sourcePath: string,
  message: string,
): ImportDiagnostic {
  return {
    code: 'ORIGIN_SNAPSHOT_INVALID',
    severity: 'error',
    sourcePath,
    message,
    recoverable: false,
  };
}

export function limitDiagnostic(
  sourcePath: string,
  message: string,
): ImportDiagnostic {
  return {
    code: 'ORIGIN_INPUT_LIMIT_EXCEEDED',
    severity: 'error',
    sourcePath,
    message,
    recoverable: false,
    securityCategory: 'input-limit',
  };
}

export function dangerousDiagnostic(sourcePath: string): ImportDiagnostic {
  return {
    code: 'ORIGIN_DANGEROUS_KEY_REJECTED',
    severity: 'error',
    sourcePath,
    message: 'dangerous object keys are not allowed',
    recoverable: false,
    securityCategory: 'dangerous-key',
  };
}

export function createState(): WalkState {
  return {
    diagnostics: [],
    extensionBytes: 0,
    failed: false,
    items: [],
    nodes: 0,
    stack: new WeakSet<object>(),
    totalBytes: 0,
  };
}

export function stopWith(
  state: WalkState,
  diagnostic: ImportDiagnostic,
  item?: CompatibilityItem,
): void {
  state.failed = true;
  state.diagnostics.push(diagnostic);
  if (item) {
    state.items.push(item);
  }
}

export function noteScriptRemoval(state: WalkState, sourcePath: string): void {
  state.diagnostics.push({
    code: 'ORIGIN_SCRIPT_IGNORED',
    severity: 'warning',
    sourcePath,
    message: 'script-like content was removed for safety',
    recoverable: true,
    securityCategory: 'script',
  });
  state.items.push({
    sourcePath,
    disposition: 'ignoredForSecurity',
    message: 'script-like content was removed',
  });
}

export function noteAutomationRemoval(
  state: WalkState,
  sourcePath: string,
): void {
  state.diagnostics.push({
    code: 'ORIGIN_SCRIPT_IGNORED',
    severity: 'warning',
    sourcePath,
    message: 'Origin automation content was ignored',
    recoverable: true,
    securityCategory: 'script',
  });
  state.items.push({
    sourcePath,
    disposition: 'ignoredForSecurity',
    message: 'automation content was removed',
  });
}

export function addBytes(
  state: WalkState,
  context: PathContext,
  sourcePath: string,
  bytes: number,
): void {
  state.totalBytes += bytes;
  if (context.inExtension) {
    state.extensionBytes += bytes;
  }
  if (state.totalBytes > SECURITY_LIMITS.totalBytes) {
    stopWith(
      state,
      limitDiagnostic(sourcePath, 'Snapshot total byte limit was exceeded'),
    );
    return;
  }
  if (
    context.inExtension &&
    state.extensionBytes > SECURITY_LIMITS.extensionBytes
  ) {
    stopWith(
      state,
      limitDiagnostic(sourcePath, 'Snapshot extension byte limit was exceeded'),
    );
  }
}

export function noteValue(state: WalkState, context: PathContext): void {
  state.nodes += 1;
  if (state.nodes > SECURITY_LIMITS.nodes) {
    stopWith(
      state,
      limitDiagnostic(context.path, 'Snapshot node limit was exceeded'),
    );
    return;
  }
  if (context.depth > SECURITY_LIMITS.depth) {
    stopWith(
      state,
      limitDiagnostic(context.path, 'Snapshot depth limit was exceeded'),
    );
  }
}
