import pc from 'picocolors';

interface FileProgress {
  filename: string;
  downloaded: number;
  total: number;
  status: 'waiting' | 'downloading' | 'done' | 'error';
}

const MAX_DISPLAY_FILES = 5;

export class MultiProgress {
  private files: Map<string, FileProgress> = new Map();
  private fileOrder: string[] = [];
  private completedOrder: string[] = [];  // Track completion order
  private isStarted = false;
  private maxFilenameLen = 30;
  private lastDisplayedLines = 0;

  constructor(filenames: string[]) {
    this.fileOrder = filenames;
    for (const filename of filenames) {
      this.files.set(filename, {
        filename,
        downloaded: 0,
        total: 0,
        status: 'waiting',
      });
    }
  }

  start(): void {
    this.isStarted = true;
    this.render();
  }

  updateProgress(filename: string, downloaded: number, total: number): void {
    const file = this.files.get(filename);
    if (!file) return;

    file.downloaded = downloaded;
    file.total = total;
    file.status = 'downloading';

    this.render();
  }

  setDone(filename: string): void {
    const file = this.files.get(filename);
    if (!file) return;

    file.status = 'done';
    file.downloaded = file.total || 1;
    this.completedOrder.push(filename);
    this.render();
  }

  setError(filename: string): void {
    const file = this.files.get(filename);
    if (!file) return;

    file.status = 'error';
    this.render();
  }

  finish(): void {
    // Final render to show completion
    this.render();
    // Reset for clean output after progress is done
    this.lastDisplayedLines = 0;
  }

  private getActiveFiles(): string[] {
    // Separate downloading and completed files
    const downloading: string[] = [];
    const completed: string[] = [];

    for (const f of this.fileOrder) {
      const file = this.files.get(f);
      if (!file || file.status === 'waiting') continue;

      if (file.status === 'downloading') {
        downloading.push(f);
      } else {
        // done or error
        completed.push(f);
      }
    }

    // Prioritize downloading files, fill remaining slots with recent completed
    const result: string[] = [];

    // Add all downloading files first (up to MAX)
    for (const f of downloading.slice(-MAX_DISPLAY_FILES)) {
      result.push(f);
    }

    // Fill remaining slots with most recent completed files
    const remainingSlots = MAX_DISPLAY_FILES - result.length;
    if (remainingSlots > 0) {
      for (const f of completed.slice(-remainingSlots)) {
        result.push(f);
      }
    }

    // Sort by original order for consistent display
    result.sort((a, b) => this.fileOrder.indexOf(a) - this.fileOrder.indexOf(b));

    return result;
  }

  private getStats(): { done: number; total: number; errors: number } {
    let done = 0;
    let errors = 0;
    for (const file of this.files.values()) {
      if (file.status === 'done') done++;
      if (file.status === 'error') errors++;
    }
    return { done, total: this.fileOrder.length, errors };
  }

  private render(): void {
    if (!this.isStarted) return;

    // Move cursor up to clear previous display
    if (this.lastDisplayedLines > 0) {
      process.stdout.write(`\x1b[${this.lastDisplayedLines}A`);
    }

    const activeFiles = this.getActiveFiles();
    const stats = this.getStats();

    // Build output lines
    const lines: string[] = [];

    // Status line
    const statusLine = `${pc.bold('다운로드:')} ${pc.green(String(stats.done))}/${stats.total} 완료${stats.errors > 0 ? pc.red(` (${stats.errors} 실패)`) : ''}`;
    lines.push(statusLine);

    // Active downloads
    if (activeFiles.length > 0) {
      for (const filename of activeFiles) {
        lines.push(this.formatLine(filename));
      }
    } else if (stats.done < stats.total) {
      lines.push(pc.dim('  대기 중...'));
    }

    // Print lines
    for (const line of lines) {
      process.stdout.write('\x1b[2K' + line + '\n');
    }

    // Clear any remaining old lines if we're printing fewer lines than before
    const extraLines = this.lastDisplayedLines - lines.length;
    for (let i = 0; i < extraLines; i++) {
      process.stdout.write('\x1b[2K\n');
    }

    // Move cursor back up if we printed extra clearing lines
    if (extraLines > 0) {
      process.stdout.write(`\x1b[${extraLines}A`);
    }

    this.lastDisplayedLines = lines.length;
  }

  private formatLine(filename: string): string {
    const file = this.files.get(filename);
    if (!file) return '';

    // Truncate or pad filename
    let displayName = file.filename;
    if (displayName.length > this.maxFilenameLen) {
      displayName = displayName.substring(0, this.maxFilenameLen - 3) + '...';
    }
    displayName = displayName.padEnd(this.maxFilenameLen);

    // Status indicator
    let statusIcon: string;
    let progressBar: string;

    switch (file.status) {
      case 'waiting':
        statusIcon = pc.dim('○');
        progressBar = pc.dim('Waiting...');
        break;

      case 'downloading': {
        statusIcon = pc.cyan('↓');
        const percent = file.total > 0 ? (file.downloaded / file.total) * 100 : 0;
        const barWidth = 20;
        const filled = Math.round((percent / 100) * barWidth);
        const empty = barWidth - filled;
        const bar = pc.cyan('█'.repeat(filled)) + pc.dim('░'.repeat(empty));
        const sizeStr = this.formatSize(file.downloaded, file.total);
        progressBar = `${bar} ${percent.toFixed(0).padStart(3)}% ${sizeStr}`;
        break;
      }

      case 'done': {
        statusIcon = pc.green('✓');
        const barWidth = 20;
        const bar = pc.green('█'.repeat(barWidth));
        const sizeStr = this.formatSize(file.downloaded, file.total);
        progressBar = `${bar} ${pc.green('100%')} ${sizeStr}`;
        break;
      }

      case 'error':
        statusIcon = pc.red('✗');
        progressBar = pc.red('Error');
        break;
    }

    return `${statusIcon} ${pc.bold(displayName)} ${progressBar}`;
  }

  private formatSize(downloaded: number, total: number): string {
    const formatBytes = (bytes: number): string => {
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    if (total > 0) {
      return pc.dim(`${formatBytes(downloaded)}/${formatBytes(total)}`);
    }
    return pc.dim(formatBytes(downloaded));
  }
}
