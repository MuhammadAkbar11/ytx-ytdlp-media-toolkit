import { DownloadProgress } from '../core/runtime/progress-parser';

export type DownloadEvent =
  | { type: 'started' }
  | { type: 'progress'; progress: DownloadProgress }
  | { type: 'warning'; message: string }
  | { type: 'error'; message: string }
  | { type: 'completed' }
  | { type: 'failed'; error: string }
  | { type: 'item-started'; itemIndex: number; totalItems: number };

export type EventSubscriber = (event: DownloadEvent) => void;
