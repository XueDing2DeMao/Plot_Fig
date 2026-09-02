import type { FigureDocument } from '../schema/figure-document.js';
import { validateExtensionEntries } from './domain-extensions.js';
import { validateFigureTemplateDomain } from './domain-template.js';
import type { ValidationIssue } from './types.js';

function domainIssue(path: string, message: string): ValidationIssue {
  return {
    code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
    path,
    message,
  };
}

function validateBindings(value: FigureDocument): ValidationIssue[] {
  const requiredSlots = new Set(
    value.templateSnapshot.dataSlots
      .filter((slot) => slot.required)
      .map((slot) => slot.dataSlotId),
  );
  const seenSlots = new Set<string>();
  const slots = new Map(
    value.templateSnapshot.dataSlots.map((slot) => [slot.dataSlotId, slot]),
  );
  const sources = new Map(
    value.dataSources.map((source) => [source.sourceId, source]),
  );
  const issues: ValidationIssue[] = [];

  value.bindingSet.forEach((binding, bindingIndex) => {
    const path = `/bindingSet/${bindingIndex}`;
    const slot = slots.get(binding.dataSlotId);

    requiredSlots.delete(binding.dataSlotId);
    if (seenSlots.has(binding.dataSlotId)) {
      issues.push(
        domainIssue(
          `${path}/dataSlotId`,
          'each dataSlotId may only be bound once',
        ),
      );
    } else {
      seenSlots.add(binding.dataSlotId);
    }
    if (!slot) {
      issues.push(
        domainIssue(
          `${path}/dataSlotId`,
          `unknown data slot "${binding.dataSlotId}"`,
        ),
      );
      return;
    }

    const source = sources.get(binding.sourceId);
    if (!source) {
      issues.push(
        domainIssue(`${path}/sourceId`, `unknown source "${binding.sourceId}"`),
      );
      return;
    }

    const column = source.columns.find(
      (entry) => entry.columnId === binding.columnId,
    );
    if (!column) {
      issues.push(
        domainIssue(`${path}/columnId`, `unknown column "${binding.columnId}"`),
      );
      return;
    }

    if (column.valueType !== slot.valueType) {
      issues.push(
        domainIssue(
          `${path}/columnId`,
          `column "${binding.columnId}" is incompatible with slot "${binding.dataSlotId}"`,
        ),
      );
    }
  });

  if (requiredSlots.size > 0) {
    issues.push(
      domainIssue(
        '/bindingSet',
        `missing required bindings for ${[...requiredSlots].sort().join(', ')}`,
      ),
    );
  }

  return issues;
}

export function validateFigureDocumentDomain(
  value: FigureDocument,
): ValidationIssue[] {
  return [
    ...validateFigureTemplateDomain(value.templateSnapshot),
    ...validateBindings(value),
    ...validateExtensionEntries([
      ['/documentExtensions/origin', value.documentExtensions?.origin],
    ]),
  ];
}
