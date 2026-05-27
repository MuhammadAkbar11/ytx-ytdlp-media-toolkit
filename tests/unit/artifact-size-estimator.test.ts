import { describe, expect, test } from 'bun:test';
import { ArtifactSizeEstimator } from '../../src/core/runtime/artifact-size-estimator';
import { DownloadProfile, YtDlpInfo } from '../../src/types/domain';

const baseProfile: DownloadProfile = {
  url: 'https://youtube.com/watch?v=123',
  mediaKind: 'audio',
  outputPath: '.',
  filenameTemplate: '%(title)s.%(ext)s',
  audioOptions: { format: 'mp3', bitrate: 320 },
  subtitleOptions: { mode: 'none', output: 'separate' },
  metadataOptions: {
    embedMetadata: false,
    embedThumbnail: false,
    embedChapters: false,
  },
  playlist: { mode: 'first_video' },
};

describe('ArtifactSizeEstimator', () => {
  test('should estimate MP3 size and format output', () => {
    const estimator = new ArtifactSizeEstimator();
    const info = {
      webpageUrl: 'https://youtube.com/watch?v=123',
      duration: 100,
    } as YtDlpInfo;
    const estimatedSize = estimator.estimate(baseProfile, info);
    expect(estimatedSize).toBe(4400000);
    const formatted = estimator.formatSize(estimatedSize!);
    expect(formatted).toBe('~4.2 MiB');
  });

  test('should return null if duration is missing', () => {
    const estimator = new ArtifactSizeEstimator();
    const info = { webpageUrl: 'https://youtube.com/watch?v=123' } as YtDlpInfo;
    const estimatedSize = estimator.estimate(baseProfile, info);
    expect(estimatedSize).toBeNull();
  });
});
