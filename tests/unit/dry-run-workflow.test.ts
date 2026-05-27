import { describe, expect, test } from 'bun:test';
import { DryRunWorkflow } from '../../src/core/workflows/dry-run-workflow';
import { FilenamePreview } from '../../src/cli/renderers/filename-preview';
import { InspectionService } from '../../src/core/downloader/inspection.service';
import { FormatNormalizer } from '../../src/core/formats/format-normalizer';
import { ProfileBuilder } from '../../src/core/profiles/profile-builder';
import { ProfileValidator } from '../../src/core/profiles/profile-validator';
import { PresetRegistry } from '../../src/core/presets/preset-registry';
import { ArgumentBuilder } from '../../src/core/downloader/argument-builder';
import { ProcessRunner } from '../../src/infrastructure/process/process-runner';
import { AppConfig } from '../../src/types/config';
import { DownloadProfile } from '../../src/types/domain';
import { ok } from '../../src/utils/result';

describe('DryRunWorkflow', () => {
  test('should execute end-to-end with valid inputs', async () => {
    const mockInspectionService = {
      inspect: async (url: string) =>
        ok({
          webpageUrl: url,
          isPlaylist: false,
          title: 'Test Video',
          duration: 120,
          rawFormats: [
            {
              id: '18',
              ext: 'mp4',
              height: 360,
              vcodec: 'avc1',
              acodec: 'mp4a',
            },
          ],
        }),
    } as unknown as InspectionService;

    const workflow = new DryRunWorkflow(
      mockInspectionService,
      new FormatNormalizer(),
      new ProfileBuilder(),
      new ProfileValidator(),
      new PresetRegistry(),
      new ArgumentBuilder()
    );

    const config: AppConfig = {
      version: 3,
      outputPath: '.',
      preferredBrowser: null,
      preferredBitrate: 192,
      filenameTemplate: '%(title)s.%(ext)s',
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: false,
        embedThumbnail: false,
        embedChapters: false,
      },
      defaultPreset: 'balanced',
      preferredVideoQuality: 'best',
    };

    const res = await workflow.run('https://youtube.com/watch?v=123', config);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.inspectionSummary.title).toBe('Test Video');
      expect(res.value.formats.length).toBe(1);
      expect(res.value.profile.url).toBe('https://youtube.com/watch?v=123');
    }
  });
});

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
      outputPath: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: false,
        embedThumbnail: false,
        embedChapters: false,
      },
      playlist: { mode: 'first_video' },
    };

    const result = await preview.generatePreview(profile);
    expect(result).toBe('Video Title.mp4');
  });

  test('should report failure when yt-dlp fails', async () => {
    const mockProcessRunner = {
      run: async () => ({ exitCode: 1, stdout: '', stderr: 'Video not found' }),
    } as ProcessRunner;

    const builder = new ArgumentBuilder();
    const preview = new FilenamePreview(mockProcessRunner, builder);

    const profile: DownloadProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video',
      outputPath: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: false,
        embedThumbnail: false,
        embedChapters: false,
      },
      playlist: { mode: 'first_video' },
    };

    const result = await preview.generatePreview(profile);
    expect(result).toContain('Error: yt-dlp failed');
  });
});
