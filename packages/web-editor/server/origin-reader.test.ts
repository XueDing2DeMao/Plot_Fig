import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const reader = fileURLToPath(new URL('./origin-reader.ps1', import.meta.url));
const run = (...args: string[]) =>
  spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', reader, ...args],
    { encoding: 'utf8', timeout: 10_000, windowsHide: true },
  );

describe.skipIf(process.platform !== 'win32')(
  'native reader preflight and ownership guard',
  () => {
    it('rejects invalid input before starting Origin', () => {
      const dir = mkdtempSync(join(tmpdir(), 'plot-fig-reader-test-'));
      try {
        const input = join(dir, 'input.txt');
        writeFileSync(input, 'not a template');
        const result = run(
          '-InputPath',
          input,
          '-OutputPath',
          join(dir, 'result.json'),
          '-OwnerPath',
          join(dir, 'owner.json'),
        );
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('INVALID_INPUT');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('does not terminate an unrelated process from an owner record', () => {
      const dir = mkdtempSync(join(tmpdir(), 'plot-fig-owner-test-'));
      try {
        const owner = join(dir, 'owner.json');
        writeFileSync(
          owner,
          JSON.stringify({
            pid: process.pid,
            startTime: new Date().toISOString(),
            executablePath: process.execPath,
          }),
        );
        const result = run('-CleanupOwnerPath', owner);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('OWNER_MISMATCH');
        expect(process.kill(process.pid, 0)).toBe(true);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('records pre-start cancellation and allows safe cleanup without Origin', () => {
      const dir = mkdtempSync(join(tmpdir(), 'plot-fig-cancel-test-'));
      try {
        const input = join(dir, 'input.otpu'),
          owner = join(dir, 'owner.json'),
          cancel = join(dir, 'cancel');
        writeFileSync(input, 'CPYUA fixture');
        writeFileSync(cancel, 'cancelled');
        const result = run(
          '-InputPath',
          input,
          '-OutputPath',
          join(dir, 'result.json'),
          '-OwnerPath',
          owner,
          '-CancelPath',
          cancel,
        );
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('CANCELLED');
        expect(JSON.parse(readFileSync(owner, 'utf8'))).toEqual({
          state: 'not-started',
        });
        expect(run('-CleanupOwnerPath', owner).status).toBe(0);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('recovers only the unique registered embedding process during COM construction', () => {
      const dir = mkdtempSync(join(tmpdir(), 'plot-fig-candidates-test-'));
      try {
        const exe = 'D:\\Origin\\Origin64.exe';
        const owner = {
          state: 'starting',
          beforeIds: [11],
          startedAt: '2026-09-29T08:17:08.000Z',
          executablePath: exe,
        };
        const candidate = {
          ProcessId: 22,
          Name: 'Origin64.exe',
          ExecutablePath: exe,
          CommandLine: `"${exe}" -Embedding`,
          CreationDate: '2026-09-29T08:17:08.100Z',
        };
        const cases = [
          { name: 'valid', owner, processes: [candidate] },
          {
            name: 'prior',
            owner,
            processes: [{ ...candidate, ProcessId: 11 }],
          },
          {
            name: 'restart',
            owner,
            processes: [{ ...candidate, CommandLine: `"${exe}" /restart` }],
          },
          {
            name: 'extra-arguments',
            owner,
            processes: [
              { ...candidate, CommandLine: `"${exe}" -Embedding /restart` },
            ],
          },
          {
            name: 'other-exe',
            owner,
            processes: [{ ...candidate, ExecutablePath: 'E:\\Origin64.exe' }],
          },
          {
            name: 'spoofed-command',
            owner,
            processes: [
              { ...candidate, CommandLine: '"E:\\Origin64.exe" -Embedding' },
            ],
          },
          {
            name: 'older',
            owner,
            processes: [
              { ...candidate, CreationDate: '2026-09-29T08:17:07.900Z' },
            ],
          },
          {
            name: 'ambiguous',
            owner,
            processes: [candidate, { ...candidate, ProcessId: 23 }],
          },
          {
            name: 'missing-baseline',
            owner: { ...owner, beforeIds: undefined },
            processes: [candidate],
          },
          {
            name: 'restart-plus-owned',
            owner,
            processes: [
              candidate,
              { ...candidate, ProcessId: 23, CommandLine: `"${exe}" /restart` },
            ],
          },
        ];
        const batch = join(dir, 'cases.json');
        writeFileSync(batch, JSON.stringify(cases));
        // Load only the pure candidate selector, never the reader entry point/COM.
        const command = `$ErrorActionPreference='Stop'; $ast=[Management.Automation.Language.Parser]::ParseFile($env:PLOT_FIG_READER_SCRIPT,[ref]$null,[ref]$null); $fn=$ast.Find({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Select-OriginEmbeddingCandidate'},$true); if(!$fn){throw 'MISSING_SELECTOR'}; . ([scriptblock]::Create($fn.Extent.Text)); $cases=[IO.File]::ReadAllText($env:PLOT_FIG_READER_CASES)|ConvertFrom-Json; $results=@(); foreach($case in $cases){try{$selected=@(Select-OriginEmbeddingCandidate $case.owner @($case.processes)); $results+=@{name=$case.name;ids=@($selected|ForEach-Object ProcessId)}}catch{$results+=@{name=$case.name;error=$_.Exception.Message}}}; $results|ConvertTo-Json -Compress -Depth 8`;
        const result = spawnSync(
          'powershell.exe',
          ['-NoProfile', '-NonInteractive', '-Command', command],
          {
            encoding: 'utf8',
            timeout: 10_000,
            windowsHide: true,
            env: {
              ...process.env,
              PLOT_FIG_READER_SCRIPT: reader,
              PLOT_FIG_READER_CASES: batch,
            },
          },
        );
        expect(result.status, result.stderr).toBe(0);
        const results = JSON.parse(result.stdout) as {
          name: string;
          ids?: number[];
          error?: string;
        }[];
        expect(results.find((item) => item.name === 'valid')?.ids).toEqual([
          22,
        ]);
        expect(
          results.find((item) => item.name === 'restart-plus-owned')?.ids,
        ).toEqual([22]);
        for (const name of [
          'prior',
          'restart',
          'extra-arguments',
          'other-exe',
          'spoofed-command',
          'older',
        ])
          expect(results.find((item) => item.name === name)?.ids).toEqual([]);
        expect(
          results.find((item) => item.name === 'ambiguous')?.error,
        ).toContain('OWNER_AMBIGUOUS');
        expect(
          results.find((item) => item.name === 'missing-baseline')?.error,
        ).toContain('OWNER_MISMATCH');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  },
);

it('retains actual native plot properties in checked-in fixtures', () => {
  const root = new URL(
    '../../../tests/fixtures/origin-native/',
    import.meta.url,
  );
  const line = JSON.parse(readFileSync(new URL('line.json', root), 'utf8'));
  const scatter = JSON.parse(
    readFileSync(new URL('scatter.json', root), 'utf8'),
  );
  expect(line.formatVersion).toBe(1);
  expect(line.layers[0].plots[0].format.Line.Color).toBe('22106449');
  expect(scatter.layers[0].plots[0].format.Symbol.Shape).toBe('1');
  expect(line.layers[0].unsupportedPlotIds).toContain(232);
  expect(line.colors['22106449']).toBe('#515151');
  expect(line.fonts['0']).toBe('Arial');
});

it('preserves multiple template curves without consuming later style holders', () => {
  const path = new URL(
    '../../../tests/fixtures/origin-native/multiple.json',
    import.meta.url,
  );
  const snapshot = JSON.parse(readFileSync(path, 'utf8'));
  const plots = snapshot.layers[0].plots;
  expect(plots).toHaveLength(2);
  expect(
    plots.map(
      (plot: { format: { Line: { Color: string; Style: string } } }) => ({
        color: snapshot.colors[plot.format.Line.Color],
        style: plot.format.Line.Style,
      }),
    ),
  ).toEqual([
    { color: '#ff0000', style: '0' },
    { color: '#0000ff', style: '1' },
  ]);
});
