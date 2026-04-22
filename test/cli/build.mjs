import * as esbuild from 'esbuild';
import { chmod, mkdir } from 'fs/promises';

const outfile = 'dist/mcm-test-setup';

await mkdir('dist', { recursive: true });

await esbuild.build({
  entryPoints: ['mcm-test-setup.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile,
  format: 'cjs',
  banner: {
    js: '#!/usr/bin/env node'
  },
  external: [],
  minify: false,
  sourcemap: false
});

await chmod(outfile, 0o755);

console.log(`Built: ${outfile}`);
