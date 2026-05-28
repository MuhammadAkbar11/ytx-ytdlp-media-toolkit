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
}
