import { describe, expect, test } from 'bun:test';
import { ok, fail } from '../../src/utils/result';

describe('Result Utility', () => {
  test('ok() should create a success result', () => {
    const res = ok('success');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toBe('success');
    }
  });

  test('fail() should create a failure result', () => {
    const res = fail('error');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('error');
    }
  });
});
