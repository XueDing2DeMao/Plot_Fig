import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { RenderDiagnostic } from './types.js';
import { pageViewport } from './page-size.js';
export function publicationDiagnostics(
  template: FigureTemplate,
  svg: string,
): RenderDiagnostic[] {
  const result: RenderDiagnostic[] = [],
    page = pageViewport(template.page);
  const warn = (sourcePath: string, message: string) =>
    result.push({
      code: 'RENDER_TEMPLATE_INVALID',
      severity: 'warning',
      sourcePath,
      message,
    });
  for (const match of svg.matchAll(
    /data-annotation-id="([^"]+)" data-bounds="([^"]+)"/g,
  )) {
    const [x, y, w, h] = match[2]!.split(' ').map(Number);
    if (x! < 0 || y! < 0 || x! + w! > page.width || y! + h! > page.height)
      warn(
        '/annotations/' + match[1],
        '图例超出图页边界，请调整位置、列数或字号',
      );
  }
  const preset = template.publicationPreset;
  if (!preset) return result;
  const sizes = publicationFontSizes(template);
  if (sizes.some((s) => s < preset.minFontPt || s > preset.maxFontPt))
    warn(
      '/publicationPreset',
      `${preset.name}：部分文字超出建议 ${preset.minFontPt}–${preset.maxFontPt} pt，请检查`,
    );
  return result;
}

function publicationFontSizes(template: FigureTemplate) {
  const sizes = template.panels.flatMap((p) =>
    p.axes.flatMap((a) => [
      a.tickLabels.fontSizePt,
      ...(a.title ? [a.title.fontSizePt] : []),
    ]),
  );
  sizes.push(
    ...template.annotations.flatMap((a) =>
      'textStyle' in a &&
      a.textStyle &&
      !a.annotationId.startsWith('panel-label-')
        ? [a.textStyle.fontSizePt]
        : [],
    ),
  );
  return sizes;
}
