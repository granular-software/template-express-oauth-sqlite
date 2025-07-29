import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ['react', 'react-dom'],
    banner: {
      js: '"use client";',
    },
  },
  {
    entry: ['src/react/index.ts'],
    outDir: 'dist/react',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    external: ['react', 'react-dom'],
    banner: {
      js: '"use client";',
    },
  },
  {
    entry: ['src/cli.ts'],
    format: ['cjs'],
    outDir: 'dist',
    dts: false,
    platform: 'node',
    target: 'node18',
    shebang: '#!/usr/bin/env node',
    sourcemap: true,
    external: ['react', 'react-dom'],
    clean: false,
  },
  {
    entry: ['src/refresh-cli.ts'],
    format: ['cjs'],
    outDir: 'dist',
    dts: false,
    platform: 'node',
    target: 'node18',
    shebang: '#!/usr/bin/env node',
    sourcemap: true,
    external: ['react', 'react-dom'],
    clean: false,
  },
]) 