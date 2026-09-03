import type {
  CompatibilityDisposition,
  CompatibilityItem,
  CompatibilityReport,
} from './types.js';

const dispositions: CompatibilityDisposition[] = [
  'mapped',
  'preservedInExtensions',
  'lossy',
  'dropped',
  'ignoredForSecurity',
];

export function buildCompatibilityReport(
  items: CompatibilityItem[],
): CompatibilityReport {
  const counts = Object.fromEntries(
    dispositions.map((disposition) => [disposition, 0]),
  ) as Record<CompatibilityDisposition, number>;
  for (const item of items) counts[item.disposition] += 1;
  return { items: [...items], counts };
}
