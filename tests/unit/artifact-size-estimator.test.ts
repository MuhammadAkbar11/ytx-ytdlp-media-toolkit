import { describe, expect, test } from 'bun:test';
import { ArtifactSizeEstimator } from '../../src/core/runtime/artifact-size-estimator';
import { DownloadProfile, YtDlpInfo } from '../../src/types/domain';

describe('ArtifactSizeEstimator', () => {
  test('should estimate MP3 size correctly', () => {
    const estimator = new ArtifactSizeEstimator();
    
    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'audio',
      outputPath: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      audioOptions: { format: 'mp3', bitrate: 320 },
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: { embedMetadata: false, embedThumbnail: false, embedChapters: false },
      playlist: { mode: 'first_video' },
    };

    const info: YtDlpInfo = {
      webpageUrl: 'https://youtube.com/watch?v=123',
      isPlaylist: false,
      duration: 100, // 100 seconds
    };

    const estimatedSize = estimator.estimate(profile, info);
    
    // (320 * 1000 * 100) / 8 * 1.1 (overhead) = 4,400,000 bytes
    expect(estimatedSize).toBe(4400000);
    
    const formatted = estimator.formatSize(estimatedSize!);
    // 4400000 / 1024 / 1024 = 4.196... MiB
    expect(formatted).toBe('~4.2 MiB');
  });

  test('should return null if duration is missing', () => {
    const estimator = new ArtifactSizeEstimator();
    
    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'audio',
      outputPath: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      audioOptions: { format: 'mp3', bitrate: 320 },
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: { embedMetadata: false, embedThumbnail: false, embedChapters: false },
      playlist: { mode: 'first_video' },
    };

    const info: YtDlpInfo = {
      webpageUrl: 'https://youtube.com/watch?v=123',
      isPlaylist: false,
    };

    const estimatedSize = estimator.estimate(profile, info);
    expect(estimatedSize).toBeNull();
  });

  test('should return null for video workflows', () => {
    const estimator = new ArtifactSizeEstimator();

    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
      outputPath: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      videoQuality: 1080,
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: { embedMetadata: false, embedThumbnail: false, embedChapters: false },
      playlist: { mode: 'first_video' },
    };

    const info: YtDlpInfo = {
      webpageUrl: 'https://youtube.com/watch?v=123',
      isPlaylist: false,
      duration: 100, // 100 seconds
    };

    const estimatedSize = estimator.estimate(profile, info);
    expect(estimatedSize).toBeNull();
  });
});
