import { describe, expect, test } from 'bun:test';
import { RecoveryResolver } from '../../src/core/errors/recovery-suggestions';

describe('RecoveryResolver', () => {
  test('should provide suggestions for known error types', () => {
    const resolver = new RecoveryResolver();
    const suggestion = resolver.resolve({
      code: 'MISSING_YTDLP',
      message: '',
      category: 'missing-dependency' as any,
      recoverability: 'recoverable' as any,
    });
    expect(suggestion).toBeDefined();
  });

  test('should handle unknown error types gracefully', () => {
    const resolver = new RecoveryResolver();
    expect(() =>
      resolver.resolve({
        code: 'UNKNOWN' as any,
        message: '',
        category: 'unknown' as any,
        recoverability: 'unknown' as any,
      })
    ).not.toThrow();
  });
});
