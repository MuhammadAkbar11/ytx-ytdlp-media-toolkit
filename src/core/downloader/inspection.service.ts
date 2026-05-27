import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { Result, ok, fail } from '../../utils/result';
import { AppError } from '../../types/errors';
import { createAppError } from '../../utils/errors';
import { YtDlpInfo } from '../../types/domain';
import { SessionInspectionCache } from '../cache/session-inspection-cache';
import { RuntimeContext } from '../runtime/runtime-context';

export class InspectionService {
  constructor(
    private processRunner: ProcessRunner,
    private cache: SessionInspectionCache
  ) {}

  /**
   * Fetches metadata for a given URL using yt-dlp.
   * Uses a session-scoped cache to avoid redundant network calls.
   *
   * @param url The validated URL to inspect.
   * @returns A Result containing the parsed YtDlpInfo or an AppError.
   */
  async inspect(
    url: string,
    context?: RuntimeContext
  ): Promise<Result<YtDlpInfo, AppError>> {
    const cachedData = this.cache.get(url, context);
    if (cachedData) {
      return ok(cachedData);
    }

    const args = ['--dump-single-json', '--no-warnings', '--skip-download'];

    if (context?.browserCookies) {
      args.push('--cookies-from-browser', context.browserCookies);
    }

    args.push(url);

    try {
      const result = await this.processRunner.run('yt-dlp', args);

      if (result.exitCode !== 0) {
        // Classify common yt-dlp failure patterns for better diagnostics
        const stderrLower = result.stderr.toLowerCase();
        let diagnosticHint = '';
        if (
          stderrLower.includes('sign in') ||
          stderrLower.includes('login') ||
          stderrLower.includes('cookie')
        ) {
          diagnosticHint =
            ' (may require authentication — try: ytx download <url> --browser firefox)';
        } else if (
          stderrLower.includes('private') ||
          stderrLower.includes('members only')
        ) {
          diagnosticHint = ' (content may be private or members-only)';
        } else if (
          stderrLower.includes('not available') ||
          stderrLower.includes('unavailable')
        ) {
          diagnosticHint = ' (content may be region-locked or removed)';
        } else if (
          stderrLower.includes('network') ||
          stderrLower.includes('connection') ||
          stderrLower.includes('timeout')
        ) {
          diagnosticHint = ' (network issue — check connectivity)';
        }

        return fail(
          createAppError(
            'DOWNLOAD_FAILED',
            `yt-dlp inspection failed (exit ${result.exitCode}): ${result.stderr.trim()}${diagnosticHint}`,
            'fatal',
            'process'
          )
        );
      }

      try {
        const data = JSON.parse(result.stdout) as YtDlpInfo;
        this.cache.set(url, data, context);
        return ok(data);
      } catch (parseError) {
        return fail(
          createAppError(
            'DOWNLOAD_FAILED',
            `Failed to parse yt-dlp JSON output. Raw output starts with: ${result.stdout.slice(0, 200)}`,
            'fatal',
            'process',
            parseError
          )
        );
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      return fail(
        createAppError(
          'DOWNLOAD_FAILED',
          `Failed to run yt-dlp inspection: ${errorMsg}`,
          'fatal',
          'process',
          e
        )
      );
    }
  }
}
