import type { NormalizedOriginSnapshot } from './normalize.js';
import type { CompatibilityItem, ImportDiagnostic } from './types.js';

export function preserveUnknown(input: NormalizedOriginSnapshot) {
  const items: CompatibilityItem[] = [];
  const add = (
    object: Record<string, unknown> | undefined,
    path: string,
    targetPath: string,
  ) => {
    for (const key of Object.keys(object ?? {}).sort())
      items.push({
        sourcePath: `${path}/${key}`,
        targetPath,
        disposition: 'preservedInExtensions',
        message: 'declarative Origin property preserved',
      });
  };
  add(input.unknownProperties, '/unknownProperties', '/extensions/origin');
  let offset = 0;
  input.layers.forEach((layer, li) => {
    add(
      layer.unknownProperties,
      `/layers/${li}/unknownProperties`,
      `/panels/${li}/extensions/origin`,
    );
    add(
      layer.xAxis.unknownProperties,
      `/layers/${li}/xAxis/unknownProperties`,
      `/panels/${li}/axes/0/extensions/origin`,
    );
    add(
      layer.yAxis.unknownProperties,
      `/layers/${li}/yAxis/unknownProperties`,
      `/panels/${li}/axes/1/extensions/origin`,
    );
    layer.plots.forEach((plot, pi) =>
      add(
        plot.unknownProperties,
        `/layers/${li}/plots/${pi}/unknownProperties`,
        `/panels/${li}/plotSlots/${pi}/extensions/origin`,
      ),
    );
    layer.annotations.forEach((annotation, ai) =>
      add(
        annotation.unknownProperties,
        `/layers/${li}/annotations/${ai}/unknownProperties`,
        `/annotations/${offset + ai}/extensions/origin`,
      ),
    );
    offset += layer.annotations.length;
  });
  return {
    items,
    diagnostics: items.map((item): ImportDiagnostic => ({
      code: 'ORIGIN_UNSUPPORTED_PROPERTY',
      severity: 'info',
      sourcePath: item.sourcePath,
      ...(item.targetPath ? { targetPath: item.targetPath } : {}),
      message: item.message,
      recoverable: true,
    })),
  };
}

export function validateSlotRequirements(
  input: NormalizedOriginSnapshot,
): ImportDiagnostic[] {
  const seen = new Map<
    string,
    { role: string; valueType: string; path: string }
  >();
  const diagnostics: ImportDiagnostic[] = [];
  input.layers.forEach((layer, li) =>
    layer.plots.forEach((plot, pi) =>
      Object.entries(plot.bindings).forEach(([role, requirement]) => {
        const sourcePath = `/layers/${li}/plots/${pi}/bindings/${role}`;
        const previous = seen.get(requirement.slotId);
        if (
          previous &&
          (previous.role !== role ||
            previous.valueType !== requirement.valueType)
        )
          diagnostics.push({
            code: 'ORIGIN_INVALID_REFERENCE',
            severity: 'error',
            sourcePath,
            message: `${requirement.slotId} conflicts with ${previous.path}`,
            recoverable: false,
          });
        else if (!previous)
          seen.set(requirement.slotId, {
            role,
            valueType: requirement.valueType,
            path: sourcePath,
          });
      }),
    ),
  );
  return diagnostics;
}
