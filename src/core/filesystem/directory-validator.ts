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
            'filesystem'
          )
        );
      }
      return ok(path);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'ENOENT') {
        return fail(
          createAppError(
            'OUTPUT_NOT_WRITABLE',
            `Directory does not exist: ${path}`,
            'retryable',
            'filesystem'
          )
        );
      }
      if (err.code === 'EACCES') {
        return fail(
          createAppError(
            'OUTPUT_NOT_WRITABLE',
            `Permission denied: ${path}`,
            'retryable',
            'filesystem'
          )
        );
      }
      return fail(
        createAppError(
          'OUTPUT_NOT_WRITABLE',
          `Cannot access directory: ${path}`,
          'fatal',
          'filesystem',
          e
        )
      );
    }
  }
}
