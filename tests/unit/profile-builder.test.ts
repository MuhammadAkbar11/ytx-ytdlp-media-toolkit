import { describe, expect, test } from 'bun:test';
import { ProfileBuilder } from '../../src/core/profiles/profile-builder';
import { AppConfig } from '../../src/types/config';
import { Preset } from '../../src/types/domain';

describe('ProfileBuilder', () => {
  const mockConfig: AppConfig = {
    version: 1,
    outputDirectory: '/config/output',
    preferredBrowser: 'chrome',
    preferredBitrate: 320,
    filenameTemplate: '%(title)s.%(ext)s',
    subtitleOptions: { mode: 'none', output: 'separate' },
    metadataOptions: {
      embedMetadata: true,
      embedThumbnail: true,
      embedChapters: true,
    },
    useDownloadArchive: true,
    defaultPreset: 'balanced',
    preferredVideoQuality: 1080,
  };

  const mockPreset: Preset = {
    id: 'test-preset',
    label: 'Test Preset',
    description: 'A test preset',
    profile: {
      mediaKind: 'audio',
      audioOptions: { format: 'mp3', bitrate: 128 },
    },
  };

  test('should apply config defaults', () => {
    const builder = new ProfileBuilder();
    const profile = builder.build('https://youtube.com/watch?v=123', mockConfig);

    expect(profile.url).toBe('https://youtube.com/watch?v=123');
    expect(profile.outputDirectory).toBe('/config/output'); // from config
    expect(profile.browserCookies).toBe('chrome'); // from config
  });

  test('should apply preset overrides', () => {
    const builder = new ProfileBuilder();
    const profile = builder.build('https://youtube.com/watch?v=123', mockConfig, mockPreset);

    expect(profile.mediaKind).toBe('audio'); // from preset
    expect(profile.audioOptions?.bitrate).toBe(128); // from preset
  });

  test('should apply direct overrides', () => {
    const builder = new ProfileBuilder();
    const profile = builder.build('https://youtube.com/watch?v=123', mockConfig, mockPreset, {
      mediaKind: 'video',
      videoQuality: 720,
    });

    expect(profile.mediaKind).toBe('video'); // from overrides
    expect(profile.videoQuality).toBe(720); // from overrides
    expect(profile.audioOptions).toBeUndefined(); // cleaned up because it's video!
  });

  test('should cleanup incompatible options for video profile', () => {
    const builder = new ProfileBuilder();
    const profile = builder.build('https://youtube.com/watch?v=123', mockConfig, undefined, {
      mediaKind: 'video',
      audioOptions: { format: 'mp3', bitrate: 320 }, // invalid for video
    });

    expect(profile.mediaKind).toBe('video');
    expect(profile.audioOptions).toBeUndefined(); // should be removed
  });

  test('should cleanup incompatible options for audio profile', () => {
    const builder = new ProfileBuilder();
    const profile = builder.build('https://youtube.com/watch?v=123', mockConfig, undefined, {
      mediaKind: 'audio',
      videoQuality: 1080, // invalid for audio
    });

    expect(profile.mediaKind).toBe('audio');
    expect(profile.videoQuality).toBeUndefined(); // should be removed
  });
});
