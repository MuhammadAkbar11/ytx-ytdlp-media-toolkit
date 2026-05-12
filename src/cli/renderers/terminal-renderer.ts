/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventStream } from '../../core/runtime/event-stream';
import { DownloadEvent } from '../../types/events';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import ora from 'ora';

export class TerminalRenderer {
  private unsubscribe?: () => void;
  private progressBar: cliProgress.SingleBar | null = null;
  private hasStartedBar = false;
  private currentPercentage = 0;
  private currentPayload: any = {};
  private spinner: any = null;

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
        console.log(chalk.blue('\n🚀 Download started'));
        this.spinner = ora(event.message || 'Starting download...').start();
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
        console.log(chalk.green('✅️ Download completed successfully'));
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
        console.log(chalk.yellow(`⚠ Warning: ${event.message}`));
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
          chalk.blue(`ℹ Processing item ${event.itemIndex}/${event.totalItems}`)
        );
        this.resumeProgressBar();
        break;
      case 'progress': {
        // Stop spinner when progress starts
        if (this.spinner) {
          this.spinner.stop();
          this.spinner = null;
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
          this.progressBar = new cliProgress.SingleBar({
            format:
              '⏳️ Downloading |' +
              chalk.cyan('{bar}') +
              '| {percentage}% || Speed: {speed} || ETA: {eta} || Size: {totalSize}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
            clearOnComplete: false,
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
    if (this.progressBar) {
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
  }
}
