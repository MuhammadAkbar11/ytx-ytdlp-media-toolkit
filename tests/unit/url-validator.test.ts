import { describe, expect, test } from 'bun:test';
import { validateUrl } from '../../src/core/validation/url-validator';

describe('URL Validator', () => {
  test('should validate standard watch and short URLs', () => {
    expect(validateUrl('https://youtube.com/watch?v=123').ok).toBe(true);
    expect(validateUrl('https://youtu.be/123').ok).toBe(true);
  });

  test('should fail on unsupported and malformed URLs', () => {
    expect(validateUrl('not-a-url').ok).toBe(false);
    expect(validateUrl('').ok).toBe(false);
  });
});
