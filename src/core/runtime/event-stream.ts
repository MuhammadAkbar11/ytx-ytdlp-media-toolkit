import { DownloadEvent, EventSubscriber } from '../../types/events';
import { LineClassifier } from './line-classifier';
import { ProgressEventGenerator } from './progress-event-generator';
import { runtimeDiagnostics } from './diagnostics/runtime-diagnostics';
import { ConsoleLogger } from '../../utils/logger';

export class EventStream {
  private subscribers: EventSubscriber[] = [];
  private classifier = new LineClassifier();
  private progressEventGenerator = new ProgressEventGenerator();
  private logger = new ConsoleLogger();

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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Subscriber error during "${event.type}" event: ${errorMessage}`
        );
        runtimeDiagnostics.log(
          'error',
          `Subscriber failure [event=${event.type}]: ${error instanceof Error ? `${error.message}\n${error.stack}` : String(error)}`
        );
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
    runtimeDiagnostics.log(
      'parsed',
      `Classified [${classified.type}] line: ${line}`
    );

    switch (classified.type) {
      case 'progress': {
        const event = this.progressEventGenerator.generate(line);
        if (event) {
          this.emit(event);
        }
        break;
      }
      case 'warning': {
        const warningText = line.replace(/^WARNING:\s*/, '').trim();
        if (warningText) {
          this.emit({ type: 'warning', message: warningText });
        }
        break;
      }
      case 'error': {
        const errorText = line.replace(/^ERROR:\s*/, '').trim();
        if (errorText) {
          this.emit({ type: 'error', message: errorText });
        }
        break;
      }
      case 'info': {
        const trimmed = line.trim();
        const itemMatch = trimmed.match(
          /\[download\]\s+Downloading\s+item\s+(\d+)\s+of\s+(\d+)/
        );
        if (itemMatch) {
          this.emit({
            type: 'item-started',
            itemIndex: parseInt(itemMatch[1], 10),
            totalItems: parseInt(itemMatch[2], 10),
          });
        } else if (trimmed.startsWith('[Merger]')) {
          this.emit({
            type: 'processing',
            action: 'Merging video and audio formats...',
          });
        } else if (trimmed.startsWith('[ExtractAudio]')) {
          this.emit({
            type: 'processing',
            action: 'Extracting and converting audio...',
          });
        } else if (trimmed.startsWith('[Metadata]')) {
          this.emit({ type: 'processing', action: 'Embedding metadata...' });
        } else if (trimmed.startsWith('[Thumbnails]')) {
          this.emit({ type: 'processing', action: 'Embedding thumbnail...' });
        } else if (trimmed.startsWith('[VideoConvertor]')) {
          this.emit({
            type: 'processing',
            action: 'Converting video format...',
          });
        } else if (trimmed.startsWith('[Fixup')) {
          this.emit({
            type: 'processing',
            action: 'Correcting container structure...',
          });
        } else if (
          trimmed.toLowerCase().includes('post-processing') ||
          trimmed.toLowerCase().includes('postprocess')
        ) {
          this.emit({
            type: 'processing',
            action: 'Running post-download tasks...',
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
