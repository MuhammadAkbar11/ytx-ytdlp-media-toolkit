import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { Result, ok, fail } from '../../utils/result';
import { AppError } from '../../types/errors';
import { createAppError } from '../../utils/errors';
import { YtDlpInfo } from '../../types/domain';
import { SessionInspectionCache } from '../cache/session-inspection-cache';
import { RuntimeContext } from '../runtime/runtime-context';
import { FailureClassifier } from '../errors/failure-classifier';

export class InspectionService {
  private failureClassifier: FailureClassifier;

  constructor(
    private processRunner: ProcessRunner,
    private cache: SessionInspectionCache
  ) {
    this.failureClassifier = new FailureClassifier();
  }

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
        const classified = this.failureClassifier.classifyInspectionFailure(
          result.stderr,
          result.exitCode
        );
        return fail(classified.error);
      }

      try {
        const data = JSON.parse(result.stdout) as YtDlpInfo;
        this.cache.set(url, data, context);
        return ok(data);
      } catch (parseError) {
        return fail(
          createAppError(
            'DOWNLOAD_FAILED',
            'Failed to parse video information from yt-dlp.',
            'fatal',
            'process',
            parseError
          )
        );
      }
    } catch (e) {
      const classified = this.failureClassifier.classifyFromError(e);
      return fail(classified.error);
    }
  }
}
