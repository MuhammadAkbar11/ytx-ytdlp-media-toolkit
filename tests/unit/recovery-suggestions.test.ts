import { describe, expect, test } from 'bun:test';
import { RecoveryResolver } from '../../src/core/errors/recovery-suggestions';
import { AppError } from '../../src/types/errors';

describe('RecoveryResolver', () => {
  test('should resolve MISSING_YTDLP error', () => {
    const resolver = new RecoveryResolver();
    const error: AppError = {
      code: 'MISSING_YTDLP',
      message: 'yt-dlp not found',
      recoverability: 'fatal',
      category: 'dependency',
    };

    const suggestions = resolver.resolve(error);

    expect(suggestions.length).toBe(2);
    expect(suggestions[0].text).toContain('PATH');
  });

  test('should resolve MISSING_FFMPEG error', () => {
    const resolver = new RecoveryResolver();
    const error: AppError = {
      code: 'MISSING_FFMPEG',
      message: 'ffmpeg not found',
      recoverability: 'fatal',
      category: 'dependency',
    };

    const suggestions = resolver.resolve(error);

    expect(suggestions.length).toBe(3);
    expect(suggestions[1].text).toContain('sudo apt');
  });

  test('should fallback for unknown error codes', () => {
    const resolver = new RecoveryResolver();
    const error: AppError = {
      code: 'UNSUPPORTED_BROWSER',
      message: 'Unsupported browser',
      recoverability: 'configuration',
      category: 'configuration',
    };

    const suggestions = resolver.resolve(error);

    expect(suggestions.length).toBe(2);
    expect(suggestions[0].text).toContain('No specific recovery suggestion');
  });
});
