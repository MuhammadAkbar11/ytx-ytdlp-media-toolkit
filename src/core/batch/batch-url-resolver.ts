import { readFile } from 'fs/promises';
import { extname } from 'path';
import { z } from 'zod';
import { validateUrl } from '../validation/url-validator';
import { Result, ok, fail } from '../../utils/result';
import { AppError } from '../../types/errors';
import { createAppError } from '../../utils/errors';

const SUPPORTED_EXTENSIONS = ['.txt', '.md'];
const UNSUPPORTED_EXTENSIONS = ['.csv', '.json', '.yaml', '.xml'];

const BatchInputSchema = z.object({
  urls: z
    .array(z.string().url('Invalid URL format'))
    .min(1, 'At least one valid URL is required'),
});

export interface BatchResult {
  urls: string[];
  duplicatesRemoved: number;
}

export class BatchUrlResolver {
  /**
   * Resolves batch URLs from either a comma-separated string or a file.
   *
   * @param input - Comma-separated URLs or null if using file input
   * @param filePath - Path to a .txt or .md file, or null if using manual input
   * @returns Result with deduplicated, validated URLs
   */
  async resolve(
    input: string | undefined,
    filePath: string | undefined
  ): Promise<Result<BatchResult, AppError>> {
    let rawUrls: string[];

    if (filePath) {
      const fileResult = await this.readUrlsFromFile(filePath);
      if (!fileResult.ok) {
        return fileResult;
      }
      rawUrls = fileResult.value;
    } else if (input) {
      rawUrls = this.splitUrls(input);
    } else {
      return fail(
        createAppError(
          'BATCH_NO_INPUT',
          'No URLs provided. Use comma-separated URLs or --file flag.',
          'fatal',
          'batch'
        )
      );
    }

    // Normalize and trim
    const trimmed = rawUrls.map((u) => u.trim()).filter((u) => u.length > 0);

    if (trimmed.length === 0) {
      return fail(
        createAppError(
          'BATCH_NO_VALID_URLS',
          'No valid URLs found in input.',
          'fatal',
          'batch'
        )
      );
    }

    // Deduplicate
    const unique = [...new Set(trimmed)];
    const duplicatesRemoved = trimmed.length - unique.length;

    // Validate each URL and reject playlists
    const validUrls: string[] = [];
    for (const url of unique) {
      const valRes = validateUrl(url);
      if (!valRes.ok) {
        return fail(
          createAppError(
            'BATCH_INVALID_URL',
            `Invalid URL: ${url}. Only valid YouTube video URLs are supported in batch mode.`,
            'fatal',
            'batch'
          )
        );
      }
      if (
        valRes.value.type === 'playlist' ||
        valRes.value.type === 'music'
      ) {
        return fail(
          createAppError(
            'BATCH_PLAYLIST_REJECTED',
            `Playlist URLs are not supported in batch mode: ${url}`,
            'fatal',
            'batch'
          )
        );
      }
      validUrls.push(valRes.value.normalizedUrl);
    }

    // Zod structural validation
    const zodResult = BatchInputSchema.safeParse({ urls: validUrls });
    if (!zodResult.success) {
      const firstError = zodResult.error.issues[0];
      return fail(
        createAppError(
          'BATCH_VALIDATION_ERROR',
          firstError?.message || 'Batch URL validation failed',
          'fatal',
          'batch'
        )
      );
    }

    return ok({ urls: validUrls, duplicatesRemoved });
  }

  /**
   * Splits a comma-separated URL string.
   */
  private splitUrls(input: string): string[] {
    return input.split(',').map((s) => s.trim());
  }

  /**
   * Reads URLs from a file, supporting .txt and .md formats.
   */
  private async readUrlsFromFile(
    filePath: string
  ): Promise<Result<string[], AppError>> {
    const ext = extname(filePath).toLowerCase();

    if (UNSUPPORTED_EXTENSIONS.includes(ext)) {
      return fail(
        createAppError(
          'BATCH_UNSUPPORTED_FILE',
          `Unsupported file type: ${ext}. Only .txt and .md files are supported.`,
          'fatal',
          'batch'
        )
      );
    }

    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return fail(
        createAppError(
          'BATCH_UNSUPPORTED_FILE',
          `Unsupported file type: ${ext}. Supported: .txt, .md`,
          'fatal',
          'batch'
        )
      );
    }

    let content: string;
    try {
      content = await readFile(filePath, 'utf-8');
    } catch (e) {
      return fail(
        createAppError(
          'BATCH_FILE_READ_ERROR',
          `Failed to read file: ${filePath}`,
          'fatal',
          'batch',
          e
        )
      );
    }

    return ok(this.extractUrls(content, ext));
  }

  /**
   * Extracts URLs from file content based on file type.
   */
  private extractUrls(content: string, ext: string): string[] {
    if (ext === '.md') {
      return this.extractUrlsFromMarkdown(content);
    }
    // .txt — each non-empty line is a URL
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
  }

  /**
   * Extracts URLs from markdown content.
   * Handles raw URLs, markdown links [text](url), and bare lines.
   */
  private extractUrlsFromMarkdown(content: string): string[] {
    const urls: string[] = [];
    // Match markdown links [text](url)
    const mdLinkRegex = /\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = mdLinkRegex.exec(content)) !== null) {
      urls.push(match[1]);
    }

    // Also extract bare URLs on their own lines
    const bareUrlRegex = /^(https?:\/\/[^\s]+)/gm;
    const contentWithoutLinks = content.replace(mdLinkRegex, '');

    while ((match = bareUrlRegex.exec(contentWithoutLinks)) !== null) {
      urls.push(match[1]);
    }

    return urls;
  }
}