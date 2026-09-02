import { appendPath, reflect } from './snapshot-validation-helpers.js';
import {
  invalidDiagnostic,
  isAccessorDescriptor,
  stopWith,
  type PathContext,
  type WalkState,
} from './security-runtime.js';

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export function readDescriptorKeys(
  descriptors: PropertyDescriptorMap,
  context: PathContext,
  state: WalkState,
  kind: 'array' | 'object',
): string[] | undefined {
  const keys = reflect(() => Reflect.ownKeys(descriptors));
  if (!keys.ok) {
    stopWith(
      state,
      invalidDiagnostic(context.path, `Snapshot ${kind} reflection failed`),
    );
    return undefined;
  }
  if (keys.value.some((key) => typeof key === 'symbol')) {
    stopWith(
      state,
      invalidDiagnostic(
        context.path,
        `Snapshot ${kind}s must not use symbol keys`,
      ),
    );
    return undefined;
  }
  return keys.value
    .filter((key): key is string => typeof key === 'string')
    .sort(compareText);
}

export function readPropertyDescriptors(
  value: object,
  context: PathContext,
  state: WalkState,
  kind: 'array' | 'object',
): PropertyDescriptorMap | undefined {
  const descriptors = reflect(() => Object.getOwnPropertyDescriptors(value));
  if (!descriptors.ok) {
    stopWith(
      state,
      invalidDiagnostic(context.path, `Snapshot ${kind} reflection failed`),
    );
    return undefined;
  }
  return descriptors.value;
}

export function readArrayLength(
  descriptors: PropertyDescriptorMap,
  context: PathContext,
  state: WalkState,
): number | undefined {
  const length = descriptors.length;
  if (
    !length ||
    isAccessorDescriptor(length) ||
    typeof length.value !== 'number' ||
    !Number.isSafeInteger(length.value) ||
    length.value < 0
  ) {
    stopWith(
      state,
      invalidDiagnostic(
        appendPath(context.path, 'length'),
        'Snapshot array length must be a safe integer',
      ),
    );
    return undefined;
  }
  return length.value;
}
