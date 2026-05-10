import {
  ValidatedUrl,
  NormalizedFormat,
  Preset,
  DownloadProfile,
} from '../../types/domain';
import { AppConfig } from '../../types/config';
import { Result, ok, fail } from '../../utils/result';
import { validateUrl } from '../validation/url-validator';
import { InspectionService } from '../downloader/inspection.service';
import { FormatNormalizer } from '../formats/format-normalizer';
import { ProfileBuilder } from '../profiles/profile-builder';
import {
  ProfileValidator,
  ValidationIssue,
} from '../profiles/profile-validator';
import { PresetRegistry } from '../presets/preset-registry';

export interface DryRunResult {
  url: ValidatedUrl;
  inspectionSummary: {
    title?: string;
    duration?: number;
  };
  formats: NormalizedFormat[];
  selectedPreset?: Preset;
  profile: DownloadProfile;
}

export class DryRunWorkflow {
  constructor(
    private inspectionService: InspectionService,
    private formatNormalizer: FormatNormalizer,
    private profileBuilder: ProfileBuilder,
    private profileValidator: ProfileValidator,
    private presetRegistry: PresetRegistry
  ) {}

  /**
   * Runs the dry-run workflow.
   * Orchestrates URL validation, inspection, normalization, profile composition, and profile validation.
   *
   * @param urlStr The input URL string.
   * @param config The application configuration.
   * @param presetId The selected preset ID (optional).
   * @returns A Result containing the DryRunResult or a list of validation issues.
   */
  async run(
    urlStr: string,
    config: AppConfig,
    presetId?: string
  ): Promise<Result<DryRunResult, ValidationIssue[]>> {
    // 1. URL Validation
    const urlRes = validateUrl(urlStr);
    if (!urlRes.ok) {
      return fail([
        {
          category: 'unsupported-values',
          message: 'Invalid or unsupported URL',
          field: 'url',
        },
      ]);
    }
    const validatedUrl = urlRes.value;

    // 2. Inspection
    const inspectRes = await this.inspectionService.inspect(
      validatedUrl.normalizedUrl
    );
    if (!inspectRes.ok) {
      return fail([
        {
          category: 'workflow-conflicts',
          message: `Inspection failed: ${inspectRes.error.message}`,
        },
      ]);
    }
    const info = inspectRes.value;

    // 3. Format Normalization
    const formats = this.formatNormalizer.normalize(info);

    // 4. Preset Lookup
    const preset = presetId
      ? this.presetRegistry.getPreset(presetId)
      : undefined;

    // 5. Profile Composition
    const profile = this.profileBuilder.build(
      validatedUrl.normalizedUrl,
      config,
      preset
    );

    // 6. Profile Validation
    const valRes = this.profileValidator.validate(profile);
    if (!valRes.ok) {
      return fail(valRes.error);
    }

    // 7. Generate Preview Result
    const result: DryRunResult = {
      url: validatedUrl,
      inspectionSummary: {
        title: info.title,
        duration: info.duration,
      },
      formats,
      selectedPreset: preset,
      profile,
    };

    return ok(result);
  }
}
