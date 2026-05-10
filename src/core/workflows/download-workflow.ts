import { DownloadProfile } from '../../types/domain';
import { Result, ok, fail } from '../../utils/result';
import { ProfileValidator, ValidationIssue } from '../profiles/profile-validator';
import { ArgumentBuilder } from '../downloader/argument-builder';
import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { ProcessExecutionResult } from '../../types/process';

export class DownloadWorkflow {
  constructor(
    private profileValidator: ProfileValidator,
    private argumentBuilder: ArgumentBuilder,
    private processRunner: ProcessRunner
  ) {}

  /**
   * Runs the download workflow.
   * Validates the profile, builds arguments, and executes yt-dlp.
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

    // 3. Execute yt-dlp
    try {
      const result = await this.processRunner.run('yt-dlp', args);
      
      if (result.exitCode !== 0) {
        return fail([{
          category: 'workflow-conflicts',
          message: `yt-dlp failed with exit code ${result.exitCode}: ${result.stderr}`,
        }]);
      }
      
      return ok(result);
    } catch (e) {
      return fail([{
        category: 'workflow-conflicts',
        message: `Failed to execute yt-dlp: ${e instanceof Error ? e.message : String(e)}`,
      }]);
    }
  }
}
