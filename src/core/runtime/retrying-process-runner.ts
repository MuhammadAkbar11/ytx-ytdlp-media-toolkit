import { ProcessRunner } from '../../infrastructure/process/process-runner';
import {
  ProcessSpawnOptions,
  ProcessExecutionResult,
} from '../../types/process';
import { TransientFailureClassifier } from './transient-failure-classifier';
import { EventStream } from './event-stream';
import { runtimeDiagnostics } from './diagnostics/runtime-diagnostics';

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
        const errorMsg = e instanceof Error ? e.message : String(e);
        this.eventStream.emit({
          type: 'failed',
          error: `Failed to start ${command}. ${errorMsg}`,
        });
        throw e;
      }

      if (result.exitCode === 0) {
        runtimeDiagnostics.log(
          'retry',
          `Success on attempt ${attempt}/${this.maxRetries}: ${command}`
        );
        return result;
      }

      if (attempt >= this.maxRetries) {
        runtimeDiagnostics.log(
          'retry',
          `Max retries (${this.maxRetries}) exhausted: ${command} exit=${result.exitCode}`
        );
        return result;
      }

      if (this.classifier.isRetryable(result)) {
        const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
        runtimeDiagnostics.log(
          'retry',
          `Retryable failure on attempt ${attempt}: exit=${result.exitCode}, retrying in ${delay}ms`
        );

        this.eventStream.emit({
          type: 'warning',
          message: `Transient failure detected. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${this.maxRetries})`,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        runtimeDiagnostics.log(
          'retry',
          `Non-retryable failure on attempt ${attempt}: exit=${result.exitCode}`
        );
        return result;
      }
    }
  }
}
