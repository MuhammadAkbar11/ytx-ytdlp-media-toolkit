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

    const decoder = new TextDecoder();

    // Helper to read stream line by line
    const readStream = async (
      stream: ReadableStream,
      onLine?: (line: string) => void
    ): Promise<string> => {
      let fullText = '';
      let buffer = '';
      const reader = stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          
          if (onLine) {
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              onLine(line);
            }
          }
        }
        
        if (buffer && onLine) {
          onLine(buffer);
        }
      } finally {
        reader.releaseLock();
      }
      return fullText;
    };

    const [stdout, stderr] = await Promise.all([
      readStream(process.stdout, options?.onStdout),
      readStream(process.stderr, options?.onStderr),
    ]);

    const exitCode = await process.exited;

    return { exitCode, stdout, stderr };
  }
}
