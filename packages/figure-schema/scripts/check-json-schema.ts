import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'git',
  [
    'status',
    '--porcelain',
    '--untracked-files=all',
    '--',
    'packages/figure-schema/schema',
  ],
  { encoding: 'utf8' },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const output = result.stdout.trim();
if (output.length > 0) {
  process.stderr.write(`Schema artifacts are out of date:\n${output}\n`);
  process.exit(1);
}
