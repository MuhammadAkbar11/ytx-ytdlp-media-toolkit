import { DownloadProfile, YtDlpInfo } from '../../types';

export class ArtifactSizeEstimator {
  /**
   * Estimates the final output file size in bytes.
   * Returns null if estimation is not possible.
   */
  estimate(profile: DownloadProfile, info: YtDlpInfo): number | null {
    if (!info.duration) {
      return null;
    }

    // MP3 transcoding estimation
    if (profile.mediaKind === 'audio' && profile.audioOptions?.format === 'mp3') {
      const bitrateKbps = profile.audioOptions.bitrate;
      const durationSeconds = info.duration;

      // Size = (Bitrate * Duration) / 8
      // Bitrate is in kbps, so multiply by 1000 to get bps
      // Divide by 8 to get bytes
      // Add ~10% overhead for ID3 tags, container padding, and variable-bitrate frames
      const overheadFactor = 1.1;
      return ((bitrateKbps * 1000 * durationSeconds) / 8) * overheadFactor;
    }

    // Video estimation using typical average combined bitrates (video + audio) per resolution
    if (profile.mediaKind === 'video') {
      // Typical average bitrates in kbps for YouTube-sourced content (VP9/H.264 + AAC/Opus)
      const bitrateMapKbps: Record<string, number> = {
        '2160': 20000, // 4K: ~20 Mbps
        '1440': 10000, // 2K: ~10 Mbps
        '1080': 5000,  // 1080p: ~5 Mbps
        '720': 2500,   // 720p: ~2.5 Mbps
        '480': 1200,   // 480p: ~1.2 Mbps
        'best': 6000,  // Assume ~1080p-ish for 'best'
      };

      const quality = String(profile.videoQuality ?? 'best');
      const bitrateKbps = bitrateMapKbps[quality] ?? 5000;
      const durationSeconds = info.duration;

      // Add ~8% overhead for MKV/MP4 container, chapters, and subtitle tracks
      const overheadFactor = 1.08;
      return ((bitrateKbps * 1000 * durationSeconds) / 8) * overheadFactor;
    }

    return null;
  }

  /**
   * Formats size in bytes to a human-readable string (base 1024).
   */
  formatSize(bytes: number): string {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `~${size.toFixed(1)} ${units[unitIndex]}`;
  }
}
