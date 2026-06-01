import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { Result, ok, fail } from '../../utils/result';
import { AppError } from '../../types/errors';
import { createAppError } from '../../utils/errors';
import { YtDlpInfo, SkippedPlaylistEntry } from '../../types/domain';
import { SessionInspectionCache } from '../cache/session-inspection-cache';
import { RuntimeContext } from '../runtime/runtime-context';
import { FailureClassifier } from '../errors/failure-classifier';
import { runtimeDiagnostics } from '../runtime/diagnostics/runtime-diagnostics';

/** Patterns that indicate an individual entry is unavailable. */
const ENTRY_UNAVAILABLE_PATTERNS = [
  'video unavailable',
  'video is unavailable',
  'private video',
  'this video is private',
  'this video has been removed',
  'video has been removed',
  'no longer available',
  'this content is no longer available',
  'this video is not available',
  'sign in to confirm',
  'members only',
  'members-only',
  'join this channel',
  'this live event',
  'premiere will begin',
];

export class InspectionService {
  private failureClassifier: FailureClassifier;

  constructor(
    private processRunner: ProcessRunner,
    private cache: SessionInspectionCache
  ) {
    this.failureClassifier = new FailureClassifier();
  }

  async inspect(
    url: string,
    context?: RuntimeContext
  ): Promise<Result<YtDlpInfo, AppError>> {
    runtimeDiagnostics.log(
      'inspection',
      `Request: url=${url}, cookies=${context?.browserCookies ?? 'none'}`
    );

    const cachedData = this.cache.get(url, context);
    if (cachedData) {
      runtimeDiagnostics.log(
        'inspection',
        `Cache HIT: url=${url}, title=${cachedData.title ?? 'unknown'}`
      );
      return ok(cachedData);
    }

    runtimeDiagnostics.log('inspection', `Cache MISS: url=${url}`);

    const args = ['--dump-single-json', '--no-warnings', '--skip-download'];

    if (context?.browserCookies) {
      args.push('--cookies-from-browser', context.browserCookies);
    }

    args.push(url);

    return this.executeInspection(url, args, context);
  }

  /**
   * Inspects a playlist URL with error tolerance.
   * Uses --flat-playlist --dump-json --ignore-errors so unavailable entries
   * are skipped per-line and remaining valid entries are still returned.
   * This approach is more resilient than --dump-single-json which fails
   * to produce output when any entry is unavailable.
   */
  async inspectPlaylist(
    url: string,
    context?: RuntimeContext
  ): Promise<Result<YtDlpInfo, AppError>> {
    runtimeDiagnostics.log(
      'inspection',
      `Playlist request (tolerant): url=${url}, cookies=${context?.browserCookies ?? 'none'}`
    );

    const cachedData = this.cache.get(url, context);
    if (cachedData) {
      runtimeDiagnostics.log(
        'inspection',
        `Cache HIT: url=${url}, title=${cachedData.title ?? 'unknown'}`
      );
      return ok(cachedData);
    }

    runtimeDiagnostics.log('inspection', `Cache MISS: url=${url}`);

    // Use --flat-playlist --dump-json for resilient per-entry output.
    // Each entry is an independent JSON line, so unavailable entries
    // don't prevent the rest from being parsed.
    const args = [
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      '--ignore-errors',
    ];

    if (context?.browserCookies) {
      args.push('--cookies-from-browser', context.browserCookies);
    }

    args.push(url);

    return this.executePlaylistInspection(url, args, context);
  }

  /**
   * Handles playlist-specific inspection using --flat-playlist output.
   * Each entry is a separate JSON line, making this inherently resilient
   * to individual entry failures.
   */
  private async executePlaylistInspection(
    url: string,
    args: string[],
    context?: RuntimeContext
  ): Promise<Result<YtDlpInfo, AppError>> {
    let stdout = '';
    let stderr = '';

    try {
      const result = await this.processRunner.run('yt-dlp', args, {
        onStdout: (chunk) => {
          stdout += chunk + '\n';
        },
        onStderr: (chunk) => {
          stderr += chunk + '\n';
        },
        bufferStdout: true,
        bufferStderr: true,
      });

      // With --ignore-errors, non-zero exit may just mean some entries failed.
      // Only abort if we got NO usable output at all.
      if (result.exitCode !== 0 && stdout.trim().length === 0) {
        const lower = stderr.toLowerCase();

        // Check for playlist-level fatal errors
        const isPlaylistFatal =
          lower.includes('playlist does not exist') ||
          lower.includes('unable to download') && !lower.includes('video') ||
          lower.includes('http error 404') ||
          lower.includes('http error 403') ||
          lower.includes('network is unreachable') ||
          lower.includes('connection refused') ||
          lower.includes('timed out');

        if (isPlaylistFatal) {
          const classified = this.failureClassifier.classifyInspectionFailure(
            stderr,
            result.exitCode
          );
          runtimeDiagnostics.log(
            'inspection',
            `Playlist fatal: exit=${result.exitCode}, stderr=${stderr.slice(0, 200)}`
          );
          return fail(classified.error);
        }

        // Non-fatal: playlist-level but no output — treat as content unavailable
        runtimeDiagnostics.log(
          'inspection',
          `Playlist: exit=${result.exitCode}, no output — treating as partial failure`
        );
        return fail(
          createAppError(
            'CONTENT_UNAVAILABLE',
            'No usable playlist entries found. All entries may be unavailable.',
            'fatal',
            'process'
          )
        );
      }

      // Parse per-line JSON output from --flat-playlist
      const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
      let playlistTitle = 'Playlist';
      let entries: { id: string; title: string; duration?: number }[] = [];

      // If output contains a playlist object (first line), extract metadata
      // Otherwise parse each line as an individual entry
      let startIndex = 0;
      if (lines.length > 0) {
        try {
          const firstLine = JSON.parse(lines[0]);
          if (firstLine._type === 'playlist' || firstLine.entries) {
            // Full playlist object — extract title and entries
            playlistTitle = firstLine.title || 'Playlist';
            if (firstLine.entries) {
              for (const entry of firstLine.entries) {
                if (entry.id) {
                  entries.push({
                    id: entry.id,
                    title: entry.title || entry.id,
                    duration: entry.duration,
                  });
                }
              }
            }
            startIndex = 1;
          }
        } catch {
          // First line is not a playlist object — treat all lines as entries
        }
      }

      // Parse remaining lines as individual entries (flat-playlist mode)
      for (let i = startIndex; i < lines.length; i++) {
        try {
          const parsed = JSON.parse(lines[i]);
          if (parsed.id) {
            entries.push({
              id: parsed.id,
              title: parsed.title || parsed.id,
              duration: parsed.duration,
            });
          }
        } catch {
          // Skip non-JSON lines
        }
      }

      if (entries.length === 0) {
        runtimeDiagnostics.log(
          'inspection',
          `Playlist: no valid entries parsed from ${lines.length} output lines`
        );
        return fail(
          createAppError(
            'CONTENT_UNAVAILABLE',
            'No usable playlist entries found. All entries may be unavailable.',
            'fatal',
            'process'
          )
        );
      }

      // Extract skipped entries from stderr
      const skippedEntries = this.extractSkippedEntries(stderr);

      // Build YtDlpInfo from parsed entries
      const data: YtDlpInfo = {
        title: playlistTitle,
        webpageUrl: url,
        isPlaylist: true,
        entriesCount: entries.length,
        rawFormats: [],
        ...(skippedEntries.length > 0 ? { skippedEntries } : {}),
      };

      this.cache.set(url, data, context);
      runtimeDiagnostics.log(
        'inspection',
        `Playlist tolerant: title=${playlistTitle}, entries=${entries.length}, skipped=${skippedEntries.length}`
      );

      return ok(data);
    } catch (e) {
      const classified = this.failureClassifier.classifyFromError(e);
      return fail(classified.error);
    }
  }

  private async executeInspection(
    url: string,
    args: string[],
    context?: RuntimeContext
  ): Promise<Result<YtDlpInfo, AppError>> {
    try {
      const result = await this.processRunner.run('yt-dlp', args);

      if (result.exitCode !== 0) {
        runtimeDiagnostics.log(
          'inspection',
          `Failed: exit=${result.exitCode}, stderr=${result.stderr.slice(0, 200)}`
        );
        const classified = this.failureClassifier.classifyInspectionFailure(
          result.stderr,
          result.exitCode
        );
        return fail(classified.error);
      }

      try {
        const data = JSON.parse(result.stdout) as YtDlpInfo;

        this.cache.set(url, data, context);
        runtimeDiagnostics.log(
          'inspection',
          `Response: title=${data.title ?? 'unknown'}, isPlaylist=${data.isPlaylist}, entries=${data.entriesCount ?? 0}, formats=${data.rawFormats?.length ?? 0}, duration=${data.duration ?? 'unknown'}s`
        );
        return ok(data);
      } catch (parseError) {
        runtimeDiagnostics.log(
          'inspection',
          `Parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
        return fail(
          createAppError(
            'DOWNLOAD_FAILED',
            'Failed to parse video information from yt-dlp.',
            'fatal',
            'process',
            parseError
          )
        );
      }
    } catch (e) {
      const classified = this.failureClassifier.classifyFromError(e);
      return fail(classified.error);
    }
  }

  /**
   * Extracts skipped entry information from yt-dlp stderr warnings.
   * Looks for patterns like "ERROR: [youtube] VIDEO_ID: <reason>"
   * and "WARNING: [youtube:tab] YouTube said: INFO - N unavailable video(s) is/are hidden"
   */
  private extractSkippedEntries(stderr: string): SkippedPlaylistEntry[] {
    const skipped: SkippedPlaylistEntry[] = [];
    const lines = stderr.split('\n');

    // Match ERROR lines from yt-dlp that indicate per-entry failures
    // Pattern: ERROR: [youtube] VIDEO_ID: reason
    const errorLineRegex = /ERROR:\s*\[youtube\]\s+([\w-]+):\s*(.+)/i;

    for (const line of lines) {
      const match = line.match(errorLineRegex);
      if (match) {
        const videoId = match[1];
        const reason = match[2].trim();
        const lower = reason.toLowerCase();

        // Only add if it matches entry-level (not playlist-level) failures
        if (
          ENTRY_UNAVAILABLE_PATTERNS.some((pattern) => lower.includes(pattern))
        ) {
          skipped.push({
            id: videoId,
            title: videoId, // yt-dlp doesn't provide title for unavailable entries
            reason: reason,
          });
        }
      }
    }

    // Also detect hidden unavailable videos from YouTube warnings
    // Pattern: "WARNING: [youtube:tab] YouTube said: INFO - N unavailable video is/are hidden"
    const hiddenRegex =
      /(\d+)\s+unavailable\s+video[s]?\s+(?:is|are)\s+hidden/i;
    for (const line of lines) {
      const match = line.match(hiddenRegex);
      if (match) {
        const count = parseInt(match[1], 10);
        // If we haven't already found this many via ERROR lines, add placeholder
        if (skipped.length < count) {
          for (let i = skipped.length; i < count; i++) {
            skipped.push({
              id: `unavailable-${i + 1}`,
              title: 'Unavailable video',
              reason: 'Video is unavailable (hidden by YouTube)',
            });
          }
        }
      }
    }

    return skipped;
  }
}
