import { DownloadEvent, EventSubscriber } from '../../types/events';
import { LineClassifier } from './line-classifier';
import { ProgressEventGenerator } from './progress-event-generator';
import { runtimeDiagnostics } from './diagnostics/runtime-diagnostics';

export class EventStream {
  private subscribers: EventSubscriber[] = [];
  private classifier = new LineClassifier();
  private progressEventGenerator = new ProgressEventGenerator();

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
    runtimeDiagnostics.log('event', JSON.stringify(event));
    for (const subscriber of this.subscribers) {
      try {
        subscriber(event);
      } catch (error) {
        runtimeDiagnostics.log('error', `Subscriber failure: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Processes a raw line from yt-dlp and emits corresponding events.
   *
   * @param line The raw line from stdout/stderr.
   */
  processLine(line: string): void {
    const classified = this.classifier.classify(line);
    runtimeDiagnostics.log('parsed', `Classified [${classified.type}] line: ${line}`);

    switch (classified.type) {
      case 'progress': {
        const event = this.progressEventGenerator.generate(line);
        if (event) {
          this.emit(event);
        }
        break;
      }
      case 'warning':
        this.emit({ type: 'warning', message: line.replace(/^WARNING:/, '').trim() });
        break;
      case 'error':
        this.emit({ type: 'error', message: line.replace(/^ERROR:/, '').trim() });
        break;
      case 'info': {
        const itemMatch = line.match(/\[download\]\s+Downloading\s+item\s+(\d+)\s+of\s+(\d+)/);
        if (itemMatch) {
          this.emit({
            type: 'item-started',
            itemIndex: parseInt(itemMatch[1], 10),
            totalItems: parseInt(itemMatch[2], 10),
          });
        }
        break;
      }
      default:
        // Ignore unknown lines for now
        break;
    }
  }
}
