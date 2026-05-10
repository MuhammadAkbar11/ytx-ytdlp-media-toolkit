import { describe, expect, test } from 'bun:test';
import { FilenamePreview } from '../../src/cli/renderers/filename-preview';
import { ProcessRunner } from '../../src/infrastructure/process/process-runner';
import { ArgumentBuilder } from '../../src/core/downloader/argument-builder';
import { DownloadProfile } from '../../src/types/domain';

describe('FilenamePreview', () => {
  test('should generate preview successfully', async () => {
    const mockProcessRunner = {
      run: async (command: string, args: string[]) => {
        expect(args).toContain('--get-filename');
        return { exitCode: 0, stdout: 'Video Title.mp4\n', stderr: '' };
      },
    } as ProcessRunner;

    const builder = new ArgumentBuilder();
    const preview = new FilenamePreview(mockProcessRunner, builder);

    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: { embedMetadata: false, embedThumbnail: false, embedChapters: false },
    };

    const result = await preview.generatePreview(profile);

    expect(result).toBe('Video Title.mp4');
  });

  test('should report failure when yt-dlp fails', async () => {
    const mockProcessRunner = {
      run: async () => {
        return { exitCode: 1, stdout: '', stderr: 'Video not found' };
      },
    } as ProcessRunner;

    const builder = new ArgumentBuilder();
    const preview = new FilenamePreview(mockProcessRunner, builder);

    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
      outputDirectory: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: { embedMetadata: false, embedThumbnail: false, embedChapters: false },
    };

    const result = await preview.generatePreview(profile);

    expect(result).toContain('Error: yt-dlp failed');
  });
});
