import { ProcessRunner } from '../../infrastructure/process/process-runner';
import {
  ProcessSpawnOptions,
  ProcessExecutionResult,
} from '../../types/process';
import { TransientFailureClassifier } from './transient-failure-classifier';
import { EventStream } from './event-stream';

export class RetryingProcessRunner implements ProcessRunner {
  constructor(
    private inner: ProcessRunner,
    private classifier: TransientFailureClassifier,
    private eventStream: EventStream,
    private maxRetries = 3,
    private baseDelayMs = 1000
  ) {}

  async run(
    command: string,
    args: string[],
    options?: ProcessSpawnOptions
  ): Promise<ProcessExecutionResult> {
    let attempt = 0;
    while (true) {
      attempt++;
      let result: ProcessExecutionResult;
      try {
        result = await this.inner.run(command, args, options);
      } catch (e) {
        // Spawn failure or stream error — not retryable
        const errorMsg = e instanceof Error ? e.message : String(e);
        this.eventStream.emit({
          type: 'failed',
          error: `Process spawn failed for '${command}': ${errorMsg}`,
        });
        throw e;
      }

      if (result.exitCode === 0) {
        return result;
      }

      if (attempt >= this.maxRetries) {
        return result;
      }

      if (this.classifier.isRetryable(result)) {
        const delay = this.baseDelayMs * Math.pow(2, attempt - 1);

        this.eventStream.emit({
          type: 'warning',
          message: `Transient failure detected. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${this.maxRetries})`,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        return result;
      }
    }
  }
}
