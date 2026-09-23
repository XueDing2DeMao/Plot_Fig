import { validateExtensionEntries } from './domain-extensions.js';
import { validateAdvancedAxes } from './domain-axis-advanced.js';
import { validatePanelFrameLinks } from '../panel-frame-links.js';
import { validateYAxisAlignments } from './domain-axis-alignment.js';
import { validateAxisLengthRatios } from './domain-axis-length-ratio.js';
import { validatePublication } from './domain-publication.js';
import { collectTemplateExtensionEntries } from './domain-template-extensions.js';
import { validatePanelDomain } from './domain-template-plots.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import type { ValidationIssue } from './types.js';

type IdentifierEntry = { path: string; value: string };

const NUMERIC_ROLES = new Set([
  'valueError',
  'valueErrorLower',
  'valueErrorUpper',
  'value',
  'values',
  'z',
  'x',
  'y',
  'xError',
  'xErrorLower',
  'xErrorUpper',
  'yError',
  'yErrorLower',
  'yErrorUpper',
  'size',
]);
const TEXTUAL_ROLES = new Set<string>();

function domainIssue(path: string, message: string): ValidationIssue {
  return {
    code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
    path,
    message,
  };
}

function collectIdentifierEntries(value: FigureTemplate): IdentifierEntry[] {
  const entries: IdentifierEntry[] = [
    { path: '/templateId', value: value.templateId },
  ];

  value.panels.forEach((panel, panelIndex) => {
    entries.push({
      path: `/panels/${panelIndex}/panelId`,
      value: panel.panelId,
    });
    panel.axes.forEach((axis, axisIndex) => {
      entries.push({
        path: `/panels/${panelIndex}/axes/${axisIndex}/axisId`,
        value: axis.axisId,
      });
    });
    panel.plotSlots.forEach((plotSlot, plotSlotIndex) => {
      entries.push({
        path: `/panels/${panelIndex}/plotSlots/${plotSlotIndex}/plotSlotId`,
        value: plotSlot.plotSlotId,
      });
    });
  });

  value.dataSlots.forEach((slot, slotIndex) => {
    entries.push({
      path: `/dataSlots/${slotIndex}/dataSlotId`,
      value: slot.dataSlotId,
    });
  });
  value.annotations.forEach((annotation, annotationIndex) => {
    entries.push({
      path: `/annotations/${annotationIndex}/annotationId`,
      value: annotation.annotationId,
    });
  });

  return entries;
}

function validateUniqueIds(value: FigureTemplate): ValidationIssue[] {
  const seen = new Set<string>();
  const issues: ValidationIssue[] = [];

  for (const entry of [
    ...collectIdentifierEntries(value),
    ...(value.sharedAxisGroups ?? []).map((g, i) => ({
      path: `/sharedAxisGroups/${i}/groupId`,
      value: g.groupId,
    })),
  ]) {
    if (seen.has(entry.value)) {
      issues.push(
        domainIssue(entry.path, `duplicate identifier "${entry.value}"`),
      );
      continue;
    }
    seen.add(entry.value);
  }

  return issues;
}

function validateSlotValueTypes(value: FigureTemplate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  value.dataSlots.forEach((slot, slotIndex) => {
    if (NUMERIC_ROLES.has(slot.role) && slot.valueType !== 'number') {
      issues.push(
        domainIssue(
          `/dataSlots/${slotIndex}/valueType`,
          `${slot.role} slots must use number valueType`,
        ),
      );
    }
    if (TEXTUAL_ROLES.has(slot.role) && slot.valueType === 'number') {
      issues.push(
        domainIssue(
          `/dataSlots/${slotIndex}/valueType`,
          `${slot.role} slots must use category or string valueType`,
        ),
      );
    }
  });

  return issues;
}

function validateAnnotations(value: FigureTemplate): ValidationIssue[] {
  const panels = new Map(value.panels.map((panel) => [panel.panelId, panel]));
  const issues: ValidationIssue[] = [];

  value.annotations.forEach((annotation, annotationIndex) => {
    if (annotation.coordinateSpace === 'page') {
      return;
    }

    const path = `/annotations/${annotationIndex}`;
    const panel = panels.get(annotation.panelId);
    if (!panel) {
      issues.push(
        domainIssue(
          `${path}/panelId`,
          'annotation panelId must reference an existing panel',
        ),
      );
      return;
    }
    if (annotation.coordinateSpace !== 'data') {
      return;
    }

    const xAxis = panel.axes.find((axis) => axis.axisId === annotation.xAxisId);
    const yAxis = panel.axes.find((axis) => axis.axisId === annotation.yAxisId);
    if (!xAxis || xAxis.dimension !== 'x') {
      issues.push(
        domainIssue(
          `${path}/xAxisId`,
          'xAxisId must reference an x axis in the annotation panel',
        ),
      );
    }
    if (!yAxis || yAxis.dimension !== 'y') {
      issues.push(
        domainIssue(
          `${path}/yAxisId`,
          'yAxisId must reference a y axis in the annotation panel',
        ),
      );
    }
  });

  return issues;
}

export function validateFigureTemplateDomain(
  value: FigureTemplate,
): ValidationIssue[] {
  const slots = new Map(value.dataSlots.map((slot) => [slot.dataSlotId, slot]));
  const issues = [
    ...validateAdvancedAxes(value),
    ...validateUniqueIds(value),
    ...validateSlotValueTypes(value),
    ...validatePanelFrameLinks(value),
    ...validateYAxisAlignments(value),
    ...validateAxisLengthRatios(value),
  ];

  value.panels.forEach((panel, panelIndex) => {
    issues.push(...validatePanelDomain(panel, panelIndex, slots));
  });

  issues.push(...validateAnnotations(value));
  issues.push(...validatePublication(value));
  issues.push(
    ...validateExtensionEntries(collectTemplateExtensionEntries(value)),
  );
  return issues;
}
