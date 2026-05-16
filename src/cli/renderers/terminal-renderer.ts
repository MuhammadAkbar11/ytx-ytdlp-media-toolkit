import { EventStream } from '../../core/runtime/event-stream';
import { DownloadEvent } from '../../types/events';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import ora, { Ora } from 'ora';
import readline from 'readline';
import { runtimeEnvironment } from '../../core/runtime/runtime-environment';

export class TerminalRenderer {
  private unsubscribe?: () => void;
  private progressBar: cliProgress.SingleBar | null = null;
  private hasStartedBar = false;
  private currentPercentage = 0;
  private currentPayload: Record<string, string> = {};
  private spinner: Ora | null = null;
  private estimatedSize: string | null = null;

  constructor(private eventStream: EventStream) {}

  /**
   * Starts listening to events and rendering them.
   */
  start(): void {
    this.unsubscribe = this.eventStream.subscribe((event) => {
      this.render(event);
    });
  }

  /**
   * Stops listening to events.
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.progressBar) {
      this.progressBar.stop();
    }
    if (this.spinner) {
      this.spinner.stop();
    }
  }

  private render(event: DownloadEvent): void {
    switch (event.type) {
      case 'started':
        this.clearProgress();
        this.estimatedSize = event.estimatedSize || null;
        if (runtimeEnvironment.isInteractive) {
          this.spinner = ora(event.message || 'Starting download...').start();
        } else {
          console.log(chalk.blue(`➤ ${event.message || 'Starting download...'}`));
        }
        break;
      case 'completed':
        if (this.spinner) {
          this.spinner.stop();
          this.spinner = null;
        }

        // Ensure bar shows 100% before stopping
        if (this.progressBar) {
          this.progressBar.update(100);
        }
        this.clearProgress();
        console.log(chalk.green('✔ Download completed successfully'));
        break;
      case 'failed':
        if (this.spinner) {
          this.spinner.stop();
          this.spinner = null;
        }
        this.clearProgress();
        console.log(chalk.red(`✘ Download failed: ${event.error}`));
        break;
      case 'warning':
        this.pauseProgressBar();
        console.log(chalk.yellow(`⚠︎ Warning: ${event.message}`));
        this.resumeProgressBar();
        break;
      case 'error':
        this.pauseProgressBar();
        console.log(chalk.red(`✘ Error: ${event.message}`));
        this.resumeProgressBar();
        break;
      case 'item-started':
        this.pauseProgressBar();
        console.log(
          chalk.blue(
            `\n➤ Processing item ${event.itemIndex}/${event.totalItems}`
          )
        );
        this.resumeProgressBar();
        break;
      case 'progress': {
        // Stop spinner when progress starts
        if (this.spinner) {
          if (runtimeEnvironment.isInteractive) {
            this.spinner.stopAndPersist({
              symbol: '➤',
              text: 'Download is Processing',
            });
          }
          this.spinner = null;
        }

        if (!runtimeEnvironment.isInteractive) {
          // In non-interactive mode, we might want to log progress occasionally, 
          // but usually we just want to avoid the spam. 
          // For now, let's just avoid the progress bar.
          break;
        }

        const percentage = event.progress.percentage ?? 0;

        // Ignore progress updates that go backwards (e.g. when post-processing starts)
        if (percentage < this.currentPercentage) {
          break;
        }

        this.currentPercentage = percentage;

        const speed = event.progress.speed ?? 'unknown';
        const eta = event.progress.eta ?? 'unknown';
        const totalSize = event.progress.totalSize ?? 'unknown';
        this.currentPayload = { speed, eta, totalSize };

        if (!this.progressBar) {
          const sizeFormat = this.estimatedSize
            ? `Download Size (Est. Size): {totalSize} (${this.estimatedSize})`
            : `Download Size: {totalSize}`;
          this.progressBar = new cliProgress.SingleBar({
            format:
              '➤ Downloading |' +
              chalk.cyan('{bar}') +
              `| {percentage}% || Speed: {speed} || ETA: {eta} || ${sizeFormat}`,
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
            clearOnComplete: false,
            barsize: 25,
          });
        }

        if (!this.hasStartedBar) {
          this.progressBar.start(100, percentage, this.currentPayload);
          this.hasStartedBar = true;
        } else {
          this.progressBar.update(percentage, this.currentPayload);
        }
        break;
      }
    }
  }

  private pauseProgressBar(): void {
    if (this.progressBar && runtimeEnvironment.isInteractive) {
      // Clear the current line to avoid ghost bars when resuming
      if (runtimeEnvironment.supportsCursorControl) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
      }
      this.progressBar.stop();
    }
    if (this.spinner) {
      this.spinner.stop();
    }
  }

  private resumeProgressBar(): void {
    if (this.progressBar && this.hasStartedBar) {
      this.progressBar.start(100, this.currentPercentage, this.currentPayload);
    } else if (this.spinner) {
      this.spinner.start();
    }
  }

  private clearProgress(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
    if (this.progressBar) {
      this.progressBar.stop();
      this.progressBar = null;
      this.hasStartedBar = false;
      this.currentPercentage = 0;
      this.currentPayload = {};
    }
    this.estimatedSize = null;
  }
}
