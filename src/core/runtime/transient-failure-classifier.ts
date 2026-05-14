import { ProcessExecutionResult } from '../../types/process';

export class TransientFailureClassifier {
  /**
   * Determines if a failure is transient and should be retried.
   */
  isRetryable(result: ProcessExecutionResult): boolean {
    if (result.exitCode === 0) return false;

    const output = result.stderr + result.stdout;

    const transientPatterns = [
      'Network is unreachable',
      'Connection refused',
      'timed out',
      'HTTP Error 50', // 500, 502, 503, 504
      'Rate limit',
      'Sign in to confirm you are not a bot', // sometimes transient
      'Extraction failed', // often transient network issue during extraction
      'Connection reset by peer',
    ];

    return transientPatterns.some((pattern) => output.includes(pattern));
  }
}
