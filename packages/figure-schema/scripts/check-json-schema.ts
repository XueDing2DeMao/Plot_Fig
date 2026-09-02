import { checkSchemaArtifacts } from './schema-artifacts.js';

const result = await checkSchemaArtifacts();

if (!result.ok) {
  const output = result.issues
    .map((issue) => `${issue.reason}: ${issue.fileName}`)
    .join('\n');
  process.stderr.write(`Schema artifacts are out of date:\n${output}\n`);
  process.exit(1);
}
