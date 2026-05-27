import { describe, expect, test } from 'bun:test';
import { Mp4DownloadWorkflow } from '../../src/core/workflows/mp4-download-workflow';
import { ProfileValidator } from '../../src/core/profiles/profile-validator';
import { ArgumentBuilder } from '../../src/core/downloader/argument-builder';
import { ProcessRunner } from '../../src/infrastructure/process/process-runner';
import { EventStream } from '../../src/core/runtime/event-stream';
import { DownloadProfile } from '../../src/types/domain';

const baseProfile: DownloadProfile = {
  url: 'https://youtube.com/watch?v=123',
  mediaKind: 'video',
  outputPath: '.',
  filenameTemplate: '%(title)s.%(ext)s',
  videoQuality: 1080,
  subtitleOptions: { mode: 'none', output: 'separate' },
  metadataOptions: {
    embedMetadata: false,
    embedThumbnail: false,
    embedChapters: false,
  },
  playlist: { mode: 'first_video' },
};

describe('Mp4DownloadWorkflow', () => {
  test('should execute successfully and emit events', async () => {
    const validator = new ProfileValidator();
    const builder = new ArgumentBuilder();
    const eventStream = new EventStream();
    const events: any[] = [];
    eventStream.subscribe((e: any) => {
      if (e.type !== 'debug') events.push(e);
    });
    const runner: ProcessRunner = {
      run: async (_cmd: string, _args: string[], options?: any) => {
        if (options?.onStdout)
          options.onStdout(
            '[download]  50.0% of 10.00MiB at 1.00MiB/s ETA 00:05'
          );
        return { exitCode: 0, stdout: 'downloaded', stderr: '' };
      },
    };
    const workflow = new Mp4DownloadWorkflow(
      validator,
      builder,
      runner,
      eventStream
    );
    const res = await workflow.run(baseProfile);
    expect(res.ok).toBe(true);
    expect(events.length).toBe(3);
    expect(events[0].type).toBe('started');
    expect(events[1].type).toBe('progress');
    expect(events[2].type).toBe('completed');
  });
});
