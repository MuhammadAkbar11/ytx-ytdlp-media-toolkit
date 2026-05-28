import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { Result, ok, fail } from '../../utils/result';

export interface PlaylistItem {
  id: string;
  title: string;
  index: number;
}

export class PlaylistInspector {
  constructor(private processRunner: ProcessRunner) {}

  /**
   * Fetches playlist items using yt-dlp.
   * @param url The URL of the playlist.
   */
  async getPlaylistItems(
    url: string,
    browserCookies?: string
  ): Promise<Result<PlaylistItem[], string>> {
    const args = ['--dump-json', '--flat-playlist', '--no-warnings'];
    if (browserCookies) {
      args.push('--cookies-from-browser', browserCookies);
    }
    args.push(url);

    let output = '';
    let errorOutput = '';

    try {
      const result = await this.processRunner.run('yt-dlp', args, {
        onStdout: (chunk) => {
          output += chunk + '\n';
        },
        onStderr: (chunk) => {
          errorOutput += chunk + '\n';
        },
        bufferStdout: true,
        bufferStderr: true,
      });

      if (result.exitCode !== 0) {
        const lower = errorOutput.toLowerCase();
        if (
          lower.includes('private') ||
          lower.includes('sign in') ||
          lower.includes('cookie')
        ) {
          return fail(
            'This playlist may be private. Try with --browser <name> for authenticated access.'
          );
        }
        return fail(
          'Failed to fetch playlist information. The playlist may be invalid or unavailable.'
        );
      }

      const items: PlaylistItem[] = [];
      const lines = output.split('\n').filter((line) => line.trim().length > 0);

      // In --flat-playlist --dump-json, each video is a separate JSON object per line.
      // Alternatively, sometimes yt-dlp dumps one large playlist JSON. We will try parsing per-line.
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.entries) {
            // It's a full playlist object
            parsed.entries.forEach((entry: any, i: number) => {
              items.push({
                id: entry.id || '',
                title: entry.title || entry.id || 'Unknown Title',
                index: entry.playlist_index ?? i + 1,
              });
            });
          } else if (parsed.id && parsed.title) {
            // It's an individual item object (from --flat-playlist per-line dump)
            items.push({
              id: parsed.id,
              title: parsed.title,
              index: parsed.playlist_index ?? items.length + 1,
            });
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // ignore lines that are not valid JSON
        }
      }

      if (items.length === 0) {
        return fail(
          'No items found in the playlist. It may be private or invalid.'
        );
      }

      return ok(items);
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  }
}
