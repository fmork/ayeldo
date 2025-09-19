#!/usr/bin/env node
// Build single-file Lambda artifacts into infra/cdk/assets/lambdas
// Option A: prebuild artifacts outside CDK.
import { build } from 'esbuild';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const packagesDir = path.join(repoRoot, 'packages');
const assetsBase = path.join(repoRoot, 'infra', 'cdk', 'assets');
const lambdasOutBase = path.join(assetsBase, 'lambdas');

// Recursively find Lambda handler entry points with pattern:
// packages/<pkg>/src/functions/**/handler.ts
/**
 * Recursively discover Lambda handler entry points.
 * @returns {Promise<Array<{pkg: string, funcId: string, entry: string}>>}
 */
async function findLambdaEntries() {
  /** @type {Array<{pkg:string, funcId:string, entry:string}>} */
  const entries = [];

  const pkgNames = await fs.readdir(packagesDir, { withFileTypes: true });
  for (const ent of pkgNames) {
    if (!ent.isDirectory()) continue;
    const pkg = ent.name; // e.g., 'api', 'bff'
    const functionsDir = path.join(packagesDir, pkg, 'src', 'functions');
    try {
      await fs.access(functionsDir);
    } catch {
      continue;
    }
    // Walk functionsDir and collect any handler.ts
    const stack = [functionsDir];
    while (stack.length) {
      const dir = stack.pop();
      if (!dir) break;
      const items = await fs.readdir(dir, { withFileTypes: true });
      for (const it of items) {
        const full = path.join(dir, it.name);
        if (it.isDirectory()) {
          stack.push(full);
        } else if (it.isFile() && it.name === 'handler.ts') {
          // funcId = path under src/functions, without trailing /handler.ts, slashes -> dashes
          const relFromFunctions = path.relative(functionsDir, full).replace(/\\/g, '/');
          const withoutSuffix = relFromFunctions.replace(/\/handler\.ts$/, '');
          const funcId = withoutSuffix.replace(/\//g, '-');
          entries.push({ pkg, funcId, entry: full });
        }
      }
    }
  }
  return entries;
}

/**
 * @param {string} p
 * @returns {Promise<void>}
 */
async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

/**
 * @param {string} p
 * @param {string} content
 * @returns {Promise<void>}
 */
async function writeText(p, content) {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, content, 'utf8');
}

/**
 * @returns {Promise<void>}
 */
const nativeDeps = ['sharp'];

async function copyNativeDeps(pkg, outDir) {
  try {
    const pkgJsonPath = path.join(packagesDir, pkg, 'package.json');
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
    const declared = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
    for (const dep of nativeDeps) {
      if (!declared || !declared[dep]) continue;

      // In pnpm workspaces, native deps may be hoisted to root node_modules
      const possibleSources = [
        path.join(packagesDir, pkg, 'node_modules', dep),
        path.join(repoRoot, 'node_modules', dep),
        path.join(repoRoot, 'node_modules', '.pnpm', `${dep}@${declared[dep].replace(/^\^/, '')}`, 'node_modules', dep),
      ];

      let src = null;
      for (const candidate of possibleSources) {
        try {
          await fs.access(candidate);
          src = candidate;
          break;
        } catch {
          continue;
        }
      }

      if (!src) {
        console.warn(`Could not find ${dep} in any expected location for ${pkg}`);
        continue;
      }

      const dest = path.join(outDir, 'node_modules', dep);
      await ensureDir(path.dirname(dest));

      // Remove destination if it exists to avoid copy conflicts
      try {
        await fs.rm(dest, { recursive: true, force: true });
      } catch {
        // Ignore errors if destination doesn't exist
      }

      await fs.cp(src, dest, { recursive: true });
      console.log(`  Copied ${dep} from ${path.relative(repoRoot, src)}`);
    }
  } catch (err) {
    console.warn(`Skipping native dependency copy for ${pkg}:`, err?.message ?? err);
  }
}

async function main() {
  const entries = await findLambdaEntries();
  if (entries.length === 0) {
    console.log('No Lambda handlers found under packages/*/src/functions');
    return;
  }

  await ensureDir(lambdasOutBase);

  const results = [];
  for (const { pkg, funcId, entry } of entries) {
    const outDir = path.join(lambdasOutBase, `${pkg}-${funcId}`);
    const outfile = path.join(outDir, 'index.js');
    const tsconfigPath = path.join(repoRoot, 'tsconfig.base.json');

    console.log(`\nBundling ${pkg}/${funcId} -> ${path.relative(repoRoot, outfile)}`);
    const result = await build({
      entryPoints: [entry],
      bundle: true,
      minify: true,
      sourcemap: 'external',
      format: 'cjs',
      platform: 'node',
      target: 'node20',
      outfile,
      metafile: true,
      logLevel: 'info',
      external: nativeDeps,
      // Use root tsconfig for path aliasing to workspace sources
      tsconfig: tsconfigPath,
      legalComments: 'none',
    });

    // Write small meta file with output size summary
    const bytes = Object.values(result.metafile?.outputs ?? {}).reduce((acc, o) => acc + (o.bytes || 0), 0);
    await copyNativeDeps(pkg, outDir);
    await writeText(path.join(outDir, 'meta.json'), JSON.stringify({ bytes }, null, 2));
    results.push({ id: `${pkg}-${funcId}`, bytes });
  }

  // Summary
  results.sort((a, b) => a.bytes - b.bytes);
  console.log('\nBundle sizes:');
  for (const r of results) {
    const kb = (r.bytes / 1024).toFixed(1);
    console.log(` - ${r.id}: ${kb} KiB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
