import { DownloadEvent, EventSubscriber } from '../../types/events';
import { LineClassifier } from './line-classifier';
import { ProgressParser } from './progress-parser';

export class EventStream {
  private subscribers: EventSubscriber[] = [];
  private classifier = new LineClassifier();
  private parser = new ProgressParser();

  /**
   * Subscribes to events.
   * @param subscriber The callback function.
   * @returns A function to unsubscribe.
   */
  subscribe(subscriber: EventSubscriber): () => void {
    this.subscribers.push(subscriber);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== subscriber);
    };
  }

  /**
   * Emits an event to all subscribers.
   * @param event The event to emit.
   */
  emit(event: DownloadEvent): void {
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
  }

  /**
   * Processes a raw line from yt-dlp and emits corresponding events.
   *
   * @param line The raw line from stdout/stderr.
   */
  processLine(line: string): void {
    const classified = this.classifier.classify(line);

    switch (classified.type) {
      case 'progress': {
        const progress = this.parser.parse(line);
        this.emit({ type: 'progress', progress });
        break;
      }
      case 'warning':
        this.emit({ type: 'warning', message: line.replace(/^WARNING:/, '').trim() });
        break;
      case 'error':
        this.emit({ type: 'error', message: line.replace(/^ERROR:/, '').trim() });
        break;
      default:
        // Ignore info and unknown lines for now
        break;
    }
  }
}
