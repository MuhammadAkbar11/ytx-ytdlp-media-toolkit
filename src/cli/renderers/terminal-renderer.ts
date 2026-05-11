import { EventStream } from '../../core/runtime/event-stream';
import { DownloadEvent } from '../../types/events';
import chalk from 'chalk';
import cliProgress from 'cli-progress';

export class TerminalRenderer {
  private unsubscribe?: () => void;
  private progressBar: cliProgress.SingleBar | null = null;
  private hasStartedBar = false;
  private currentPercentage = 0;

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
  }

  private render(event: DownloadEvent): void {
    switch (event.type) {
      case 'started':
        this.clearProgress();
        console.log(chalk.green('🚀 Download started'));
        break;
      case 'completed':
        // Ensure bar shows 100% before stopping
        if (this.progressBar) {
          this.progressBar.update(100);
        }
        this.clearProgress();
        console.log(chalk.green('✔ Download completed successfully'));
        break;
      case 'failed':
        this.clearProgress();
        console.log(chalk.red(`✘ Download failed: ${event.error}`));
        break;
      case 'warning':
        this.clearProgress();
        console.log(chalk.yellow(`⚠ Warning: ${event.message}`));
        break;
      case 'error':
        this.clearProgress();
        console.log(chalk.red(`✘ Error: ${event.message}`));
        break;
      case 'item-started':
        this.clearProgress();
        console.log(chalk.blue(`ℹ Processing item ${event.itemIndex}/${event.totalItems}`));
        break;
      case 'progress': {
        const percentage = event.progress.percentage ?? 0;
        
        // Ignore progress updates that go backwards (e.g. when post-processing starts)
        if (percentage < this.currentPercentage) {
          break;
        }
        
        this.currentPercentage = percentage;

        if (!this.progressBar) {
          this.progressBar = new cliProgress.SingleBar({
            format: 'Downloading |' + chalk.cyan('{bar}') + '| {percentage}% || Speed: {speed} || ETA: {eta} || Size: {totalSize}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
            clearOnComplete: false
          });
        }
        
        const speed = event.progress.speed ?? 'unknown';
        const eta = event.progress.eta ?? 'unknown';
        const totalSize = event.progress.totalSize ?? 'unknown';
        
        if (!this.hasStartedBar) {
          this.progressBar.start(100, percentage, { speed, eta, totalSize });
          this.hasStartedBar = true;
        } else {
          this.progressBar.update(percentage, { speed, eta, totalSize });
        }
        break;
      }
    }
  }

  private clearProgress(): void {
    if (this.progressBar) {
      this.progressBar.stop();
      this.progressBar = null;
      this.hasStartedBar = false;
      this.currentPercentage = 0;
    }
  }
}
