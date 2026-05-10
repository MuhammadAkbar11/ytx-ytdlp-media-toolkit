import { DownloadSession, ValidatedUrl } from '../../types/domain';

/**
 * Creates a new DownloadSession.
 *
 * @param url The validated URL to start the session with.
 * @returns A new DownloadSession object.
 */
export function createSession(url?: ValidatedUrl): DownloadSession {
  return {
    url,
  };
}

/**
 * Note on Immutable Updates:
 *
 * As per architecture guidelines, updates to the session should remain immutable.
 * Use the spread operator to create new session states:
 *
 * ```ts
 * const updatedSession = {
 *   ...session,
 *   info: inspectionResult,
 * };
 * ```
 *
 * Avoid direct mutation:
 * ```ts
 * session.info = inspectionResult; // AVOID
 * ```
 */
