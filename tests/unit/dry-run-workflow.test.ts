/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test } from 'bun:test';
import { DryRunWorkflow } from '../../src/core/workflows/dry-run-workflow';
import { InspectionService } from '../../src/core/downloader/inspection.service';
import { FormatNormalizer } from '../../src/core/formats/format-normalizer';
import { ProfileBuilder } from '../../src/core/profiles/profile-builder';
import { ProfileValidator } from '../../src/core/profiles/profile-validator';
import { PresetRegistry } from '../../src/core/presets/preset-registry';
import { ArgumentBuilder } from '../../src/core/downloader/argument-builder';
import { AppConfig } from '../../src/types/config';
import { ok } from '../../src/utils/result';

describe('DryRunWorkflow', () => {
  test('should execute end-to-end with valid inputs', async () => {
    // Mock InspectionService
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

    const normalizer = new FormatNormalizer();
    const profileBuilder = new ProfileBuilder();
    const profileValidator = new ProfileValidator();
    const presetRegistry = new PresetRegistry();
    const argumentBuilder = new ArgumentBuilder();

    const workflow = new DryRunWorkflow(
      mockInspectionService,
      normalizer,
      profileBuilder,
      profileValidator,
      presetRegistry,
      argumentBuilder
    );

    const config: AppConfig = {
      version: 1,
      outputDirectory: '.',
      preferredBrowser: null,
      preferredBitrate: 192,
      filenameTemplate: '%(title)s.%(ext)s',
      subtitleOptions: { mode: 'none', output: 'separate' },
      metadataOptions: {
        embedMetadata: false,
        embedThumbnail: false,
        embedChapters: false,
      },
      useDownloadArchive: false,
      defaultPreset: 'balanced',
      preferredVideoQuality: 'best',
    };

    const res = await workflow.run('https://youtube.com/watch?v=123', config);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.inspectionSummary.title).toBe('Test Video');
      expect(res.value.formats.length).toBe(1);
      expect(res.value.profile.url).toBe('https://youtube.com/watch?v=123');
      expect(res.value.arguments).toBeDefined();
      expect(res.value.arguments.length).toBeGreaterThan(0);
    }
  });

  test('should fail on invalid URL', async () => {
    const workflow = new DryRunWorkflow(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    const config: any = {};
    const res = await workflow.run('invalid-url', config);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error[0].category).toBe('unsupported-values');
    }
  });
});
