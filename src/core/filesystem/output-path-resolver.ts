import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Result, ok, fail } from '../../utils/result';
import { AppError } from '../../types/errors';
import { createAppError } from '../../utils/errors';
import { runtimeDiagnostics } from '../runtime/diagnostics/runtime-diagnostics';

const FALLBACK_OUTPUT_PATH = path.join(os.homedir(), 'Downloads');

/**
 * Resolves and validates the output path for downloads.
 *
 * Resolution order:
 *   1. CLI --output-path
 *   2. config.outputPath
 *   3. ~/Downloads fallback
 *
 * Normalization: resolves ~, relative paths, and symlinks to absolute paths.
 */
export class OutputPathResolver {
  /**
   * Normalize a path string to an absolute, resolved path.
   * Handles ~ expansion, relative paths, and symlinks.
   */
  normalizePath(inputPath: string): string {
    // Expand ~ to home directory
    let resolved = inputPath;
    if (resolved.startsWith('~')) {
      resolved = path.join(os.homedir(), resolved.slice(1));
    }

    // Resolve relative paths and symlinks to absolute
    if (!path.isAbsolute(resolved)) {
      resolved = path.resolve(resolved);
    } else {
      // Even absolute paths should be normalized (remove trailing slashes, resolve . and ..)
      resolved = path.normalize(resolved);
    }

    return resolved;
  }

  /**
   * Validate that a path is a writable directory.
   * Returns ok(normalizedPath) or fail(error).
   */
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
            'validation'
          )
        );
      }
      return ok(normalized);
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        return fail(
          createAppError(
            'OUTPUT_NOT_WRITABLE',
            `Directory does not exist: ${normalized}`,
            'retryable',
            'validation'
          )
        );
      }
      if (e.code === 'EACCES') {
        return fail(
          createAppError(
            'OUTPUT_NOT_WRITABLE',
            `Directory is not writable: ${normalized}`,
            'retryable',
            'validation'
          )
        );
      }
      return fail(
        createAppError(
          'OUTPUT_NOT_WRITABLE',
          `Failed to validate directory: ${e.message}`,
          'fatal',
          'validation',
          e
        )
      );
    }
  }

  /**
   * Resolve the output path using the priority chain:
   *   1. CLI override
   *   2. Config value
   *   3. ~/Downloads fallback
   *
   * Validates the chosen path and falls back to ~/Downloads if invalid.
   */
  async resolve(cliOverride?: string, configValue?: string): Promise<string> {
    // 1. CLI override takes highest priority
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

    // 2. Config value
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

    // 3. ~/Downloads fallback
    runtimeDiagnostics.log(
      'info',
      `Using fallback output path: ${FALLBACK_OUTPUT_PATH}`
    );
    return FALLBACK_OUTPUT_PATH;
  }
}
