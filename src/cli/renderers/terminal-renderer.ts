import { EventStream } from '../../core/runtime/event-stream';
import { DownloadEvent } from '../../types/events';
import chalk from 'chalk';

export class TerminalRenderer {
  private unsubscribe?: () => void;
  private lastProgressLine: string = '';

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
    // Clear the progress line if it was the last thing written
    if (this.lastProgressLine) {
      process.stdout.write('\n');
    }
  }

  private render(event: DownloadEvent): void {
    switch (event.type) {
      case 'started':
        this.clearProgress();
        console.log(chalk.green('🚀 Download started'));
        break;
      case 'completed':
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
        const speed = event.progress.speed ?? 'unknown';
        const eta = event.progress.eta ?? 'unknown';
        const totalSize = event.progress.totalSize ?? 'unknown';
        
        const barWidth = 20;
        const filledWidth = Math.round((percentage / 100) * barWidth);
        const emptyWidth = barWidth - filledWidth;
        const bar = '[' + '='.repeat(filledWidth) + ' '.repeat(emptyWidth) + ']';
        
        const line = `${bar} ${percentage}% | Speed: ${speed} | ETA: ${eta} | Size: ${totalSize}`;
        
        // Use \r to overwrite the line
        process.stdout.write(`\r${line}`);
        this.lastProgressLine = line;
        break;
      }
    }
  }

  private clearProgress(): void {
    if (this.lastProgressLine) {
      // Overwrite with spaces and reset cursor
      process.stdout.write('\r' + ' '.repeat(this.lastProgressLine.length) + '\r');
      this.lastProgressLine = '';
    }
  }
}
