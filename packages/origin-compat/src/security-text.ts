import type { OriginTemplateSnapshotV1 } from './snapshot-schema.js';
import type { CompatibilityItem, ImportDiagnostic } from './types.js';

const HTML_TAG_PATTERN = /<\/?[A-Za-z][^>]*>/gu;

function lossDiagnostic(sourcePath: string): ImportDiagnostic {
  return {
    code: 'ORIGIN_LOSSY_CONVERSION',
    severity: 'warning',
    sourcePath,
    message: 'HTML-like tags were removed from declarative text',
    recoverable: true,
    securityCategory: 'html',
  };
}

function lossItem(sourcePath: string): CompatibilityItem {
  return {
    sourcePath,
    disposition: 'lossy',
    message: 'HTML-like tags were removed before mapping',
  };
}

function scrubText(
  diagnostics: ImportDiagnostic[],
  items: CompatibilityItem[],
  sourcePath: string,
  text: string,
  assign: (value: string) => void,
): void {
  const cleaned = text.replace(HTML_TAG_PATTERN, '');
  if (cleaned === text) {
    return;
  }

  assign(cleaned);
  diagnostics.push(lossDiagnostic(sourcePath));
  items.push(lossItem(sourcePath));
}

export function scrubDeclarativeText(input: OriginTemplateSnapshotV1): {
  diagnostics: ImportDiagnostic[];
  items: CompatibilityItem[];
} {
  const diagnostics: ImportDiagnostic[] = [];
  const items: CompatibilityItem[] = [];

  input.layers.forEach((layer, layerIndex) => {
    const axes = [
      ['xAxis', layer.xAxis],
      ['yAxis', layer.yAxis],
    ] as const;

    axes.forEach(([axisName, axis]) => {
      if (!axis.title) {
        return;
      }
      scrubText(
        diagnostics,
        items,
        `/layers/${layerIndex}/${axisName}/title/text`,
        axis.title.text,
        (value) => {
          axis.title!.text = value;
        },
      );
    });

    layer.annotations.forEach((annotation, annotationIndex) => {
      if (annotation.kind !== 'text') {
        return;
      }
      scrubText(
        diagnostics,
        items,
        `/layers/${layerIndex}/annotations/${annotationIndex}/text`,
        annotation.text,
        (value) => {
          annotation.text = value;
        },
      );
    });
  });

  return { diagnostics, items };
}
