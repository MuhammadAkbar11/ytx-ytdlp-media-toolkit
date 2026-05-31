import { describe, expect, test, beforeEach } from 'bun:test';
import { BatchUrlResolver } from '../../src/core/batch/batch-url-resolver';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

const FIXTURE_DIR = join(import.meta.dir, '..', 'fixtures', 'batch');

describe('BatchUrlResolver', () => {
  let resolver: BatchUrlResolver;

  beforeEach(async () => {
    resolver = new BatchUrlResolver();
    await rm(FIXTURE_DIR, { recursive: true, force: true });
    await mkdir(FIXTURE_DIR, { recursive: true });
  });

  describe('comma-separated URLs', () => {
    test('should resolve single URL', async () => {
      const result = await resolver.resolve(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        undefined
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.urls).toHaveLength(1);
      }
    });

    test('should resolve multiple comma-separated URLs', async () => {
      const result = await resolver.resolve(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ,https://youtu.be/abc123def45',
        undefined
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.urls).toHaveLength(2);
        expect(result.value.duplicatesRemoved).toBe(0);
      }
    });

    test('should trim whitespace between URLs', async () => {
      const result = await resolver.resolve(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ, https://youtu.be/abc123def45',
        undefined
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.urls).toHaveLength(2);
      }
    });

    test('should remove duplicate URLs', async () => {
      const result = await resolver.resolve(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ,https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        undefined
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.urls).toHaveLength(1);
        expect(result.value.duplicatesRemoved).toBe(1);
      }
    });
  });

  describe('playlist rejection', () => {
    test('should reject playlist URLs', async () => {
      const result = await resolver.resolve(
        'https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
        undefined
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('BATCH_PLAYLIST_REJECTED');
      }
    });

    test('should reject playlist URLs mixed with valid video URLs', async () => {
      const result = await resolver.resolve(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ,https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
        undefined
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('BATCH_PLAYLIST_REJECTED');
      }
    });
  });

  describe('invalid URLs', () => {
    test('should reject completely invalid URL', async () => {
      const result = await resolver.resolve('not-a-url', undefined);
      expect(result.ok).toBe(false);
    });

    test('should reject unsupported host', async () => {
      const result = await resolver.resolve(
        'https://example.com/video',
        undefined
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('BATCH_INVALID_URL');
      }
    });
  });

  describe('input validation', () => {
    test('should fail when no input or file provided', async () => {
      const result = await resolver.resolve(undefined, undefined);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('BATCH_NO_INPUT');
      }
    });
  });

  describe('file input', () => {
    test('should read URLs from .txt file', async () => {
      const filePath = join(FIXTURE_DIR, 'urls.txt');
      await writeFile(
        filePath,
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ\nhttps://youtu.be/abc123def45\n'
      );

      const result = await resolver.resolve(undefined, filePath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.urls).toHaveLength(2);
      }
    });

    test('should skip comment lines in .txt file', async () => {
      const filePath = join(FIXTURE_DIR, 'urls-comments.txt');
      await writeFile(
        filePath,
        '# This is a comment\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n# Another comment\nhttps://youtu.be/abc123def45\n'
      );

      const result = await resolver.resolve(undefined, filePath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.urls).toHaveLength(2);
      }
    });

    test('should extract URLs from .md file with bare URLs', async () => {
      const filePath = join(FIXTURE_DIR, 'urls.md');
      await writeFile(
        filePath,
        '# Downloads\n\nHere are the URLs:\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n\nhttps://youtu.be/abc123def45\n'
      );

      const result = await resolver.resolve(undefined, filePath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.urls).toHaveLength(2);
      }
    });

    test('should extract URLs from markdown links', async () => {
      const filePath = join(FIXTURE_DIR, 'urls-links.md');
      await writeFile(
        filePath,
        '# Downloads\n\n[Video 1](https://www.youtube.com/watch?v=dQw4w9WgXcQ)\n\n[Video 2](https://youtu.be/abc123def45)\n'
      );

      const result = await resolver.resolve(undefined, filePath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.urls).toHaveLength(2);
      }
    });

    test('should reject unsupported file types', async () => {
      const filePath = join(FIXTURE_DIR, 'urls.csv');
      await writeFile(filePath, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      const result = await resolver.resolve(undefined, filePath);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('BATCH_UNSUPPORTED_FILE');
      }
    });

    test('should handle non-existent file', async () => {
      const result = await resolver.resolve(
        undefined,
        '/nonexistent/file.txt'
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('BATCH_FILE_READ_ERROR');
      }
    });
  });
});