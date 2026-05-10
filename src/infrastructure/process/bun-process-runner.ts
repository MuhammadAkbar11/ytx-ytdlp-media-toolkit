import Bun from 'bun';

import { ProcessRunner } from './process-runner';
import {
  ProcessSpawnOptions,
  ProcessExecutionResult,
} from '../../types/process';

export class BunProcessRunner implements ProcessRunner {
  async run(
    command: string,
    args: string[],
    options?: ProcessSpawnOptions
  ): Promise<ProcessExecutionResult> {
    const process = Bun.spawn([command, ...args], {
      cwd: options?.cwd,
      env: options?.env,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(process.stdout).text();
    const stderr = await new Response(process.stderr).text();
    const exitCode = await process.exited;

    return { exitCode, stdout, stderr };
  }
}
