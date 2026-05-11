import Bun from 'bun';
import { StreamNormalizer } from '../../core/runtime/stream-normalizer';
import { processLifecycleManager } from './process-lifecycle';

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

    processLifecycleManager.register(process);

    const decoder = new TextDecoder();

    // Helper to read stream line by line
    const readStream = async (
      stream: ReadableStream,
      onLine?: (line: string) => void
    ): Promise<string> => {
      let fullText = '';
      const normalizer = new StreamNormalizer();
      const reader = stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          
          if (onLine) {
            const lines = normalizer.processChunk(chunk);
            for (const line of lines) {
              onLine(line);
            }
          }
        }
        
        if (onLine) {
          const lines = normalizer.flush();
          for (const line of lines) {
            onLine(line);
          }
        }
      } finally {
        reader.releaseLock();
      }
      return fullText;
    };

    try {
      const [stdout, stderr] = await Promise.all([
        readStream(process.stdout, options?.onStdout),
        readStream(process.stderr, options?.onStderr),
      ]);

      const exitCode = await process.exited;

      return { exitCode, stdout, stderr };
    } finally {
      processLifecycleManager.unregister(process);
    }
  }
}
