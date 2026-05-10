/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, test } from 'bun:test';
import { DownloadWorkflow } from '../../src/core/workflows/download-workflow';
import { ProfileValidator } from '../../src/core/profiles/profile-validator';
import { ArgumentBuilder } from '../../src/core/downloader/argument-builder';
import { ProcessRunner } from '../../src/infrastructure/process/process-runner';
import { DownloadProfile } from '../../src/types/domain';

describe('DownloadWorkflow', () => {
  test('should execute successfully with valid profile', async () => {
    const validator = new ProfileValidator();
    const builder = new ArgumentBuilder();

    // Mock ProcessRunner
    const mockProcessRunner = {
      run: async (command: string, args: string[]) => {
        return { exitCode: 0, stdout: 'downloaded', stderr: '' };
      },
    } as ProcessRunner;

    const workflow = new DownloadWorkflow(
      validator,
      builder,
      mockProcessRunner
    );

    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      videoQuality: 1080,
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: false,
        embedThumbnail: false,
        embedChapters: false,
      },
      playlist: { mode: 'entire_playlist' },
      useDownloadArchive: false,
    };

    const res = await workflow.run(profile);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.exitCode).toBe(0);
      expect(res.value.stdout).toBe('downloaded');
    }
  });

  test('should fail on invalid profile', async () => {
    const validator = new ProfileValidator();
    const builder = new ArgumentBuilder();
    const mockProcessRunner = {} as ProcessRunner;

    const workflow = new DownloadWorkflow(
      validator,
      builder,
      mockProcessRunner
    );

    const profile: DownloadProfile = {
      url: '', // Invalid
      mediaKind: 'video',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      videoQuality: 1080,
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: false,
        embedThumbnail: false,
        embedChapters: false,
      },
      playlist: { mode: 'entire_playlist' },
      useDownloadArchive: false,
    };

    const res = await workflow.run(profile);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error[0].category).toBe('missing-fields');
    }
  });

  test('should propagate process failures', async () => {
    const validator = new ProfileValidator();
    const builder = new ArgumentBuilder();

    const mockProcessRunner = {
      run: async () => {
        return { exitCode: 1, stdout: '', stderr: 'error message' };
      },
    } as ProcessRunner;

    const workflow = new DownloadWorkflow(
      validator,
      builder,
      mockProcessRunner
    );

    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      videoQuality: 1080,
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: false,
        embedThumbnail: false,
        embedChapters: false,
      },
      playlist: { mode: 'entire_playlist' },
      useDownloadArchive: false,
    };

    const res = await workflow.run(profile);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error[0].category).toBe('workflow-conflicts');
      expect(res.error[0].message).toContain('exit code 1');
    }
  });
});
