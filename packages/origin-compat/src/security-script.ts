import {
  isPlainRecord,
  reflect,
  readIsArray,
  readOwnDataProperty,
} from './snapshot-validation-helpers.js';
import { isAccessorDescriptor } from './security-runtime.js';

const AUTOMATION_KINDS = new Set(['labtalk', 'origin-c', 'python', 'macro']);

function isAutomationPayloadKind(value: string): boolean {
  return AUTOMATION_KINDS.has(value);
}

export function isScriptPayloadRecord(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (readIsArray(value) !== false || !isPlainRecord(value)) {
    return false;
  }

  const kind = readOwnDataProperty(value, 'kind');
  const text = readOwnDataProperty(value, 'text');
  return (
    kind.ok &&
    typeof kind.value === 'string' &&
    isAutomationPayloadKind(kind.value) &&
    text.ok &&
    typeof text.value === 'string'
  );
}

export function isScriptPayloadArray(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || !readIsArray(value)) {
    return false;
  }

  const descriptors = reflect(() => Object.getOwnPropertyDescriptors(value));
  if (!descriptors.ok) {
    return false;
  }
  const length = descriptors.value.length;
  if (
    !length ||
    isAccessorDescriptor(length) ||
    typeof length.value !== 'number' ||
    !Number.isSafeInteger(length.value) ||
    length.value < 1
  ) {
    return false;
  }

  for (let index = 0; index < length.value; index += 1) {
    const descriptor = descriptors.value[`${index}`];
    if (
      !descriptor ||
      !descriptor.enumerable ||
      isAccessorDescriptor(descriptor) ||
      !isScriptPayloadRecord(descriptor.value)
    ) {
      return false;
    }
  }

  return true;
}
