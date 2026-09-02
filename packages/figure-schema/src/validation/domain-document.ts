import type { FigureDocument } from '../schema/figure-document.js';
import { validateExtensionEntries } from './domain-extensions.js';
import { validateFigureTemplateDomain } from './domain-template.js';
import type { ValidationIssue } from './types.js';

type BindingContext = {
  requiredSlots: Set<string>;
  seenSlots: Set<string>;
  slots: Map<string, FigureDocument['templateSnapshot']['dataSlots'][number]>;
  sources: Map<string, FigureDocument['dataSources'][number]>;
};

function domainIssue(path: string, message: string): ValidationIssue {
  return {
    code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
    path,
    message,
  };
}

function validateDataSourceColumns(
  source: FigureDocument['dataSources'][number],
  sourceIndex: number,
): ValidationIssue[] {
  const seenColumns = new Set<string>();
  const issues: ValidationIssue[] = [];

  source.columns.forEach((column, columnIndex) => {
    if (seenColumns.has(column.columnId)) {
      issues.push(
        domainIssue(
          `/dataSources/${sourceIndex}/columns/${columnIndex}/columnId`,
          `duplicate column "${column.columnId}"`,
        ),
      );
      return;
    }
    seenColumns.add(column.columnId);
  });

  return issues;
}

function validateDataSources(value: FigureDocument): ValidationIssue[] {
  const seenSources = new Set<string>();
  const issues: ValidationIssue[] = [];

  value.dataSources.forEach((source, sourceIndex) => {
    issues.push(...validateDataSourceColumns(source, sourceIndex));
    if (seenSources.has(source.sourceId)) {
      issues.push(
        domainIssue(
          `/dataSources/${sourceIndex}/sourceId`,
          `duplicate source "${source.sourceId}"`,
        ),
      );
      return;
    }
    seenSources.add(source.sourceId);
  });

  return issues;
}

function createBindingContext(value: FigureDocument): BindingContext {
  const requiredSlots = new Set(
    value.templateSnapshot.dataSlots
      .filter((slot) => slot.required)
      .map((slot) => slot.dataSlotId),
  );
  const slots = new Map<
    string,
    FigureDocument['templateSnapshot']['dataSlots'][number]
  >();
  const sources = new Map<string, FigureDocument['dataSources'][number]>();

  value.templateSnapshot.dataSlots.forEach((slot) => {
    if (!slots.has(slot.dataSlotId)) {
      slots.set(slot.dataSlotId, slot);
    }
  });
  value.dataSources.forEach((source) => {
    if (!sources.has(source.sourceId)) {
      sources.set(source.sourceId, source);
    }
  });

  return { requiredSlots, seenSlots: new Set<string>(), slots, sources };
}

function validateBindingSlot(
  binding: FigureDocument['bindingSet'][number],
  path: string,
  context: BindingContext,
): {
  issues: ValidationIssue[];
  slot?: FigureDocument['templateSnapshot']['dataSlots'][number];
} {
  const issues: ValidationIssue[] = [];
  const slot = context.slots.get(binding.dataSlotId);

  context.requiredSlots.delete(binding.dataSlotId);
  if (context.seenSlots.has(binding.dataSlotId)) {
    issues.push(
      domainIssue(
        `${path}/dataSlotId`,
        'each dataSlotId may only be bound once',
      ),
    );
  } else {
    context.seenSlots.add(binding.dataSlotId);
  }
  if (!slot) {
    issues.push(
      domainIssue(
        `${path}/dataSlotId`,
        `unknown data slot "${binding.dataSlotId}"`,
      ),
    );
  }

  return slot ? { issues, slot } : { issues };
}

function validateBindingSourceColumn(args: {
  binding: FigureDocument['bindingSet'][number];
  path: string;
  slot: FigureDocument['templateSnapshot']['dataSlots'][number];
  context: BindingContext;
}): ValidationIssue[] {
  const source = args.context.sources.get(args.binding.sourceId);
  if (!source) {
    return [
      domainIssue(
        `${args.path}/sourceId`,
        `unknown source "${args.binding.sourceId}"`,
      ),
    ];
  }

  const column = source.columns.find(
    (entry) => entry.columnId === args.binding.columnId,
  );
  if (!column) {
    return [
      domainIssue(
        `${args.path}/columnId`,
        `unknown column "${args.binding.columnId}"`,
      ),
    ];
  }
  if (column.valueType !== args.slot.valueType) {
    return [
      domainIssue(
        `${args.path}/columnId`,
        `column "${args.binding.columnId}" is incompatible with slot "${args.binding.dataSlotId}"`,
      ),
    ];
  }

  return [];
}

function validateBinding(
  binding: FigureDocument['bindingSet'][number],
  bindingIndex: number,
  context: BindingContext,
): ValidationIssue[] {
  const path = `/bindingSet/${bindingIndex}`;
  const slotValidation = validateBindingSlot(binding, path, context);
  if (!slotValidation.slot) {
    return slotValidation.issues;
  }

  return [
    ...slotValidation.issues,
    ...validateBindingSourceColumn({
      binding,
      path,
      slot: slotValidation.slot,
      context,
    }),
  ];
}

function validateBindingSet(value: FigureDocument): ValidationIssue[] {
  const context = createBindingContext(value);
  const issues: ValidationIssue[] = [];

  value.bindingSet.forEach((binding, bindingIndex) => {
    issues.push(...validateBinding(binding, bindingIndex, context));
  });
  if (context.requiredSlots.size > 0) {
    issues.push(
      domainIssue(
        '/bindingSet',
        `missing required bindings for ${[...context.requiredSlots].sort().join(', ')}`,
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
    ...validateDataSources(value),
    ...validateBindingSet(value),
    ...validateExtensionEntries([
      ['/documentExtensions/origin', value.documentExtensions?.origin],
    ]),
  ];
}
