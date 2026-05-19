import { describe, expect, test } from 'bun:test';
import { ArgumentBuilder } from '../../src/core/downloader/argument-builder';
import { DownloadProfile } from '../../src/types/domain';

describe('ArgumentBuilder', () => {
  test('should build arguments for video profile', () => {
    const builder = new ArgumentBuilder();
    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      videoQuality: 1080,
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: false,
        embedThumbnail: false,
        embedChapters: false,
      },
      playlist: { mode: 'entire_playlist' },
    };

    const args = builder.build(profile);

    expect(args).toContain('-f');
    expect(args).toContain('bestvideo[height<=1080]+bestaudio/best');
    expect(args).toContain('https://youtube.com/watch?v=123');
  });

  test('should build arguments for audio profile', () => {
    const builder = new ArgumentBuilder();
    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'audio',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      audioOptions: { format: 'mp3', bitrate: 192 },
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: true,
        embedThumbnail: false,
        embedChapters: false,
      },
      playlist: { mode: 'first_video' },
    };

    const args = builder.build(profile);

    expect(args).toContain('--extract-audio');
    expect(args).toContain('--audio-format');
    expect(args).toContain('mp3');
    expect(args).toContain('--audio-quality');
    expect(args).toContain('192k');
    expect(args).toContain('--embed-metadata');
    expect(args).toContain('--no-playlist');
  });

  test('should build arguments with browser cookies', () => {
    const builder = new ArgumentBuilder();
    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: false,
        embedThumbnail: false,
        embedChapters: false,
      },
      playlist: { mode: 'entire_playlist' },
      browserCookies: 'chrome',
    };

    const args = builder.build(profile);

    expect(args).toContain('--cookies-from-browser');
    expect(args).toContain('chrome');
  });

  test('should build arguments with aria2 downloader', () => {
    const builder = new ArgumentBuilder();
    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: false,
        embedThumbnail: false,
        embedChapters: false,
      },
      playlist: { mode: 'entire_playlist' },
      useAria2: true,
    };

    const args = builder.build(profile);

    expect(args).toContain('--downloader');
    expect(args).toContain('aria2c');
    expect(args).toContain('-N');
    expect(args).toContain('8');
  });
});
