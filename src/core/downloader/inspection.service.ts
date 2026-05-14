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
  async inspect(url: string, context?: RuntimeContext): Promise<Result<YtDlpInfo, AppError>> {
    const cachedData = this.cache.get(url, context);
    if (cachedData) {
      return ok(cachedData);
    }

    const args = [
      '--dump-single-json',
      '--no-warnings',
      '--skip-download',
    ];

    if (context?.browserCookies) {
      args.push('--cookies-from-browser', context.browserCookies);
    }

    args.push(url);

    try {
      const result = await this.processRunner.run('yt-dlp', args);

      if (result.exitCode !== 0) {
        return fail(
          createAppError(
            'DOWNLOAD_FAILED',
            `yt-dlp inspection failed with exit code ${result.exitCode}: ${result.stderr}`,
            'fatal',
            'process'
          )
        );
      }

      const data = JSON.parse(result.stdout) as YtDlpInfo;
      this.cache.set(url, data, context);
      return ok(data);
    } catch (e) {
      return fail(
        createAppError(
          'DOWNLOAD_FAILED',
          'Failed to parse yt-dlp output',
          'fatal',
          'process',
          e
        )
      );
    }
  }
}
