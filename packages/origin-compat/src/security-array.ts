import { appendPath, readIsArray } from './snapshot-validation-helpers.js';
import { SECURITY_LIMITS } from './security-config.js';
import {
  invalidDiagnostic,
  isAccessorDescriptor,
  limitDiagnostic,
  noteAutomationRemoval,
  stopWith,
  type PathContext,
  type VisitValue,
  type WalkState,
} from './security-runtime.js';
import {
  readArrayLength,
  readDescriptorKeys,
  readPropertyDescriptors,
} from './security-reflection.js';

export function visitAutomation(
  value: unknown,
  context: PathContext,
  state: WalkState,
  visitValue: VisitValue,
): void {
  const isArray = readIsArray(value);
  if (isArray === undefined) {
    stopWith(
      state,
      invalidDiagnostic(context.path, 'Snapshot reflection failed'),
    );
    return;
  }
  if (!isArray) {
    noteAutomationRemoval(state, context.path);
    visitValue(value, context, state);
    return;
  }
  const descriptors = readPropertyDescriptors(
    value as object,
    context,
    state,
    'array',
  );
  if (!descriptors || state.failed) {
    return;
  }
  const length = readArrayLength(descriptors, context, state);
  if (length === undefined || state.failed) {
    return;
  }
  if (length > SECURITY_LIMITS.arrayLength) {
    stopWith(
      state,
      limitDiagnostic(context.path, 'Snapshot array item limit was exceeded'),
    );
    return;
  }
  for (let index = 0; index < length; index += 1) {
    if (state.failed) {
      break;
    }
    const entryPath = appendPath(context.path, `${index}`);
    const descriptor = descriptors[`${index}`];

    noteAutomationRemoval(state, entryPath);
    if (!descriptor) {
      stopWith(
        state,
        invalidDiagnostic(entryPath, 'Snapshot arrays must not be sparse'),
      );
      break;
    }
    if (!descriptor.enumerable) {
      stopWith(
        state,
        invalidDiagnostic(
          entryPath,
          'Snapshot array entries must be enumerable',
        ),
      );
      break;
    }
    if (isAccessorDescriptor(descriptor)) {
      stopWith(
        state,
        invalidDiagnostic(
          entryPath,
          'Snapshot arrays must not include accessors',
        ),
      );
      break;
    }
    visitValue(
      descriptor.value,
      {
        depth: context.depth + 1,
        inExtension: false,
        path: entryPath,
      },
      state,
    );
  }
}

export function visitArray(
  value: object,
  context: PathContext,
  state: WalkState,
  visitValue: VisitValue,
): unknown[] | undefined {
  const descriptors = readPropertyDescriptors(value, context, state, 'array');
  if (!descriptors || state.failed) {
    return undefined;
  }
  const length = readArrayLength(descriptors, context, state);
  if (length === undefined || state.failed) {
    return undefined;
  }
  if (length > SECURITY_LIMITS.arrayLength) {
    stopWith(
      state,
      limitDiagnostic(context.path, 'Snapshot array item limit was exceeded'),
    );
    return undefined;
  }

  const keys = readDescriptorKeys(descriptors, context, state, 'array');
  if (!keys || state.failed) {
    return undefined;
  }
  for (const key of keys) {
    if (key !== 'length' && !/^(0|[1-9]\d*)$/u.test(key)) {
      stopWith(
        state,
        invalidDiagnostic(
          appendPath(context.path, key),
          'Snapshot arrays must not include named properties',
        ),
      );
      return undefined;
    }
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
    const clone: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      if (state.failed) {
        break;
      }
      const key = `${index}`;
      const itemPath = appendPath(context.path, key);
      const descriptor = descriptors[key];

      if (!descriptor) {
        stopWith(
          state,
          invalidDiagnostic(itemPath, 'Snapshot arrays must not be sparse'),
        );
        break;
      }
      if (!descriptor.enumerable) {
        stopWith(
          state,
          invalidDiagnostic(
            itemPath,
            'Snapshot array entries must be enumerable',
          ),
        );
        break;
      }
      if (isAccessorDescriptor(descriptor)) {
        stopWith(
          state,
          invalidDiagnostic(
            itemPath,
            'Snapshot arrays must not include accessors',
          ),
        );
        break;
      }
      const child = visitValue(
        descriptor.value,
        {
          depth: context.depth + 1,
          inExtension: context.inExtension,
          path: itemPath,
        },
        state,
      );
      if (state.failed) {
        break;
      }
      clone.push(child);
    }
    return state.failed ? undefined : clone;
  } finally {
    state.stack.delete(value);
  }
}
