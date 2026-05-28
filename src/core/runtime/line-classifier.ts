export type RuntimeLineType =
  | 'progress'
  | 'warning'
  | 'error'
  | 'info'
  | 'debug'
  | 'unknown';

export interface ClassifiedLine {
  type: RuntimeLineType;
  raw: string;
}

export class LineClassifier {
  /**
   * Classifies a raw output line from yt-dlp into a structured category.
   *
   * @param line The raw line string.
   * @returns The classified line with its type.
   */
  classify(line: string): ClassifiedLine {
    const trimmed = line.trim();

    // Progress lines usually start with [download] and contain a percentage
    if (trimmed.startsWith('[download]') && trimmed.includes('%')) {
      return { type: 'progress', raw: line };
    }

    // Warning lines start with WARNING:
    if (trimmed.startsWith('WARNING:')) {
      return { type: 'warning', raw: line };
    }

    // Error lines start with ERROR:
    if (trimmed.startsWith('ERROR:')) {
      return { type: 'error', raw: line };
    }

    if (
      trimmed.startsWith('[ExtractAudio]') ||
      trimmed.startsWith('[Merger]') ||
      trimmed.startsWith('[Metadata]') ||
      trimmed.startsWith('[Thumbnails]') ||
      trimmed.startsWith('[VideoConvertor]') ||
      trimmed.startsWith('[Fixup') ||
      trimmed.startsWith('[download] Destination:')
    ) {
      return { type: 'info', raw: line };
    }

    if (trimmed.startsWith('[') && trimmed.includes(']')) {
      return { type: 'info', raw: line };
    }

    // Fallback
    return { type: 'unknown', raw: line };
  }
}
