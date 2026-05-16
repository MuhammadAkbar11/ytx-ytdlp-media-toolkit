import { ProcessRunner } from '../../infrastructure/process/process-runner';
import {
  RuntimeContext,
  PreparedRuntimeContext,
  RuntimeCapabilities,
} from '../runtime/runtime-context';

/**
 * RuntimePreflightResolver executes a centralized preflight resolution
 * pipeline before inspection and workflow execution begin.
 *
 * Responsibilities:
 * - Check runtime dependency availability (yt-dlp, ffmpeg, aria2)
 * - Attach resolved capabilities to the runtime context
 * - Return a fully PreparedRuntimeContext ready for inspection
 */
export class RuntimePreflightResolver {
  constructor(private readonly processRunner: ProcessRunner) {}

  /**
   * Runs the preflight resolution pipeline and returns a PreparedRuntimeContext.
   *
   * @param context The initial runtime context (browser cookies, etc.)
   * @returns A PreparedRuntimeContext with capability flags resolved.
   */
  async resolve(context: RuntimeContext): Promise<PreparedRuntimeContext> {
    const [ytDlpAvailable, ffmpegAvailable, aria2Available] = await Promise.all([
      this.checkAvailable('yt-dlp', ['--version']),
      this.checkAvailable('ffmpeg', ['-version']),
      this.checkAvailable('aria2c', ['--version']),
    ]);

    const capabilities: RuntimeCapabilities = {
      ytDlpAvailable,
      ffmpegAvailable,
      aria2Available,
    };

    return {
      ...context,
      capabilities,
    };
  }

  private async checkAvailable(command: string, args: string[]): Promise<boolean> {
    try {
      const result = await this.processRunner.run(command, args, {
        bufferStdout: false,
        bufferStderr: false,
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
}
