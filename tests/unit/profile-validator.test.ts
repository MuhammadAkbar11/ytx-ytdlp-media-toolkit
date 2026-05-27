import { describe, expect, test } from 'bun:test';
import { ProfileValidator } from '../../src/core/profiles/profile-validator';
import { DownloadProfile } from '../../src/types/domain';

describe('ProfileValidator', () => {
  const baseProfile = {
    outputPath: '.',
    filenameTemplate: '%(title)s.%(ext)s',
    videoQuality: 1080,
    subtitleOptions: { mode: 'none' as const, output: 'separate' as const },
    metadataOptions: {
      embedMetadata: false,
      embedThumbnail: false,
      embedChapters: false,
    },
    playlist: { mode: 'first_video' as const },
  };

  test('should validate valid video profile', () => {
    const validator = new ProfileValidator();
    const profile: DownloadProfile = {
      ...baseProfile,
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
    };
    const res = validator.validate(profile);
    expect(res.ok).toBe(true);
  });

  test('should fail on missing URL', () => {
    const validator = new ProfileValidator();
    const profile: DownloadProfile = {
      ...baseProfile,
      url: '',
      mediaKind: 'video',
    };
    const res = validator.validate(profile);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error[0].category).toBe('missing-fields');
  });
});
