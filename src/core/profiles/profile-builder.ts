import { DownloadProfile, Preset } from '../../types/domain';
import { AppConfig } from '../../types/config';
import { runtimeDiagnostics } from '../runtime/diagnostics/runtime-diagnostics';

export const SYSTEM_DEFAULTS: Partial<DownloadProfile> = {
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

export class ProfileBuilder {
  /**
   * Composes a final DownloadProfile by merging defaults, config, preset, and overrides.
   * Follows the precedence order: System Defaults -> Config Defaults -> Preset Defaults -> Workflow Choices / Overrides
   *
   * @param url The validated URL.
   * @param config The application configuration.
   * @param preset The selected preset (optional).
   * @param overrides Workflow-specific overrides (optional).
   * @returns The fully composed DownloadProfile.
   */
  build(
    url: string,
    config: AppConfig,
    preset?: Preset,
    overrides?: Partial<DownloadProfile>
  ): DownloadProfile {
    const configDefaults: Partial<DownloadProfile> = {
      outputPath: config.outputPath,
      filenameTemplate: config.filenameTemplate,
      browserCookies: config.preferredBrowser,
      videoQuality: config.preferredVideoQuality ?? 'best',
      audioOptions: {
        format: 'mp3',
        bitrate: config.preferredBitrate,
      },
      subtitleOptions: {
        mode: config.subtitleOptions.mode,
        output: config.subtitleOptions.output,
      },
      metadataOptions: {
        embedMetadata: config.metadataOptions.embedMetadata,
        embedThumbnail: config.metadataOptions.embedThumbnail,
        embedChapters: config.metadataOptions.embedChapters,
      },
    };

    const presetProfile = preset ? preset.profile : {};

    const finalProfile: DownloadProfile = {
      ...SYSTEM_DEFAULTS,
      ...configDefaults,
      ...presetProfile,
      ...overrides,
      url,
    } as DownloadProfile;

    // Cleanup incompatible options based on mediaKind to satisfy validator
    if (finalProfile.mediaKind === 'video') {
      delete finalProfile.audioOptions;
    } else if (finalProfile.mediaKind === 'audio') {
      delete finalProfile.videoQuality;
      if (finalProfile.subtitleOptions) {
        finalProfile.subtitleOptions.mode = 'none';
      }
    }

    runtimeDiagnostics.log(
      'profile',
      `Composed profile: media=${finalProfile.mediaKind}, preset=${preset?.id ?? 'none'}, overrides=${overrides ? Object.keys(overrides).join(',') : 'none'}`
    );
    runtimeDiagnostics.log(
      'profile',
      `Final profile: ${JSON.stringify({ mediaKind: finalProfile.mediaKind, outputPath: finalProfile.outputPath, quality: finalProfile.videoQuality ?? finalProfile.audioOptions?.bitrate, subtitle: finalProfile.subtitleOptions.mode, metadata: finalProfile.metadataOptions })}`
    );

    return finalProfile;
  }
}
