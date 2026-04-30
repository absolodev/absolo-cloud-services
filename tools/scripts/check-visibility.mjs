import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

async function findPackageJsons(dir) {
  const result = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...await findPackageJsons(fullPath));
    } else if (entry.name === 'package.json') {
      result.push(fullPath);
    }
  }
  return result;
}

async function main() {
  const packageJsonPaths = await findPackageJsons(rootDir);
  const packages = {};

  for (const p of packageJsonPaths) {
    try {
      const content = JSON.parse(await fs.readFile(p, 'utf8'));
      if (content.name && content.absolo?.visibility) {
        packages[content.name] = {
          path: p,
          visibility: content.absolo.visibility,
          dependencies: { ...content.dependencies }, // only check runtime dependencies!
        };
      }
    } catch (e) {
      // ignore
    }
  }

  let hasErrors = false;

  for (const [name, pkg] of Object.entries(packages)) {
    if (pkg.visibility === 'public') {
      for (const depName of Object.keys(pkg.dependencies)) {
        const depPkg = packages[depName];
        if (depPkg && depPkg.visibility !== 'public') {
          console.error(`❌ Visibility violation: Public package '${name}' dynamically depends on non-public package '${depName}'`);
          hasErrors = true;
        }
      }
    }
  }

  if (hasErrors) {
    console.error('Lint failed: public-only depends on public-only rule violated.');
    process.exit(1);
  } else {
    console.log('✅ Visibility check passed.');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
