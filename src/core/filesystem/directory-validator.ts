/* eslint-disable @typescript-eslint/no-explicit-any */
import { constants } from 'fs';
import { access, stat } from 'fs/promises';
import { Result, ok, fail } from '../../utils/result';
import { AppError } from '../../types/errors';
import { createAppError } from '../../utils/errors';

export class DirectoryValidator {
  async validate(path: string): Promise<Result<string, AppError>> {
    try {
      await access(path, constants.F_OK | constants.W_OK);
      const stats = await stat(path);
      if (!stats.isDirectory()) {
        return fail(
          createAppError(
            'OUTPUT_NOT_WRITABLE',
            `Path is not a directory: ${path}`,
            'fatal',
            'validation'
          )
        );
      }
      return ok(path);
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        return fail(
          createAppError(
            'OUTPUT_NOT_WRITABLE',
            `Directory does not exist: ${path}`,
            'retryable',
            'validation'
          )
        );
      }
      if (e.code === 'EACCES') {
        return fail(
          createAppError(
            'OUTPUT_NOT_WRITABLE',
            `Directory is not writable: ${path}`,
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
}
