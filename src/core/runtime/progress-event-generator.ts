import { DownloadProgress, ProgressParser } from './progress-parser';
import { DownloadEvent } from '../../types/events';

export class ProgressEventGenerator {
  private parser = new ProgressParser();
  private lastProgress?: DownloadProgress;

  /**
   * Processes a line and generates a progress event if it's a valid and new progress line.
   * Returns null if the line is a duplicate or not a progress line.
   *
   * @param line The normalized runtime line.
   * @returns A DownloadEvent or null if suppressed/invalid.
   */
  generate(line: string): DownloadEvent | null {
    const progress = this.parser.parse(line);
    
    // If no key fields were parsed, it's not a valid progress line for us
    if (progress.percentage === undefined && !progress.speed && !progress.eta) {
      return null;
    }

    // Check for duplicates
    if (this.isDuplicate(progress)) {
      return null;
    }

    this.lastProgress = progress;
    return { type: 'progress', progress };
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
