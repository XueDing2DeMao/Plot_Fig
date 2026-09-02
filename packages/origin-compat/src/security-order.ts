import type { CompatibilityItem, ImportDiagnostic } from './types.js';

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function compareSegment(left: string, right: string): number {
  const numberPattern = /^(0|[1-9]\d*)$/u;
  if (numberPattern.test(left) && numberPattern.test(right)) {
    return Number(left) - Number(right);
  }
  return compareText(left, right);
}

function splitPointer(pointer: string): string[] {
  return pointer === '/' ? [] : pointer.slice(1).split('/');
}

export function comparePointer(left: string, right: string): number {
  const leftParts = splitPointer(left);
  const rightParts = splitPointer(right);
  const length = Math.min(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = compareSegment(leftParts[index]!, rightParts[index]!);
    if (difference !== 0) {
      return difference;
    }
  }

  return leftParts.length - rightParts.length;
}

export function sortDiagnostics(
  diagnostics: ImportDiagnostic[],
): ImportDiagnostic[] {
  return [...diagnostics].sort(
    (left, right) =>
      comparePointer(left.sourcePath, right.sourcePath) ||
      compareText(left.targetPath ?? '', right.targetPath ?? '') ||
      compareText(left.code, right.code) ||
      compareText(left.message, right.message),
  );
}

export function sortItems(items: CompatibilityItem[]): CompatibilityItem[] {
  return [...items].sort(
    (left, right) =>
      comparePointer(left.sourcePath, right.sourcePath) ||
      compareText(left.targetPath ?? '', right.targetPath ?? '') ||
      compareText(left.disposition, right.disposition) ||
      compareText(left.message, right.message),
  );
}
