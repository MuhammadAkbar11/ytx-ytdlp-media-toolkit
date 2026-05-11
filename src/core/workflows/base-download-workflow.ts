import { DownloadProfile } from '../../types/domain';
import { Result, ok, fail } from '../../utils/result';
import { ProfileValidator, ValidationIssue } from '../profiles/profile-validator';
import { ArgumentBuilder } from '../downloader/argument-builder';
import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { ProcessExecutionResult } from '../../types/process';
import { EventStream } from '../runtime/event-stream';

export class BaseDownloadWorkflow {
  constructor(
    protected profileValidator: ProfileValidator,
    protected argumentBuilder: ArgumentBuilder,
    protected processRunner: ProcessRunner,
    protected eventStream: EventStream
  ) {}

  /**
   * Runs the download workflow.
   * Validates the profile, builds arguments, and executes yt-dlp with event streaming.
   *
   * @param profile The download profile to execute.
   * @returns A Result containing the ProcessExecutionResult or a list of validation issues.
   */
  async run(profile: DownloadProfile): Promise<Result<ProcessExecutionResult, ValidationIssue[]>> {
    // 1. Validate Profile
    const valRes = this.profileValidator.validate(profile);
    if (!valRes.ok) {
      return fail(valRes.error);
    }

    // 2. Build Arguments
    const args = this.argumentBuilder.build(profile);

    // 3. Emit started event
    this.eventStream.emit({ 
      type: 'started',
      message: profile.browserCookies ? 'Fetching browser cookies...' : 'Starting download...'
    });

    // 4. Execute yt-dlp
    try {
      const result = await this.processRunner.run('yt-dlp', args, {
        onStdout: (line) => this.eventStream.processLine(line),
        onStderr: (line) => this.eventStream.processLine(line),
      });
      
      if (result.exitCode !== 0) {
        this.eventStream.emit({ type: 'failed', error: `yt-dlp failed with exit code ${result.exitCode}` });
        return fail([{
          category: 'workflow-conflicts',
          message: `yt-dlp failed with exit code ${result.exitCode}: ${result.stderr}`,
        }]);
      }
      
      this.eventStream.emit({ type: 'completed' });
      return ok(result);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      this.eventStream.emit({ type: 'failed', error: `Failed to execute yt-dlp: ${errorMsg}` });
      return fail([{
        category: 'workflow-conflicts',
        message: `Failed to execute yt-dlp: ${errorMsg}`,
      }]);
    }
  }
}
