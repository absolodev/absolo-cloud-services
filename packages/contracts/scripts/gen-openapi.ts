/**
 * Emit `openapi/openapi.gen.yaml` from the schema registry.
 *
 * Run via `pnpm --filter @absolo/contracts gen:openapi`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';

import { buildOpenApiDocument } from '../src/openapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '..', 'openapi', 'openapi.gen.yaml');

const doc = buildOpenApiDocument();
const yaml = stringify(doc, { lineWidth: 0 });

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `# GENERATED FILE — DO NOT EDIT.\n# Source: packages/contracts/src/**.ts\n# Run \`pnpm --filter @absolo/contracts gen:openapi\` to regenerate.\n${yaml}`);

const schemaCount = Object.keys(doc.components?.schemas ?? {}).length;
const pathCount = Object.keys(doc.paths ?? {}).length;

console.log(`✓ Wrote ${outPath}`);
console.log(`  ${schemaCount} schemas, ${pathCount} paths.`);
