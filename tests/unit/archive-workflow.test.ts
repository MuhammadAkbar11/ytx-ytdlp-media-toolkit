/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test } from 'bun:test';
import { ArchiveWorkflow } from '../../src/core/workflows/archive-workflow';
import { ProfileValidator } from '../../src/core/profiles/profile-validator';
import { ArgumentBuilder } from '../../src/core/downloader/argument-builder';
import { ProcessRunner } from '../../src/infrastructure/process/process-runner';
import { EventStream } from '../../src/core/runtime/event-stream';
import { DownloadProfile } from '../../src/types/domain';
import { DownloadEvent } from '../../src/types/events';

describe('ArchiveWorkflow', () => {
  test('should execute successfully and emit events', async () => {
    const validator = new ProfileValidator();
    const builder = new ArgumentBuilder();
    const eventStream = new EventStream();

    const events: DownloadEvent[] = [];
    eventStream.subscribe((e) => events.push(e));

    // Mock ProcessRunner that simulates output
    const mockProcessRunner = {
      run: async (command: string, args: string[], options?: any) => {
        if (options?.onStdout) {
          options.onStdout(
            '[download]  50.0% of 10.00MiB at 1.00MiB/s ETA 00:05'
          );
        }
        return { exitCode: 0, stdout: 'downloaded', stderr: '' };
      },
    } as ProcessRunner;

    const workflow = new ArchiveWorkflow(
      validator,
      builder,
      mockProcessRunner,
      eventStream
    );

    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: false,
        embedThumbnail: false,
        embedChapters: false,
      },
      playlist: { mode: 'first_video' },
      useDownloadArchive: true,
      archivePath: 'my-archive.txt',
    };

    const res = await workflow.run(profile);

    expect(res.ok).toBe(true);
    expect(events.length).toBe(3); // started, progress, completed
    expect(events[0].type).toBe('started');
    expect(events[1].type).toBe('progress');
    expect(events[2].type).toBe('completed');
  });
});
