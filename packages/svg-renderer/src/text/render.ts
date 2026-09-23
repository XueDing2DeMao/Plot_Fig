import { escapeXml, formatNumber } from '../geometry.js';
import type { TextLayout } from './types.js';

const n = formatNumber;
const esc = escapeXml;

export function renderText(layout: TextLayout, role: string): string {
  const { font, options } = layout;
  const transform = options.rotation
    ? ` transform="rotate(${n(options.rotation)} ${n(options.x)} ${n(options.y)})"`
    : '';
  const box = layout.boxBounds;
  const hasBox =
    options.background !== undefined || (options.border?.widthPt ?? 0) > 0;
  const rectangle = hasBox
    ? `<rect data-role="${esc(role)}-box" x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}" fill="${esc(options.background ?? 'none')}" stroke="${esc(options.border?.color ?? 'none')}" stroke-width="${n(options.border?.widthPt ?? 0)}"${transform} />`
    : '';
  const simple = (line: (typeof layout.lines)[number]) =>
    line.runs.every((run) => run.kind === 'text' && run.script === 'normal');
  const singleLine = layout.lines.length === 1 && simple(layout.lines[0]!);
  const origin = singleLine ? layout.lines[0]! : options;
  const body = singleLine
    ? esc(layout.lines[0]!.text)
    : layout.lines
        .flatMap((line) =>
          simple(line)
            ? [
                `<tspan x="${n(line.x)}" y="${n(line.y)}">${esc(line.text)}</tspan>`,
              ]
            : line.runs.map(
                (run, runIndex) =>
                  `<tspan${runIndex === 0 ? ` x="${n(run.x)}"` : ''} y="${n(run.y)}" font-size="${n(run.fontSizePt)}" data-script="${run.script}"${run.kind === 'math' ? ` data-math-source="${esc(run.text)}"` : ''}>${esc(run.text)}</tspan>`,
              ),
        )
        .join('');
  const weight = font.bold ? ' font-weight="bold"' : '';
  const style = font.italic ? ' font-style="italic"' : '';
  if (
    layout.lines.some((line) => line.runs.some((run) => run.kind === 'math'))
  ) {
    const content = layout.lines
      .flatMap((line) => {
        const chunks: string[] = [];
        let textRuns: typeof line.runs = [];
        const flushTextRuns = () => {
          if (!textRuns.length) return;
          const first = textRuns[0]!;
          const textLength = textRuns.reduce((sum, run) => sum + run.width, 0);
          const runs = textRuns
            .map(
              (run) =>
                `<tspan y="${n(run.y)}" font-size="${n(run.fontSizePt)}" data-script="${run.script}">${esc(run.text)}</tspan>`,
            )
            .join('');
          chunks.push(
            `<text x="${n(first.x)}" y="${n(first.y)}" textLength="${n(textLength)}" lengthAdjust="spacingAndGlyphs" font-family="${esc(font.fontFamily)}" font-size="${n(font.fontSizePt)}" fill="${esc(font.color)}"${weight}${style}>${runs}</text>`,
          );
          textRuns = [];
        };
        for (const run of line.runs) {
          if (run.kind === 'text') {
            textRuns.push(run);
            continue;
          }
          flushTextRuns();
          chunks.push(
            run.mathSvg
              ? run.mathSvg.replace(
                  '<svg ',
                  `<svg x="${n(run.x)}" y="${n(run.y - run.ascent)}" width="${n(run.width)}" height="${n(run.ascent + run.descent)}" color="${esc(font.color)}" `,
                )
              : `<text x="${n(run.x)}" y="${n(run.y)}" font-family="${esc(font.fontFamily)}" font-size="${n(run.fontSizePt)}" fill="${esc(font.color)}"${weight}${style}>${esc(run.text)}</text>`,
          );
        }
        flushTextRuns();
        return chunks;
      })
      .join('');
    return `${rectangle}<g data-role="${esc(role)}" data-text-layout="shared"${transform}>${content}</g>`;
  }
  return `${rectangle}<text data-role="${esc(role)}" data-text-layout="shared" x="${n(origin.x)}" y="${n(origin.y)}" font-family="${esc(font.fontFamily)}" font-size="${n(font.fontSizePt)}" fill="${esc(font.color)}"${weight}${style}${transform}>${body}</text>`;
}
