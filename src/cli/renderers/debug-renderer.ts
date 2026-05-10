import { EventStream } from '../../core/runtime/event-stream';
import { DownloadEvent } from '../../types/events';

export class DebugRenderer {
  private unsubscribe?: () => void;

  constructor(
    private eventStream: EventStream,
    private options: { verbose: boolean; debug: boolean }
  ) {}

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
  }

  private render(event: DownloadEvent): void {
    const timestamp = new Date().toISOString();
    
    // Debug mode shows everything including full event JSON
    if (this.options.debug) {
      console.log(`[DEBUG] [${timestamp}] Event:`, JSON.stringify(event));
      return;
    }

    // Verbose mode shows lifecycle events and warnings/errors with more details
    if (this.options.verbose) {
      switch (event.type) {
        case 'started':
          console.log(`[VERBOSE] [${timestamp}] Download started`);
          break;
        case 'completed':
          console.log(`[VERBOSE] [${timestamp}] Download completed`);
          break;
        case 'failed':
          console.log(`[VERBOSE] [${timestamp}] Download failed: ${event.error}`);
          break;
        case 'warning':
          console.log(`[VERBOSE] [${timestamp}] Warning: ${event.message}`);
          break;
        case 'error':
          console.log(`[VERBOSE] [${timestamp}] Error: ${event.message}`);
          break;
        case 'item-started':
          console.log(`[VERBOSE] [${timestamp}] Playlist item started: ${event.itemIndex}/${event.totalItems}`);
          break;
        case 'progress':
          console.log(`[VERBOSE] [${timestamp}] Progress: ${event.progress.percentage}%`);
          break;
      }
    }
  }
}
