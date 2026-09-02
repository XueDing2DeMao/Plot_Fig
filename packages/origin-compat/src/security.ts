import type { OriginTemplateSnapshotV1 } from './snapshot-schema.js';
import { validateOriginSnapshot } from './snapshot-schema.js';
import { sortDiagnostics, sortItems } from './security-order.js';
import { scrubDeclarativeText } from './security-text.js';
import { scrubSnapshotClone } from './security-walk.js';
import type { CompatibilityItem, ImportDiagnostic } from './types.js';

type ScrubSuccess = {
  ok: true;
  value: OriginTemplateSnapshotV1;
  diagnostics: ImportDiagnostic[];
  items: CompatibilityItem[];
};

type ScrubFailure = {
  ok: false;
  diagnostics: ImportDiagnostic[];
  items: CompatibilityItem[];
};

function buildFailure(
  diagnostics: ImportDiagnostic[],
  items: CompatibilityItem[],
): ScrubFailure {
  return {
    ok: false,
    diagnostics: sortDiagnostics(diagnostics),
    items: sortItems(items),
  };
}

export function scrubOriginSnapshot(
  input: OriginTemplateSnapshotV1,
): ScrubSuccess | ScrubFailure {
  const clone = scrubSnapshotClone(input);
  if (!clone.ok) {
    return buildFailure(clone.diagnostics, clone.items);
  }

  const candidate = clone.value as OriginTemplateSnapshotV1;
  const text = scrubDeclarativeText(candidate);
  const diagnostics = [...clone.diagnostics, ...text.diagnostics];
  const items = [...clone.items, ...text.items];
  const validated = validateOriginSnapshot(candidate);

  if (!validated.ok) {
    return buildFailure([...diagnostics, ...validated.diagnostics], items);
  }

  return {
    ok: true,
    value: validated.value,
    diagnostics: sortDiagnostics(diagnostics),
    items: sortItems(items),
  };
}
