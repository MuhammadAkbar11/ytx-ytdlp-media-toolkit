import { DownloadProgress } from '../core/runtime/progress-event-generator';

export type DownloadEvent =
  | { type: 'started'; message?: string; estimatedSize?: string }
  | { type: 'progress'; progress: DownloadProgress }
  | { type: 'warning'; message: string }
  | { type: 'error'; message: string }
  | { type: 'completed' }
  | { type: 'failed'; error: string }
  | { type: 'item-started'; itemIndex: number; totalItems: number }
  | { type: 'processing'; action: string }
  | { type: 'debug'; message: string };

export type EventSubscriber = (event: DownloadEvent) => void;
