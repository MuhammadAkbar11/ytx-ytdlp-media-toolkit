import { DownloadProfile } from '../../types/domain';
import { Result, ok, fail } from '../../utils/result';
import {
  ProfileValidator,
  ValidationIssue,
} from '../profiles/profile-validator';
import { ArgumentBuilder } from '../downloader/argument-builder';
import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { ProcessExecutionResult } from '../../types/process';
import { EventStream } from '../runtime/event-stream';
import { ArtifactSizeEstimator } from '../runtime/artifact-size-estimator';
import { FailureClassifier } from '../errors/failure-classifier';

export class BaseDownloadWorkflow {
  private failureClassifier: FailureClassifier;

  constructor(
    protected profileValidator: ProfileValidator,
    protected argumentBuilder: ArgumentBuilder,
    protected processRunner: ProcessRunner,
    protected eventStream: EventStream
  ) {
    this.failureClassifier = new FailureClassifier();
  }

  async run(
    profile: DownloadProfile
  ): Promise<Result<ProcessExecutionResult, ValidationIssue[]>> {
    const valRes = this.profileValidator.validate(profile);
    if (!valRes.ok) {
      const issueMessages = valRes.error.map((i) => i.message).join('; ');
      this.eventStream.emit({
        type: 'failed',
        error: `Profile validation failed: ${issueMessages}`,
      });
      return fail(valRes.error);
    }

    const args = this.argumentBuilder.build(profile);
    this.eventStream.emit({
      type: 'debug',
      message: `yt-dlp args: ${args.join(' ')}`,
    });

    const estimator = new ArtifactSizeEstimator();
    this.eventStream.emit({
      type: 'started',
      message: profile.browserCookies
        ? 'Fetching browser cookies...'
        : 'Starting download...',
      estimatedSize: profile.estimatedSize
        ? estimator.formatSize(profile.estimatedSize)
        : undefined,
    });

    const stderrLines: string[] = [];
    try {
      const result = await this.processRunner.run('yt-dlp', args, {
        onStdout: (line) => this.eventStream.processLine(line),
        onStderr: (line) => {
          this.eventStream.processLine(line);
          stderrLines.push(line);
        },
        bufferStdout: false,
        bufferStderr: false,
      });

      if (result.exitCode !== 0) {
        // For playlists with --ignore-errors, a non-zero exit code may just
        // mean some entries failed. If stderr only contains entry-level
        // failures (content unavailable), treat as partial success.
        const isPlaylist =
          profile.playlist &&
          (profile.playlist.mode === 'entire_playlist' ||
            profile.playlist.mode === 'selected_items');

        if (isPlaylist && this.isPartialSuccess(stderrLines)) {
          this.eventStream.emit({
            type: 'warning',
            message:
              'Some playlist entries were unavailable and have been skipped.',
          });
          this.eventStream.emit({ type: 'completed' });
          return ok(result);
        }

        const classified = this.failureClassifier.classifyFromProcessResult(
          result,
          'yt-dlp'
        );
        this.eventStream.emit({
          type: 'failed',
          error: classified.summary,
        });
        return fail([
          {
            category: 'workflow-conflicts' as const,
            message: classified.summary,
          },
        ]);
      }

      this.eventStream.emit({ type: 'completed' });
      return ok(result);
    } catch (e) {
      const classified = this.failureClassifier.classifyFromError(e);
      this.eventStream.emit({
        type: 'failed',
        error: classified.summary,
      });
      return fail([
        {
          category: 'workflow-conflicts' as const,
          message: classified.summary,
        },
      ]);
    }
  }

  /**
   * Determines if a non-zero exit code is due to entry-level failures only.
   * If all stderr content matches known entry-unavailable patterns,
   * the download is considered a partial success (some items downloaded).
   */
  private isPartialSuccess(stderrLines: string[]): boolean {
    if (stderrLines.length === 0) return false;

    const entryLevelPatterns = [
      'video unavailable',
      'video is unavailable',
      'private video',
      'this video is private',
      'this video has been removed',
      'video has been removed',
      'no longer available',
      'this content is no longer available',
      'this video is not available',
      'sign in to confirm',
      'members only',
      'members-only',
      'join this channel',
      'this live event',
      'premiere will begin',
      'is unavailable',
      'unavailable video',
    ];

    const nonEmptyLines = stderrLines.filter(
      (line) => line.trim().length > 0
    );

    // Every stderr line must match an entry-level pattern or be ignorable
    for (const line of nonEmptyLines) {
      const lower = line.toLowerCase().trim();

      // Skip yt-dlp progress/download status lines
      if (
        lower.startsWith('[download]') ||
        lower.startsWith('[youtube]') ||
        lower.startsWith('warning:') ||
        lower.startsWith('[info]') ||
        lower.startsWith('[debug]')
      ) {
        continue;
      }

      // Check if it matches an entry-level unavailable pattern
      const isEntryLevel = entryLevelPatterns.some((p) => lower.includes(p));
      if (!isEntryLevel) {
        // This line indicates a real error, not just unavailable entries
        return false;
      }
    }

    return true;
  }
}
