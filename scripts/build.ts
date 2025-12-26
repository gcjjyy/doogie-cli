#!/usr/bin/env bun

import { spawn } from 'bun';
import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';

const DIST_DIR = './dist';

interface BuildTarget {
  name: string;
  target: string;
  outfile: string;
}

const BUILD_TARGETS: BuildTarget[] = [
  {
    name: 'macOS (Apple Silicon)',
    target: 'bun-darwin-arm64',
    outfile: 'doogie-cli-macos-arm64',
  },
  {
    name: 'macOS (Intel)',
    target: 'bun-darwin-x64',
    outfile: 'doogie-cli-macos-x64',
  },
  {
    name: 'Linux (x64)',
    target: 'bun-linux-x64',
    outfile: 'doogie-cli-linux-x64',
  },
];

async function build(target: BuildTarget): Promise<boolean> {
  console.log(`\n📦 Building for ${target.name}...`);

  const proc = spawn([
    'bun',
    'build',
    '--compile',
    `--target=${target.target}`,
    './src/index.ts',
    `--outfile=${DIST_DIR}/${target.outfile}`,
  ], {
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.log(`✅ ${target.name} build successful!`);
    return true;
  } else {
    console.error(`❌ ${target.name} build failed!`);
    return false;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const buildAll = args.includes('--all');

  console.log('🚀 Doogie CLI Build Script\n');

  // Clean dist directory
  if (existsSync(DIST_DIR)) {
    await rm(DIST_DIR, { recursive: true });
  }
  await mkdir(DIST_DIR, { recursive: true });

  let targets: BuildTarget[];

  if (buildAll) {
    targets = BUILD_TARGETS;
  } else {
    // Detect current platform
    const platform = process.platform;
    const arch = process.arch;

    if (platform === 'darwin') {
      targets = BUILD_TARGETS.filter(t => t.target.includes('darwin'));
    } else {
      targets = BUILD_TARGETS.filter(t => t.target.includes('linux'));
    }

    console.log(`Building for current platform (${platform} ${arch})...`);
  }

  let successCount = 0;
  let failCount = 0;

  for (const target of targets) {
    const success = await build(target);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Build Summary: ${successCount} succeeded, ${failCount} failed`);

  if (successCount > 0) {
    console.log(`\n📁 Output files are in ${DIST_DIR}/`);
  }
}

main().catch((error) => {
  console.error('Build error:', error);
  process.exit(1);
});
