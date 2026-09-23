import type { ExportRequest } from './security.js';
import { execFile } from 'node:child_process';
import {
  access,
  mkdtemp,
  readFile,
  writeFile,
  rm,
  stat,
} from 'node:fs/promises';
import { tmpdir, platform } from 'node:os';
import { join } from 'node:path';
import { validateRequest, validateSvg } from './security.js';
const MAX_OUTPUT = 64 * 1024 * 1024,
  TIMEOUT = 45000;
export async function findInkscape() {
  const paths = [
    process.env.PLOT_FIG_INKSCAPE,
    ...(platform() === 'win32'
      ? [
          join(
            process.env.LOCALAPPDATA ?? '',
            'PlotFigTools',
            'inkscape',
            'Inkscape',
            'bin',
            'inkscape.exe',
          ),
          'C:\\Program Files\\Inkscape\\bin\\inkscape.exe',
        ]
      : [
          '/usr/bin/inkscape',
          '/opt/homebrew/bin/inkscape',
          '/Applications/Inkscape.app/Contents/MacOS/inkscape',
        ]),
  ];
  for (const path of paths)
    if (path)
      try {
        await access(path);
        return path;
      } catch {}
  throw new Error(
    '未找到 Inkscape；请安装并设置 PLOT_FIG_INKSCAPE 为可执行文件绝对路径',
  );
}
export function runInkscape(
  executable: string,
  args: string[],
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile(
      executable,
      args,
      {
        shell: false,
        windowsHide: true,
        timeout: TIMEOUT,
        maxBuffer: 1024 * 1024,
        ...(signal ? { signal } : {}),
      },
      (error, stdout, stderr) =>
        error
          ? reject(
              new Error(
                signal?.aborted
                  ? '导出已取消'
                  : error.killed
                    ? '转换超时'
                    : String(stderr || error.message).slice(0, 1000),
              ),
            )
          : resolve(String(stdout)),
    ),
  );
}
async function boundedRead(path: string) {
  if ((await stat(path)).size > MAX_OUTPUT)
    throw new Error('导出文件超过 64 MiB');
  return readFile(path);
}
async function flatten(
  input: string,
  request: ExportRequest,
  options: { executable: string; signal?: AbortSignal },
) {
  const png = input + '.png',
    meta = validateSvg(request.svg);
  const box = meta.viewBox.split(/[\s,]+/).map(Number);
  if (meta.widthPt * meta.heightPt * (request.dpi / 72) ** 2 > 120000000)
    throw new Error('透明度栅格化超过 120 MP，请降低 DPI');
  await runInkscape(
    options.executable,
    [
      input,
      '--export-type=png',
      '--export-filename=' + png,
      '--export-area-page',
      '--export-background=white',
      '--export-background-opacity=1',
      '--export-dpi=' + request.dpi,
    ],
    options.signal,
  );
  const image = await boundedRead(png);
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${meta.width}" height="${meta.height}" viewBox="${meta.viewBox}"><image x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" xlink:href="data:image/png;base64,${image.toString('base64')}"/></svg>`;
  await writeFile(input, wrapped);
}
export async function convertFigure(
  value: unknown,
  options: { executable: string; signal?: AbortSignal },
) {
  const request = validateRequest(value),
    directory = await mkdtemp(join(tmpdir(), 'plot-fig-export-'));
  try {
    const input = join(directory, 'figure.svg'),
      output = join(directory, 'figure.' + request.format);
    await writeFile(input, request.svg);
    if (request.format === 'eps' && request.flattenTransparency)
      await flatten(input, request, options);
    const args = [
      input,
      '--export-filename=' + output,
      '--export-type=' + request.format,
      '--export-area-page',
      '--export-dpi=' + request.dpi,
    ];
    if (request.textToPath) args.push('--export-text-to-path');
    await runInkscape(options.executable, args, options.signal);
    const bytes = await boundedRead(output),
      magic = bytes.subarray(0, 16).toString();
    if (
      !(request.format === 'pdf'
        ? magic.startsWith('%PDF-')
        : magic.startsWith('%!PS-Adobe-'))
    )
      throw new Error('转换器没有生成有效的目标文件');
    return bytes;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
