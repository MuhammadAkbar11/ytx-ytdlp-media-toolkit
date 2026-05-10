export type Recoverability = 'retryable' | 'configuration' | 'fatal';

export type AppErrorCode =
  | 'INVALID_URL'
  | 'MISSING_YTDLP'
  | 'MISSING_FFMPEG'
  | 'INVALID_CONFIG'
  | 'DOWNLOAD_FAILED'
  | 'OUTPUT_NOT_WRITABLE'
  | 'UNSUPPORTED_BROWSER';

export interface AppError {
  code: AppErrorCode;
  message: string;
  recoverability: Recoverability;
  cause?: unknown;
}
