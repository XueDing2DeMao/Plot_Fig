import { appendPath } from './snapshot-validation-helpers.js';
import {
  isDangerousKey,
  isScriptLikeKey,
  SECURITY_LIMITS,
  utf8ByteLength,
} from './security-config.js';
import { visitAutomation } from './security-array.js';
import {
  isScriptPayloadArray,
  isScriptPayloadRecord,
} from './security-script.js';
import {
  addBytes,
  dangerousDiagnostic,
  invalidDiagnostic,
  isAccessorDescriptor,
  limitDiagnostic,
  noteScriptRemoval,
  stopWith,
  type PathContext,
  type VisitValue,
  type WalkState,
} from './security-runtime.js';
import {
  readDescriptorKeys,
  readPropertyDescriptors,
} from './security-reflection.js';

export function visitObject(
  value: object,
  context: PathContext,
  state: WalkState,
  visitValue: VisitValue,
): Record<string, unknown> | undefined {
  const descriptors = readPropertyDescriptors(value, context, state, 'object');
  if (!descriptors || state.failed) {
    return undefined;
  }

  const keys = readDescriptorKeys(descriptors, context, state, 'object');
  if (!keys || state.failed) {
    return undefined;
  }
  if (keys.length > SECURITY_LIMITS.objectKeys) {
    stopWith(
      state,
      limitDiagnostic(context.path, 'Snapshot object key limit was exceeded'),
    );
    return undefined;
  }
  if (state.stack.has(value)) {
    stopWith(
      state,
      invalidDiagnostic(
        context.path,
        'Snapshot values must not contain cycles',
      ),
    );
    return undefined;
  }
  state.stack.add(value);
  try {
    const clone: Record<string, unknown> = {};
    for (const key of keys) {
      if (state.failed) {
        break;
      }
      const propertyPath = appendPath(context.path, key);

      addBytes(state, context, propertyPath, utf8ByteLength(key));
      if (state.failed) {
        break;
      }
      if (isDangerousKey(key)) {
        stopWith(state, dangerousDiagnostic(propertyPath), {
          sourcePath: propertyPath,
          disposition: 'dropped',
          message: 'dangerous object keys were rejected',
        });
        break;
      }
      const descriptor = descriptors[key];
      if (!descriptor) {
        stopWith(
          state,
          invalidDiagnostic(propertyPath, 'Snapshot object reflection failed'),
        );
        break;
      }
      if (!descriptor.enumerable) {
        stopWith(
          state,
          invalidDiagnostic(
            propertyPath,
            'Snapshot object properties must be enumerable',
          ),
        );
        break;
      }
      if (isAccessorDescriptor(descriptor)) {
        stopWith(
          state,
          invalidDiagnostic(
            propertyPath,
            'Snapshot object properties must be own data properties',
          ),
        );
        break;
      }
      const childContext = {
        depth: context.depth + 1,
        inExtension: context.inExtension || key === 'unknownProperties',
        path: propertyPath,
      };
      if (context.path === '/' && key === 'automation') {
        visitAutomation(descriptor.value, childContext, state, visitValue);
        continue;
      }
      if (context.inExtension && isScriptLikeKey(key)) {
        noteScriptRemoval(state, propertyPath);
        visitValue(descriptor.value, childContext, state);
        continue;
      }
      if (context.inExtension && isScriptPayloadRecord(descriptor.value)) {
        noteScriptRemoval(state, propertyPath);
        visitValue(descriptor.value, childContext, state);
        continue;
      }
      if (context.inExtension && isScriptPayloadArray(descriptor.value)) {
        visitAutomation(descriptor.value, childContext, state, visitValue);
        continue;
      }
      const child = visitValue(descriptor.value, childContext, state);
      if (state.failed) {
        break;
      }
      clone[key] = child;
    }
    return state.failed ? undefined : clone;
  } finally {
    state.stack.delete(value);
  }
}
