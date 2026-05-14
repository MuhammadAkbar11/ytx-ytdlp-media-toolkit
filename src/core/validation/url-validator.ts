import { Result, ok, fail } from '../../utils/result';
import { AppError } from '../../types/errors';
import { createAppError } from '../../utils/errors';
import { UrlType, ValidatedUrl } from '../../types/domain';
import { UrlNormalizer } from '../url/url-normalizer';

/**
 * Validates and classifies a YouTube URL.
 *
 * @param input The raw URL input string.
 * @returns A Result containing the ValidatedUrl or an AppError.
 */
export function validateUrl(input: string): Result<ValidatedUrl, AppError> {
  const normalizer = new UrlNormalizer();
  const normalizedUrl = normalizer.normalize(input);

  try {
    const url = new URL(normalizedUrl);
    const host = url.hostname.replace(/^www\./, ''); // Normalize host

    const supportedHosts = ['youtube.com', 'youtu.be', 'music.youtube.com'];

    if (!supportedHosts.includes(host)) {
      return fail(
        createAppError(
          'INVALID_URL',
          `Unsupported host: ${url.hostname}`,
          'fatal',
          'validation'
        )
      );
    }

    let type: UrlType = 'video';

    if (host === 'youtu.be') {
      type = 'video';
    } else if (host === 'music.youtube.com') {
      type = 'music';
    } else if (url.pathname.startsWith('/shorts/')) {
      type = 'short';
    } else if (url.pathname === '/playlist' || url.searchParams.has('list')) {
      type = 'playlist';
    }

    return ok({
      normalizedUrl,
      type,
    });
  } catch (e) {
    return fail(
      createAppError(
        'INVALID_URL',
        'Malformed URL',
        'fatal',
        'validation',
        e
      )
    );
  }
}
