import { AppError } from '../../types/errors';

export interface RecoverySuggestion {
  text: string;
  action?: string; // Optional command to run or action to take
}

export class RecoveryResolver {
  /**
   * Resolves an AppError to a list of recovery suggestions.
   * 
   * @param error The AppError.
   * @returns An array of RecoverySuggestion.
   */
  resolve(error: AppError): RecoverySuggestion[] {
    switch (error.code) {
      case 'MISSING_YTDLP':
        return [
          { text: 'Verify yt-dlp is available in your PATH.' },
          { text: 'Install yt-dlp using your package manager or download it directly.' },
        ];
      case 'MISSING_FFMPEG':
        return [
          { text: 'Install ffmpeg and retry.' },
          { text: 'On Ubuntu/Debian: sudo apt install ffmpeg' },
          { text: 'On macOS: brew install ffmpeg' },
        ];
      case 'INVALID_URL':
        return [
          { text: 'Verify the URL is correct and accessible.' },
          { text: 'Ensure the platform is supported by yt-dlp.' },
        ];
      case 'INVALID_CONFIG':
        return [
          { text: 'Check your configuration for invalid values.' },
          { text: 'You can reset the configuration to defaults using: ytx config reset' },
        ];
      case 'OUTPUT_NOT_WRITABLE':
        return [
          { text: 'Check download directory permissions.' },
          { text: 'Ensure you have write access to the configured output directory.' },
        ];
      case 'DOWNLOAD_FAILED':
        return [
          { text: 'The download failed. Check network connectivity or video availability.' },
          { text: 'Try running with --verbose or --debug for more details.' },
        ];
      default:
        return [
          { text: 'No specific recovery suggestion available for this error.' },
          { text: 'Try running with --verbose or --debug for more details.' },
        ];
    }
  }
}
