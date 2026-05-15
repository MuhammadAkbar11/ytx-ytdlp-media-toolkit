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
    if (
      profile.mediaKind === 'audio' &&
      profile.audioOptions?.format === 'mp3'
    ) {
      const bitrateKbps = profile.audioOptions.bitrate;
      const durationSeconds = info.duration;

      // Size = (Bitrate * Duration) / 8
      // Bitrate is in kbps, so multiply by 1000 to get bps
      // Divide by 8 to get bytes
      // Add ~10% overhead for ID3 tags, container padding, and variable-bitrate frames
      const overheadFactor = 1.1;
      return ((bitrateKbps * 1000 * durationSeconds) / 8) * overheadFactor;
    }

    // Video estimation is disabled as it is unreliable for MP4 workflows
    if (profile.mediaKind === 'video') {
      return null;
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
