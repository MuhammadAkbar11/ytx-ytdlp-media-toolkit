export interface DownloadProgress {
  percentage?: number;
  speed?: string;
  eta?: string;
  downloadedSize?: string;
  totalSize?: string;
}

export class ProgressParser {
  /**
   * Parses a progress line from yt-dlp.
   *
   * @param line The raw progress line.
   * @returns The parsed progress snapshot.
   */
  parse(line: string): DownloadProgress {
    const result: DownloadProgress = {};
    const trimmed = line.trim();

    // 1. Full line with percentage and total size
    // Example: [download]  45.2% of 52.10MiB at 2.31MiB/s ETA 00:13
    const fullMatch = trimmed.match(/\[download\]\s+(\d+\.\d+)%\s+of\s+([^\s]+)\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)/);
    if (fullMatch) {
      result.percentage = parseFloat(fullMatch[1]);
      result.totalSize = fullMatch[2];
      result.speed = fullMatch[3];
      result.eta = fullMatch[4];
      return result;
    }

    // 2. Line with downloaded size but no total size (unknown total)
    // Example: [download]   10.00MiB at    1.23MiB/s ETA 00:05
    const sizeMatch = trimmed.match(/\[download\]\s+([^\s]+)\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)/);
    if (sizeMatch && !sizeMatch[1].includes('%')) {
      result.downloadedSize = sizeMatch[1];
      result.speed = sizeMatch[2];
      result.eta = sizeMatch[3];
      return result;
    }

    // Fallback: extract whatever we can find using individual regexes
    const percentageMatch = trimmed.match(/(\d+\.\d+)%/);
    if (percentageMatch) {
      result.percentage = parseFloat(percentageMatch[1]);
    }

    const speedMatch = trimmed.match(/at\s+([^\s]+)/);
    if (speedMatch) {
      result.speed = speedMatch[1];
    }

    const etaMatch = trimmed.match(/ETA\s+([^\s]+)/);
    if (etaMatch) {
      result.eta = etaMatch[1];
    }

    return result;
  }
}
