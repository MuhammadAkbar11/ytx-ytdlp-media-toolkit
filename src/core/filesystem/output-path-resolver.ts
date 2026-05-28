import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Result, ok, fail } from '../../utils/result';
import { AppError } from '../../types/errors';
import { createAppError } from '../../utils/errors';
import { runtimeDiagnostics } from '../runtime/diagnostics/runtime-diagnostics';

const FALLBACK_OUTPUT_PATH = path.join(os.homedir(), 'Downloads');

export class OutputPathResolver {
  normalizePath(inputPath: string): string {
    let resolved = inputPath;
    if (resolved.startsWith('~')) {
      resolved = path.join(os.homedir(), resolved.slice(1));
    }

    if (!path.isAbsolute(resolved)) {
      resolved = path.resolve(resolved);
    } else {
      resolved = path.normalize(resolved);
    }

    return resolved;
  }

  async validate(outputPath: string): Promise<Result<string, AppError>> {
    const normalized = this.normalizePath(outputPath);

    try {
      await fs.promises.access(
        normalized,
        fs.constants.F_OK | fs.constants.W_OK
      );
      const stats = await fs.promises.stat(normalized);
      if (!stats.isDirectory()) {
        return fail(
          createAppError(
            'OUTPUT_NOT_WRITABLE',
            `Path is not a directory: ${normalized}`,
            'fatal',
            'filesystem'
          )
        );
      }
      return ok(normalized);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'ENOENT') {
        return fail(
          createAppError(
            'OUTPUT_NOT_WRITABLE',
            `Directory does not exist: ${normalized}`,
            'retryable',
            'filesystem'
          )
        );
      }
      if (err.code === 'EACCES') {
        return fail(
          createAppError(
            'OUTPUT_NOT_WRITABLE',
            `Permission denied: ${normalized}`,
            'retryable',
            'filesystem'
          )
        );
      }
      return fail(
        createAppError(
          'OUTPUT_NOT_WRITABLE',
          `Cannot access directory: ${normalized}`,
          'fatal',
          'filesystem',
          e
        )
      );
    }
  }

  async resolve(cliOverride?: string, configValue?: string): Promise<string> {
    if (cliOverride) {
      const normalized = this.normalizePath(cliOverride);
      const result = await this.validate(normalized);
      if (result.ok) {
        runtimeDiagnostics.log(
          'info',
          `Using CLI output path: ${result.value}`
        );
        return result.value;
      }
      runtimeDiagnostics.log(
        'info',
        `CLI output path invalid: ${result.error.message}. Falling back...`
      );
    }

    if (configValue) {
      const normalized = this.normalizePath(configValue);
      const result = await this.validate(normalized);
      if (result.ok) {
        runtimeDiagnostics.log(
          'info',
          `Using config output path: ${result.value}`
        );
        return result.value;
      }
      runtimeDiagnostics.log(
        'info',
        `Config output path invalid: ${result.error.message}. Falling back...`
      );
    }

    runtimeDiagnostics.log(
      'info',
      `Using fallback output path: ${FALLBACK_OUTPUT_PATH}`
    );
    return FALLBACK_OUTPUT_PATH;
  }
}
