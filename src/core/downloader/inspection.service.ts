import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { Result, ok, fail } from '../../utils/result';
import { AppError } from '../../types/errors';
import { createAppError } from '../../utils/errors';
import { YtDlpInfo } from '../../types/domain';
import { SessionInspectionCache } from '../cache/session-inspection-cache';
import { RuntimeContext } from '../runtime/runtime-context';
import { FailureClassifier } from '../errors/failure-classifier';
import { runtimeDiagnostics } from '../runtime/diagnostics/runtime-diagnostics';

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
    runtimeDiagnostics.log(
      'inspection',
      `Request: url=${url}, cookies=${context?.browserCookies ?? 'none'}`
    );

    const cachedData = this.cache.get(url, context);
    if (cachedData) {
      runtimeDiagnostics.log(
        'inspection',
        `Cache HIT: url=${url}, title=${cachedData.title ?? 'unknown'}`
      );
      return ok(cachedData);
    }

    runtimeDiagnostics.log('inspection', `Cache MISS: url=${url}`);

    const args = ['--dump-single-json', '--no-warnings', '--skip-download'];

    if (context?.browserCookies) {
      args.push('--cookies-from-browser', context.browserCookies);
    }

    args.push(url);

    try {
      const result = await this.processRunner.run('yt-dlp', args);

      if (result.exitCode !== 0) {
        runtimeDiagnostics.log(
          'inspection',
          `Failed: exit=${result.exitCode}, stderr=${result.stderr.slice(0, 200)}`
        );
        const classified = this.failureClassifier.classifyInspectionFailure(
          result.stderr,
          result.exitCode
        );
        return fail(classified.error);
      }

      try {
        const data = JSON.parse(result.stdout) as YtDlpInfo;
        this.cache.set(url, data, context);
        runtimeDiagnostics.log(
          'inspection',
          `Response: title=${data.title ?? 'unknown'}, isPlaylist=${data.isPlaylist}, entries=${data.entriesCount ?? 0}, formats=${data.rawFormats?.length ?? 0}, duration=${data.duration ?? 'unknown'}s`
        );
        return ok(data);
      } catch (parseError) {
        runtimeDiagnostics.log(
          'inspection',
          `Parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
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
