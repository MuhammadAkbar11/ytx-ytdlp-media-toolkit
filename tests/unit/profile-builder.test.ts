import { describe, expect, test } from 'bun:test';
import { ProfileBuilder } from '../../src/core/profiles/profile-builder';
import { AppConfig } from '../../src/types/config';
import { Preset } from '../../src/types/domain';

const mockConfig: AppConfig = {
  version: 3,
  outputPath: '/config/output',
  preferredBrowser: 'chrome',
  preferredBitrate: 320,
  filenameTemplate: '%(title)s.%(ext)s',
  subtitleOptions: { mode: 'none', output: 'separate' },
  metadataOptions: {
    embedMetadata: true,
    embedThumbnail: true,
    embedChapters: true,
  },
  defaultPreset: 'balanced',
  preferredVideoQuality: 1080,
};

const mockPreset: Preset = {
  id: 'test',
  label: 'Test',
  description: 'test',
  profile: {
    mediaKind: 'audio',
    audioOptions: { format: 'mp3', bitrate: 128 },
  },
};

describe('ProfileBuilder', () => {
  test('should apply config defaults', () => {
    const profile = new ProfileBuilder().build(
      'https://youtube.com/watch?v=123',
      mockConfig
    );
    expect(profile.url).toBe('https://youtube.com/watch?v=123');
    expect(profile.outputPath).toBe('/config/output');
    expect(profile.browserCookies).toBe('chrome');
  });

  test('should apply preset overrides', () => {
    const profile = new ProfileBuilder().build(
      'https://youtube.com/watch?v=123',
      mockConfig,
      mockPreset
    );
    expect(profile.mediaKind).toBe('audio');
    expect(profile.audioOptions?.bitrate).toBe(128);
  });

  test('should cleanup incompatible options for video/audio profiles', () => {
    const builder = new ProfileBuilder();
    const video = builder.build(
      'https://youtube.com/watch?v=123',
      mockConfig,
      undefined,
      { mediaKind: 'video', videoQuality: 720 }
    );
    expect(video.mediaKind).toBe('video');
    expect(video.videoQuality).toBe(720);

    const audio = builder.build(
      'https://youtube.com/watch?v=123',
      mockConfig,
      undefined,
      { mediaKind: 'audio', videoQuality: 1080 }
    );
    expect(audio.mediaKind).toBe('audio');
    expect(audio.videoQuality).toBeUndefined();
  });
});
