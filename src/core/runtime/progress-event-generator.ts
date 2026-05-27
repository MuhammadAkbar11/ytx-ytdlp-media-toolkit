export interface DownloadProgress {
  percentage?: number;
  speed?: string;
  eta?: string;
  downloadedSize?: string;
  totalSize?: string;
}

export class ProgressEventGenerator {
  private lastProgress?: DownloadProgress;

  /**
   * Parses a progress line from yt-dlp and generates a progress event.
   */
  generate(
    line: string
  ): { type: 'progress'; progress: DownloadProgress } | null {
    const progress = this.parse(line);

    if (progress.percentage === undefined && !progress.speed && !progress.eta) {
      return null;
    }

    if (this.isDuplicate(progress)) {
      return null;
    }

    this.lastProgress = progress;
    return { type: 'progress', progress };
  }

  private parse(line: string): DownloadProgress {
    const result: DownloadProgress = {};
    const trimmed = line.trim();

    const fullMatch = trimmed.match(
      /\[download\]\s+(\d+\.\d+)%\s+of\s+([^\s]+)\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)/
    );
    if (fullMatch) {
      result.percentage = parseFloat(fullMatch[1]);
      result.totalSize = fullMatch[2];
      result.speed = fullMatch[3];
      result.eta = fullMatch[4];
      return result;
    }

    const sizeMatch = trimmed.match(
      /\[download\]\s+([^\s]+)\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)/
    );
    if (sizeMatch && !sizeMatch[1].includes('%')) {
      result.downloadedSize = sizeMatch[1];
      result.speed = sizeMatch[2];
      result.eta = sizeMatch[3];
      return result;
    }

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

  private isDuplicate(current: DownloadProgress): boolean {
    if (!this.lastProgress) return false;

    return (
      current.percentage === this.lastProgress.percentage &&
      current.speed === this.lastProgress.speed &&
      current.eta === this.lastProgress.eta &&
      current.totalSize === this.lastProgress.totalSize &&
      current.downloadedSize === this.lastProgress.downloadedSize
    );
  }
}
