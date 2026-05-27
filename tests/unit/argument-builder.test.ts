import { describe, expect, test } from 'bun:test';
import { ArgumentBuilder } from '../../src/core/downloader/argument-builder';
import { FormatNormalizer } from '../../src/core/formats/format-normalizer';
import { DownloadProfile, YtDlpInfo } from '../../src/types/domain';

describe('ArgumentBuilder', () => {
  test('should build arguments for video profile', () => {
    const builder = new ArgumentBuilder();
    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
      outputPath: '.',
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
      outputPath: '.',
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
      outputPath: '.',
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
      outputPath: '.',
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

describe('FormatNormalizer', () => {
  test('should normalize and sort video formats', () => {
    const normalizer = new FormatNormalizer();
    const info: YtDlpInfo = {
      webpageUrl: 'https://youtube.com/watch?v=123',
      isPlaylist: false,
      rawFormats: [
        {
          id: '18',
          ext: 'mp4',
          height: 360,
          vcodec: 'avc1.42001E',
          acodec: 'mp4a.40.2',
        },
        {
          id: '22',
          ext: 'mp4',
          height: 720,
          vcodec: 'avc1.64001F',
          acodec: 'mp4a.40.2',
        },
      ],
    };

    const res = normalizer.normalize(info);
    expect(res.length).toBe(2);
    expect(res[0].displayLabel).toBe('720p (mp4)');
    expect(res[0].height).toBe(720);
    expect(res[1].displayLabel).toBe('360p (mp4)');
    expect(res[1].height).toBe(360);
  });

  test('should normalize audio-only formats', () => {
    const normalizer = new FormatNormalizer();
    const info: YtDlpInfo = {
      webpageUrl: 'https://youtube.com/watch?v=123',
      isPlaylist: false,
      rawFormats: [
        { id: '140', ext: 'm4a', vcodec: 'none', acodec: 'mp4a.40.2' },
      ],
    };

    const res = normalizer.normalize(info);
    expect(res.length).toBe(1);
    expect(res[0].displayLabel).toBe('Audio only (m4a)');
    expect(res[0].hasVideo).toBe(false);
    expect(res[0].hasAudio).toBe(true);
  });

  test('should deduplicate formats with same display label', () => {
    const normalizer = new FormatNormalizer();
    const info: YtDlpInfo = {
      webpageUrl: 'https://youtube.com/watch?v=123',
      isPlaylist: false,
      rawFormats: [
        { id: '18', ext: 'mp4', height: 360, vcodec: 'avc1', acodec: 'mp4a' },
        { id: '19', ext: 'mp4', height: 360, vcodec: 'avc2', acodec: 'mp4a' },
      ],
    };

    const res = normalizer.normalize(info);
    expect(res.length).toBe(1);
    expect(res[0].displayLabel).toBe('360p (mp4)');
  });
});
