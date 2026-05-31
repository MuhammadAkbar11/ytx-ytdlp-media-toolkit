export type Recoverability = 'retryable' | 'configuration' | 'fatal';

export type ErrorCategory =
  | 'validation'
  | 'process'
  | 'configuration'
  | 'network'
  | 'dependency'
  | 'workflow'
  | 'filesystem'
  | 'authentication'
  | 'batch';

export type AppErrorCode =
  | 'INVALID_URL'
  | 'MISSING_YTDLP'
  | 'MISSING_FFMPEG'
  | 'INVALID_CONFIG'
  | 'DOWNLOAD_FAILED'
  | 'OUTPUT_NOT_WRITABLE'
  | 'UNSUPPORTED_BROWSER'
  | 'PERMISSION_DENIED'
  | 'DISK_FULL'
  | 'NETWORK_ERROR'
  | 'AUTH_REQUIRED'
  | 'CONTENT_UNAVAILABLE'
  | 'UNSUPPORTED_URL'
  | 'PLAYLIST_ERROR'
  | 'ARIA2_FAILED'
  | 'PROCESS_SPAWN_FAILED'
  | 'FFMPEG_FAILED'
  | 'RATE_LIMITED'
  | 'BATCH_NO_INPUT'
  | 'BATCH_NO_VALID_URLS'
  | 'BATCH_INVALID_URL'
  | 'BATCH_PLAYLIST_REJECTED'
  | 'BATCH_VALIDATION_ERROR'
  | 'BATCH_UNSUPPORTED_FILE'
  | 'BATCH_FILE_READ_ERROR';

export interface AppError {
  code: AppErrorCode;
  message: string;
  recoverability: Recoverability;
  category: ErrorCategory;
  cause?: unknown;
}
