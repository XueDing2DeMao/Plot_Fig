import {
  canonicalizeFigurePayload,
  validateV1210Structure,
} from '@plot-fig/figure-schema';

function templateOf(payload: any) {
  return payload.kind === 'figure-document'
    ? payload.templateSnapshot
    : payload;
}

function carriesF71Fields(payload: any): boolean {
  const template = templateOf(payload);
  if (
    !template ||
    !Array.isArray(template.panels) ||
    !Array.isArray(template.annotations)
  )
    return true;
  for (const panel of template.panels) {
    if (!Array.isArray(panel?.axes) || !Array.isArray(panel?.plotSlots))
      return true;
    for (const axis of panel.axes) {
      if (
        axis?.tickLabels?.textFormat !== undefined ||
        axis?.tickLabels?.layout !== undefined
      )
        return true;
      if (
        axis?.title?.format === 'rich' ||
        axis?.title?.format === 'auto' ||
        axis?.title?.layout !== undefined
      )
        return true;
    }
    for (const plot of panel.plotSlots)
      if (plot?.legendEntry?.format !== undefined) return true;
  }
  for (const annotation of template.annotations)
    if (
      annotation?.format === 'rich' ||
      annotation?.format === 'auto' ||
      annotation?.textStyle?.layout !== undefined
    )
      return true;
  return false;
}

export function migrateV1200ToV1210(input: unknown): unknown {
  const next: any = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    next.schemaVersion !== '1.20.0' ||
    (next.kind === 'figure-document' &&
      next.templateSnapshot?.schemaVersion !== '1.20.0') ||
    carriesF71Fields(next)
  )
    throw new Error('1.20.0图形结构无效');
  next.schemaVersion = '1.21.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.21.0';
  const template = templateOf(next);
  for (const panel of template.panels) {
    for (const axis of panel.axes)
      if (axis.tickLabels.textFormat === undefined)
        axis.tickLabels.textFormat = 'plain';
    for (const plot of panel.plotSlots)
      if (plot.legendEntry.format === undefined)
        plot.legendEntry.format = 'plain';
  }
  if (!validateV1210Structure(next, next.kind))
    throw new Error('1.20.0图形结构无效');
  return next;
}
