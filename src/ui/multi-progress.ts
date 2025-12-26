import pc from 'picocolors';

interface FileProgress {
  filename: string;
  downloaded: number;
  total: number;
  status: 'waiting' | 'downloading' | 'done' | 'error';
}

export class MultiProgress {
  private files: Map<string, FileProgress> = new Map();
  private fileOrder: string[] = [];
  private isStarted = false;
  private maxFilenameLen = 30;

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
    // Print initial state
    for (const filename of this.fileOrder) {
      console.log(this.formatLine(filename));
    }
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
    this.render();
  }

  setError(filename: string): void {
    const file = this.files.get(filename);
    if (!file) return;

    file.status = 'error';
    this.render();
  }

  finish(): void {
    // Move cursor to after the progress display
    // Already at the right position after last render
  }

  private render(): void {
    if (!this.isStarted) return;

    // Move cursor up to the start of our progress display
    const linesToMove = this.fileOrder.length;
    process.stdout.write(`\x1b[${linesToMove}A`);

    // Redraw all lines
    for (const filename of this.fileOrder) {
      // Clear line and print new content
      process.stdout.write('\x1b[2K' + this.formatLine(filename) + '\n');
    }
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

      case 'done':
        statusIcon = pc.green('✓');
        progressBar = pc.green('Done');
        break;

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
