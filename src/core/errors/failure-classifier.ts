import { AppError } from '../../types/errors';
import { createAppError } from '../../utils/errors';
import { ProcessExecutionResult } from '../../types/process';

export interface ClassifiedFailure {
  error: AppError;
  summary: string;
  recovery: string;
  rawDetail?: string;
}

interface PatternRule {
  patterns: string[];
  code: AppError['code'];
  category: AppError['category'];
  recoverability: AppError['recoverability'];
  summary: string;
  recovery: string;
}

const YT_DLP_STDERR_RULES: PatternRule[] = [
  {
    patterns: ['sign in', 'login', 'cookie', 'cookies', 'use --cookies'],
    code: 'AUTH_REQUIRED',
    category: 'authentication',
    recoverability: 'configuration',
    summary: 'This content requires authentication.',
    recovery:
      'Try enabling browser cookies:\n\n  ytx <url> --browser firefox/brave/chrome',
  },
  {
    patterns: ['private', 'members only', 'members-only', 'join this channel'],
    code: 'AUTH_REQUIRED',
    category: 'authentication',
    recoverability: 'configuration',
    summary: 'This content is restricted to members or private.',
    recovery:
      'Try enabling browser cookies with an authenticated session:\n\n  ytx <url> --browser firefox/brave/chrome',
  },
  {
    patterns: ['age', 'age gate', 'age-gate', 'sign in to confirm your age'],
    code: 'AUTH_REQUIRED',
    category: 'authentication',
    recoverability: 'configuration',
    summary: 'This content is age-restricted.',
    recovery:
      'Try enabling browser cookies:\n\n  ytx <url> --browser firefox/brave/chrome',
  },
  {
    patterns: [
      'not available',
      'unavailable',
      'removed',
      'deleted',
      'no longer available',
    ],
    code: 'CONTENT_UNAVAILABLE',
    category: 'process',
    recoverability: 'fatal',
    summary: 'This content is no longer available.',
    recovery:
      'The video may have been removed, made private, or is region-locked.',
  },
  {
    patterns: [
      'unsupported url',
      'unsupported URL',
      'not a valid url',
      'generic extractor',
    ],
    code: 'UNSUPPORTED_URL',
    category: 'validation',
    recoverability: 'fatal',
    summary: 'The URL is not supported.',
    recovery:
      'Ensure the URL points to a supported YouTube video, playlist, or short.',
  },
  {
    patterns: [
      'network is unreachable',
      'connection refused',
      'timed out',
      'connection reset',
      'etimedout',
      'enotfound',
    ],
    code: 'NETWORK_ERROR',
    category: 'network',
    recoverability: 'retryable',
    summary: 'A network error occurred.',
    recovery: 'Check your internet connection and try again.',
  },
  {
    patterns: ['http error 429', 'rate limit', 'too many requests'],
    code: 'RATE_LIMITED',
    category: 'network',
    recoverability: 'retryable',
    summary: 'You are being rate-limited by the server.',
    recovery: 'Wait a few minutes and try again.',
  },
  {
    patterns: ['http error 403', 'forbidden'],
    code: 'AUTH_REQUIRED',
    category: 'authentication',
    recoverability: 'configuration',
    summary: 'Access to this content was denied.',
    recovery:
      'Try enabling browser cookies:\n\n  ytx <url> --browser firefox/brave/chrome',
  },
  {
    patterns: ['http error 404', 'not found'],
    code: 'CONTENT_UNAVAILABLE',
    category: 'process',
    recoverability: 'fatal',
    summary: 'The requested content was not found.',
    recovery: 'Verify the URL is correct and the video still exists.',
  },
  {
    patterns: ['http error 50', 'server error', 'internal server error'],
    code: 'NETWORK_ERROR',
    category: 'network',
    recoverability: 'retryable',
    summary: 'The server returned an error.',
    recovery: 'This is usually temporary. Wait a moment and try again.',
  },
  {
    patterns: ['unable to download', 'extraction failed'],
    code: 'DOWNLOAD_FAILED',
    category: 'process',
    recoverability: 'retryable',
    summary: 'Failed to extract video information.',
    recovery:
      'The video may be temporarily unavailable. Try again later or check the URL.',
  },
];

const PROCESS_ERROR_RULES: PatternRule[] = [
  {
    patterns: ['enoent', 'command not found', 'no such file or directory'],
    code: 'PROCESS_SPAWN_FAILED',
    category: 'dependency',
    recoverability: 'configuration',
    summary: 'A required tool was not found.',
    recovery:
      'Ensure yt-dlp and ffmpeg are installed and available in PATH.\n\n  ytx doctor',
  },
  {
    patterns: ['eacces', 'permission denied'],
    code: 'PERMISSION_DENIED',
    category: 'filesystem',
    recoverability: 'configuration',
    summary: 'Permission denied.',
    recovery: 'Check file and directory permissions for the output path.',
  },
  {
    patterns: ['enospc', 'no space left', 'disk full'],
    code: 'DISK_FULL',
    category: 'filesystem',
    recoverability: 'fatal',
    summary: 'Disk is full.',
    recovery: 'Free up disk space and try again.',
  },
];

const FFMPEG_RULES: PatternRule[] = [
  {
    patterns: ['ffmpeg', 'merger', 'extractaudio', 'videoconvertor'],
    code: 'FFMPEG_FAILED',
    category: 'dependency',
    recoverability: 'configuration',
    summary: 'FFmpeg post-processing failed.',
    recovery:
      'Ensure ffmpeg is installed and available in PATH.\n\n  On Ubuntu/Debian: sudo apt install ffmpeg\n  On Fedora: sudo dnf install ffmpeg',
  },
];

const ARIA2_RULES: PatternRule[] = [
  {
    patterns: ['aria2', 'aria2c', 'external downloader'],
    code: 'ARIA2_FAILED',
    category: 'dependency',
    recoverability: 'configuration',
    summary: 'aria2 external downloader failed.',
    recovery:
      'Ensure aria2 is installed, or try downloading without --aria2.\n\n  On Ubuntu/Debian: sudo apt install aria2',
  },
];

export class FailureClassifier {
  classifyFromProcessResult(
    result: ProcessExecutionResult,
    command?: string
  ): ClassifiedFailure {
    const combined = (result.stderr + '\n' + result.stdout).toLowerCase();

    if (command === 'yt-dlp' || command === undefined) {
      for (const rule of YT_DLP_STDERR_RULES) {
        if (rule.patterns.some((p) => combined.includes(p))) {
          return this.buildClassified(rule, result.stderr);
        }
      }
    }

    for (const rule of FFMPEG_RULES) {
      if (rule.patterns.some((p) => combined.includes(p))) {
        return this.buildClassified(rule, result.stderr);
      }
    }

    for (const rule of ARIA2_RULES) {
      if (rule.patterns.some((p) => combined.includes(p))) {
        return this.buildClassified(rule, result.stderr);
      }
    }

    return {
      error: createAppError(
        'DOWNLOAD_FAILED',
        `yt-dlp exited with code ${result.exitCode}`,
        'fatal',
        'process'
      ),
      summary: `Download failed (exit code ${result.exitCode}).`,
      recovery:
        'Run with --verbose for more details, or check the URL and try again.',
      rawDetail: result.stderr.trim() || undefined,
    };
  }

  classifyFromError(error: unknown): ClassifiedFailure {
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();

    for (const rule of PROCESS_ERROR_RULES) {
      if (rule.patterns.some((p) => lower.includes(p))) {
        return this.buildClassifiedFromMessage(rule, message);
      }
    }

    if (lower.includes('exitprompterror') || lower.includes('abort')) {
      return {
        error: createAppError(
          'DOWNLOAD_FAILED',
          'Operation aborted by user.',
          'fatal',
          'workflow'
        ),
        summary: 'Operation aborted by user.',
        recovery: '',
      };
    }

    return {
      error: createAppError(
        'DOWNLOAD_FAILED',
        message,
        'fatal',
        'process',
        error
      ),
      summary: 'An unexpected error occurred.',
      recovery: 'Run with --verbose for more details.',
      rawDetail: message,
    };
  }

  classifyInspectionFailure(
    stderr: string,
    exitCode: number
  ): ClassifiedFailure {
    const lower = stderr.toLowerCase();

    for (const rule of YT_DLP_STDERR_RULES) {
      if (rule.patterns.some((p) => lower.includes(p))) {
        return this.buildClassified(rule, stderr);
      }
    }

    return {
      error: createAppError(
        'DOWNLOAD_FAILED',
        `Failed to inspect URL (exit code ${exitCode}).`,
        'fatal',
        'process'
      ),
      summary: 'Failed to inspect the provided URL.',
      recovery:
        'Verify the URL is correct and accessible. Run with --verbose for details.',
      rawDetail: stderr.trim() || undefined,
    };
  }

  /**
   * Classifies inspection failure for playlist contexts.
   * CONTENT_UNAVAILABLE is treated as non-fatal for playlists
   * since unavailable entries should be skipped rather than abort inspection.
   */
  classifyPlaylistInspectionFailure(
    stderr: string,
    _exitCode: number
  ): ClassifiedFailure | null {
    const lower = stderr.toLowerCase();

    for (const rule of YT_DLP_STDERR_RULES) {
      if (rule.patterns.some((p) => lower.includes(p))) {
        // CONTENT_UNAVAILABLE is non-fatal in playlist context
        if (rule.code === 'CONTENT_UNAVAILABLE') {
          return null;
        }
        return this.buildClassified(rule, stderr);
      }
    }

    // For playlist inspection with --ignore-errors, a non-zero exit code
    // may just mean some entries failed — not necessarily fatal
    return null;
  }

  private buildClassified(
    rule: PatternRule,
    rawDetail: string
  ): ClassifiedFailure {
    return {
      error: createAppError(
        rule.code,
        rule.summary,
        rule.recoverability,
        rule.category
      ),
      summary: rule.summary,
      recovery: rule.recovery,
      rawDetail: rawDetail.trim() || undefined,
    };
  }

  private buildClassifiedFromMessage(
    rule: PatternRule,
    message: string
  ): ClassifiedFailure {
    return {
      error: createAppError(
        rule.code,
        rule.summary,
        rule.recoverability,
        rule.category
      ),
      summary: rule.summary,
      recovery: rule.recovery,
      rawDetail: message,
    };
  }
}
