import { describe, expect, test } from 'bun:test';
import { validateUrl } from '../../src/core/validation/url-validator';

describe('URL Validator', () => {
  test('should validate standard watch URLs', () => {
    const res = validateUrl('https://www.youtube.com/watch?v=123');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.type).toBe('video');
    }
  });

  test('should validate youtu.be URLs', () => {
    const res = validateUrl('https://youtu.be/123');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.type).toBe('video');
    }
  });

  test('should classify playlist URLs', () => {
    const res = validateUrl('https://www.youtube.com/playlist?list=123');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.type).toBe('playlist');
    }
  });

  test('should classify shorts URLs', () => {
    const res = validateUrl('https://youtube.com/shorts/123');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.type).toBe('short');
    }
  });

  test('should classify music URLs', () => {
    const res = validateUrl('https://music.youtube.com/watch?v=123');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.type).toBe('music');
    }
  });

  test('should fail on unsupported hosts', () => {
    const res = validateUrl('https://google.com');
    expect(res.ok).toBe(false);
  });

  test('should fail on malformed URLs', () => {
    const res = validateUrl('not-a-url');
    expect(res.ok).toBe(false);
  });
});
