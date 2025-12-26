import * as p from '@clack/prompts';
import pc from 'picocolors';
import { $ } from 'bun';
import { platform } from 'os';

function isMac(): boolean {
  return platform() === 'darwin';
}

async function isBrewInstalled(): Promise<boolean> {
  try {
    await $`which brew`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function installBrew(): Promise<boolean> {
  const install = await p.confirm({
    message: 'Homebrew가 설치되어 있지 않습니다. 설치하시겠습니까?',
  });

  if (p.isCancel(install) || !install) {
    p.log.info('Homebrew 없이는 필요한 프로그램을 자동 설치할 수 없습니다.');
    p.log.info('수동 설치: https://brew.sh');
    return false;
  }

  p.log.info('Homebrew 설치를 시작합니다. 관리자 비밀번호가 필요할 수 있습니다.');

  try {
    const proc = Bun.spawn(['bash', '-c', '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'], {
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      p.log.success('Homebrew 설치 완료!');
      return true;
    } else {
      p.log.error('Homebrew 설치 실패');
      return false;
    }
  } catch (error) {
    p.log.error(`Homebrew 설치 중 오류: ${error}`);
    return false;
  }
}

async function ensureBrew(): Promise<boolean> {
  if (await isBrewInstalled()) {
    return true;
  }
  return await installBrew();
}

async function isPackageInstalled(packageName: string): Promise<boolean> {
  try {
    await $`brew list ${packageName}`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function installPackage(packageName: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(['brew', 'install', packageName], {
      stdout: 'inherit',
      stderr: 'inherit',
    });
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function checkAndInstallDosbox(): Promise<boolean> {
  // Check if DOSBox-X or DOSBox is available
  try {
    await $`which dosbox-x`.quiet();
    return true;
  } catch {
    // Not in PATH, continue checking
  }

  try {
    await $`which dosbox`.quiet();
    return true;
  } catch {
    // Not in PATH, continue checking
  }

  // Check macOS app bundle
  if (isMac()) {
    try {
      await $`test -d /Applications/dosbox-x.app`.quiet();
      return true;
    } catch {
      // Not installed as app
    }
  }

  // Not installed, offer to install on Mac
  if (!isMac()) {
    p.log.error('DOSBox가 설치되어 있지 않습니다. 수동으로 설치해주세요.');
    return false;
  }

  if (!(await ensureBrew())) {
    p.log.info('DOSBox-X를 직접 설치해주세요: https://dosbox-x.com');
    return false;
  }

  // Ask user to install
  const install = await p.confirm({
    message: 'DOSBox-X가 설치되어 있지 않습니다. Homebrew로 설치하시겠습니까? (권장)',
  });

  if (p.isCancel(install) || !install) {
    // Ask for regular DOSBox as alternative
    const installDosbox = await p.confirm({
      message: 'DOSBox를 대신 설치하시겠습니까?',
    });

    if (p.isCancel(installDosbox) || !installDosbox) {
      p.log.warn('DOSBox 없이는 게임을 실행할 수 없습니다.');
      return false;
    }

    const s = p.spinner();
    s.start('DOSBox 설치 중...');

    const success = await installPackage('dosbox');
    if (success) {
      s.stop(`${pc.green('✓')} DOSBox 설치 완료!`);
      return true;
    } else {
      s.stop(`${pc.red('✗')} DOSBox 설치 실패`);
      return false;
    }
  }

  const s = p.spinner();
  s.start('DOSBox-X 설치 중...');

  const success = await installPackage('dosbox-x');
  if (success) {
    s.stop(`${pc.green('✓')} DOSBox-X 설치 완료!`);
    return true;
  } else {
    s.stop(`${pc.red('✗')} DOSBox-X 설치 실패`);
    return false;
  }
}

export async function checkAndInstall7zip(): Promise<boolean> {
  // Check if 7z is available
  try {
    await $`which 7z`.quiet();
    return true;
  } catch {
    // Not in PATH
  }

  try {
    await $`which 7za`.quiet();
    return true;
  } catch {
    // Not in PATH
  }

  // Not installed, offer to install on Mac
  if (!isMac()) {
    p.log.error('7-Zip이 설치되어 있지 않습니다. 수동으로 설치해주세요.');
    return false;
  }

  if (!(await ensureBrew())) {
    p.log.info('`brew install p7zip` 명령으로 7-Zip을 설치해주세요.');
    return false;
  }

  // Check if already installed via brew
  if (await isPackageInstalled('p7zip')) {
    return true;
  }

  // Ask user to install
  const install = await p.confirm({
    message: '7-Zip(p7zip)이 설치되어 있지 않습니다. Homebrew로 설치하시겠습니까?',
  });

  if (p.isCancel(install) || !install) {
    p.log.warn('7-Zip 없이는 게임 압축을 해제할 수 없습니다.');
    return false;
  }

  const s = p.spinner();
  s.start('p7zip 설치 중...');

  const success = await installPackage('p7zip');
  if (success) {
    s.stop(`${pc.green('✓')} p7zip 설치 완료!`);
    return true;
  } else {
    s.stop(`${pc.red('✗')} p7zip 설치 실패`);
    return false;
  }
}

