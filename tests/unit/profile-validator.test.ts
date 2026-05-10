import { describe, expect, test } from 'bun:test';
import { ProfileValidator } from '../../src/core/profiles/profile-validator';
import { DownloadProfile } from '../../src/types/domain';

describe('ProfileValidator', () => {
  test('should validate valid video profile', () => {
    const validator = new ProfileValidator();
    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      videoQuality: 1080,
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: { embedMetadata: false, embedThumbnail: false, embedChapters: false },
      playlist: { mode: 'entire_playlist' },
      useDownloadArchive: false,
    };

    const res = validator.validate(profile);
    expect(res.ok).toBe(true);
  });

  test('should fail on missing URL', () => {
    const validator = new ProfileValidator();
    const profile: DownloadProfile = {
      url: '',
      mediaKind: 'video',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      videoQuality: 1080,
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: { embedMetadata: false, embedThumbnail: false, embedChapters: false },
      playlist: { mode: 'entire_playlist' },
      useDownloadArchive: false,
    };

    const res = validator.validate(profile);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.length).toBe(1);
      expect(res.error[0].category).toBe('missing-fields');
    }
  });

  test('should fail on audio profile with video quality', () => {
    const validator = new ProfileValidator();
    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'audio',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      videoQuality: 1080, // Incompatible
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: { embedMetadata: false, embedThumbnail: false, embedChapters: false },
      playlist: { mode: 'entire_playlist' },
      useDownloadArchive: false,
    };

    const res = validator.validate(profile);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error[0].category).toBe('incompatible-options');
    }
  });
});
