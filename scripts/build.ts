#!/usr/bin/env bun

import { spawn } from 'bun';
import { mkdir, rm, cp } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const DIST_DIR = './dist';
const SRC_EXECUTERS_DIR = './src/data/executers';

interface BuildTarget {
  name: string;
  target: string;
  outfile: string;
  platform: 'macos' | 'linux';
  arch: 'arm64' | 'x86_64';
}

const BUILD_TARGETS: BuildTarget[] = [
  {
    name: 'macOS (Apple Silicon)',
    target: 'bun-darwin-arm64',
    outfile: 'doogie-cli-macos-arm64',
    platform: 'macos',
    arch: 'arm64',
  },
  {
    name: 'macOS (Intel)',
    target: 'bun-darwin-x64',
    outfile: 'doogie-cli-macos-x64',
    platform: 'macos',
    arch: 'x86_64',
  },
  {
    name: 'Linux (x64)',
    target: 'bun-linux-x64',
    outfile: 'doogie-cli-linux-x64',
    platform: 'linux',
    arch: 'x86_64',
  },
  {
    name: 'Linux (ARM64)',
    target: 'bun-linux-arm64',
    outfile: 'doogie-cli-linux-arm64',
    platform: 'linux',
    arch: 'arm64',
  },
];

async function copyExecuters(target: BuildTarget): Promise<void> {
  // macOS만 DOSBox-X 번들링
  if (target.platform !== 'macos') {
    return;
  }

  const srcDir = join(SRC_EXECUTERS_DIR, 'macos', target.arch);
  const destDir = join(DIST_DIR, target.outfile + '-dir', 'executers', 'macos', target.arch);

  if (existsSync(srcDir)) {
    await mkdir(destDir, { recursive: true });
    await cp(srcDir, destDir, { recursive: true });
    console.log(`  📋 Copied executers for ${target.arch}`);
  }
}

async function build(target: BuildTarget): Promise<boolean> {
  console.log(`\n📦 Building for ${target.name}...`);

  // 디렉토리 구조로 빌드 (실행파일 + executers)
  const outDir = join(DIST_DIR, target.outfile + '-dir');
  await mkdir(outDir, { recursive: true });

  const proc = spawn([
    'bun',
    'build',
    '--compile',
    `--target=${target.target}`,
    './src/index.ts',
    `--outfile=${outDir}/${target.outfile}`,
  ], {
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const exitCode = await proc.exited;

  if (exitCode === 0) {
    // executers 폴더 복사
    await copyExecuters(target);
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
    console.log(`\n💡 To create release archives:`);
    console.log(`   cd dist`);
    for (const target of targets) {
      console.log(`   tar -czvf ${target.outfile}.tar.gz -C ${target.outfile}-dir .`);
    }
  }
}

main().catch((error) => {
  console.error('Build error:', error);
  process.exit(1);
});
