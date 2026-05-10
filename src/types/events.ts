import { AppError } from './errors';

export interface DownloadProgress {
  type: 'progress';
  percent?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: string;
  eta?: string;
  rawLine: string;
}

export type DownloadEvent =
  | { type: 'started'; title?: string }
  | DownloadProgress
  | { type: 'raw'; stream: 'stdout' | 'stderr'; line: string }
  | { type: 'post_process'; message: string }
  | { type: 'warning'; message: string }
  | { type: 'completed'; outputPaths: string[] }
  | { type: 'failed'; error: AppError };

export type ProcessEvent =
  | { type: 'stdout'; line: string }
  | { type: 'stderr'; line: string }
  | { type: 'exit'; code: number };
