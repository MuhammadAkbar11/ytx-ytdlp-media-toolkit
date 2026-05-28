import { AppError } from '../../types/errors';

export interface RecoverySuggestion {
  text: string;
  action?: string;
}

export class RecoveryResolver {
  resolve(error: AppError): RecoverySuggestion[] {
    switch (error.code) {
      case 'MISSING_YTDLP':
        return [
          { text: 'Install yt-dlp and ensure it is available in PATH.' },
          { text: 'On Ubuntu/Debian: pip install yt-dlp' },
          { text: 'Verify with: ytx doctor' },
        ];
      case 'MISSING_FFMPEG':
        return [
          { text: 'Install ffmpeg and ensure it is available in PATH.' },
          { text: 'On Ubuntu/Debian: sudo apt install ffmpeg' },
          { text: 'On Fedora: sudo dnf install ffmpeg' },
        ];
      case 'INVALID_URL':
        return [
          { text: 'Verify the URL is a valid YouTube link.' },
          {
            text: 'Supported formats: youtube.com/watch, youtu.be, youtube.com/playlist, youtube.com/shorts',
          },
        ];
      case 'INVALID_CONFIG':
        return [
          { text: 'Reset configuration to defaults:' },
          { text: '  ytx config reset' },
        ];
      case 'OUTPUT_NOT_WRITABLE':
        return [
          { text: 'Check that the output directory exists and is writable.' },
          { text: 'You can specify a different directory with --output <dir>' },
        ];
      case 'DOWNLOAD_FAILED':
        return [
          {
            text: 'Check your network connection and verify the video is still available.',
          },
          { text: 'Run with --verbose for more details.' },
        ];
      case 'UNSUPPORTED_BROWSER':
        return [
          {
            text: 'Use a supported browser for cookie extraction: chrome, firefox, brave, edge, safari',
          },
        ];
      case 'PERMISSION_DENIED':
        return [
          { text: 'Check file and directory permissions for the output path.' },
          { text: 'Ensure you have write access to the target directory.' },
        ];
      case 'DISK_FULL':
        return [
          { text: 'Free up disk space and try again.' },
          { text: 'Check available space with: df -h' },
        ];
      case 'NETWORK_ERROR':
        return [
          { text: 'Check your internet connection.' },
          {
            text: 'The server may be temporarily unavailable. Try again in a few moments.',
          },
        ];
      case 'AUTH_REQUIRED':
        return [
          { text: 'This content requires authentication.' },
          { text: 'Try enabling browser cookies:' },
          { text: '  ytx <url> --browser firefox' },
        ];
      case 'CONTENT_UNAVAILABLE':
        return [
          {
            text: 'The video may have been removed, made private, or is region-locked.',
          },
          { text: 'Verify the URL and try accessing it in a browser.' },
        ];
      case 'UNSUPPORTED_URL':
        return [
          {
            text: 'Ensure the URL points to a supported YouTube video, playlist, or short.',
          },
        ];
      case 'PLAYLIST_ERROR':
        return [
          { text: 'The playlist may be private, invalid, or empty.' },
          {
            text: 'Try accessing it in a browser or with --browser <name> for authenticated access.',
          },
        ];
      case 'ARIA2_FAILED':
        return [
          { text: 'Ensure aria2 is installed and available in PATH.' },
          { text: 'On Ubuntu/Debian: sudo apt install aria2' },
          { text: 'Or try downloading without --aria2.' },
        ];
      case 'PROCESS_SPAWN_FAILED':
        return [
          { text: 'A required tool was not found on your system.' },
          { text: 'Run ytx doctor to check all dependencies.' },
        ];
      case 'FFMPEG_FAILED':
        return [
          { text: 'Ensure ffmpeg is installed and available in PATH.' },
          { text: 'On Ubuntu/Debian: sudo apt install ffmpeg' },
        ];
      case 'RATE_LIMITED':
        return [
          {
            text: 'You are being rate-limited. Wait a few minutes and try again.',
          },
        ];
      default:
        return [{ text: 'Run with --verbose for more details.' }];
    }
  }
}
