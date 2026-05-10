// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { VideoFormat, NormalizedFormat, YtDlpInfo } from '../../types/domain';

export class FormatNormalizer {
  /**
   * Normalizes raw yt-dlp formats into UI-safe NormalizedFormat objects.
   *
   * @param info The raw YtDlpInfo containing rawFormats.
   * @returns A sorted and deduplicated array of NormalizedFormat.
   */
  normalize(info: YtDlpInfo): NormalizedFormat[] {
    const rawFormats = info.rawFormats || [];
    const normalized: NormalizedFormat[] = [];

    for (const raw of rawFormats) {
      const hasVideo = raw.vcodec && raw.vcodec !== 'none';
      const hasAudio = raw.acodec && raw.acodec !== 'none';

      // Skip formats that have neither video nor audio
      if (!hasVideo && !hasAudio) continue;

      let displayLabel = '';
      if (hasVideo) {
        displayLabel = `${raw.height || 'unknown'}p (${raw.ext})`;
      } else if (hasAudio) {
        displayLabel = `Audio only (${raw.ext})`;
      }

      const estimatedSize = raw.filesizeApprox
        ? `${(raw.filesizeApprox / (1024 * 1024)).toFixed(1)} MB`
        : undefined;

      normalized.push({
        displayLabel,
        height: raw.height,
        ext: raw.ext,
        hasAudio: !!hasAudio,
        hasVideo: !!hasVideo,
        estimatedSize,
        formatSelector: raw.id,
      });
    }

    // Deduplication by display label to keep the list clean for the user
    const unique = new Map<string, NormalizedFormat>();
    for (const f of normalized) {
      if (!unique.has(f.displayLabel)) {
        unique.set(f.displayLabel, f);
      }
    }

    const result = Array.from(unique.values());

    // Deterministic sorting:
    // 1. Video formats first, sorted by height descending
    // 2. Audio formats next
    result.sort((a, b) => {
      if (a.hasVideo && !b.hasVideo) return -1;
      if (!a.hasVideo && b.hasVideo) return 1;

      if (a.hasVideo && b.hasVideo) {
        const heightA = a.height || 0;
        const heightB = b.height || 0;
        return heightB - heightA; // Higher resolution first
      }

      return 0; // Keep original order for audio-only if multiple
    });

    return result;
  }
}
