import { ProcessSpawnOptions, ProcessExecutionResult } from '../../types/process';

export interface ProcessRunner {
  run(
    command: string,
    args: string[],
    options?: ProcessSpawnOptions
  ): Promise<ProcessExecutionResult>;
}
