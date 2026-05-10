import { describe, expect, test } from 'bun:test';
import { FormatNormalizer } from '../../src/core/formats/format-normalizer';
import { YtDlpInfo } from '../../src/types/domain';

describe('FormatNormalizer', () => {
  test('should normalize and sort video formats', () => {
    const normalizer = new FormatNormalizer();
    const info: YtDlpInfo = {
      webpageUrl: 'https://youtube.com/watch?v=123',
      isPlaylist: false,
      rawFormats: [
        { id: '18', ext: 'mp4', height: 360, vcodec: 'avc1.42001E', acodec: 'mp4a.40.2' },
        { id: '22', ext: 'mp4', height: 720, vcodec: 'avc1.64001F', acodec: 'mp4a.40.2' },
      ],
    };

    const res = normalizer.normalize(info);
    expect(res.length).toBe(2);
    expect(res[0].displayLabel).toBe('720p (mp4)'); // Sorted first by height
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
        { id: '19', ext: 'mp4', height: 360, vcodec: 'avc2', acodec: 'mp4a' }, // Same resolution and ext
      ],
    };

    const res = normalizer.normalize(info);
    expect(res.length).toBe(1); // Should be deduplicated
    expect(res[0].displayLabel).toBe('360p (mp4)');
  });
});
