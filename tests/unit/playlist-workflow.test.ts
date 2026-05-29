import { describe, expect, test } from 'bun:test';
import { PlaylistWorkflow } from '../../src/core/workflows/playlist-workflow';
import { ProfileValidator } from '../../src/core/profiles/profile-validator';
import { ArgumentBuilder } from '../../src/core/downloader/argument-builder';
import { ProcessRunner } from '../../src/infrastructure/process/process-runner';
import { EventStream } from '../../src/core/runtime/event-stream';
import { DownloadProfile } from '../../src/types/domain';
import { DownloadEvent } from '../../src/types/events';

describe('PlaylistWorkflow', () => {
  test('should execute successfully and emit events including item-started', async () => {
    const validator = new ProfileValidator();
    const builder = new ArgumentBuilder();
    const eventStream = new EventStream();

    const events: DownloadEvent[] = [];
    eventStream.subscribe((e) => {
      if (e.type !== 'debug') events.push(e);
    });

    // Mock ProcessRunner that simulates output
    const mockProcessRunner = {
      run: async (_command: string, _args: string[], options?: { onStdout?: (data: string) => void }) => {
        if (options?.onStdout) {
          options.onStdout('[download] Downloading item 1 of 2');
          options.onStdout(
            '[download]  50.0% of 10.00MiB at 1.00MiB/s ETA 00:05'
          );
        }
        return { exitCode: 0, stdout: 'downloaded', stderr: '' };
      },
    } as ProcessRunner;

    const workflow = new PlaylistWorkflow(
      validator,
      builder,
      mockProcessRunner,
      eventStream
    );

    const profile: DownloadProfile = {
      url: 'https://youtube.com/playlist?list=123',
      mediaKind: 'video',
      outputPath: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: false,
        embedThumbnail: false,
        embedChapters: false,
      },
      playlist: { mode: 'entire_playlist' },
    };

    const res = await workflow.run(profile);

    expect(res.ok).toBe(true);
    expect(events.length).toBe(4); // started, item-started, progress, completed
    expect(events[0].type).toBe('started');
    expect(events[1].type).toBe('item-started');
    expect(events[2].type).toBe('progress');
    expect(events[3].type).toBe('completed');

    if (events[1].type === 'item-started') {
      expect(events[1].itemIndex).toBe(1);
      expect(events[1].totalItems).toBe(2);
    }
  });
});
