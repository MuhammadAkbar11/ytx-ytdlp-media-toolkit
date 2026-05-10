import { DownloadProfile } from '../../types/domain';
import { Result, ok, fail } from '../../utils/result';

export type ValidationCategory =
  | 'missing-fields'
  | 'incompatible-options'
  | 'unsupported-values'
  | 'workflow-conflicts';

export interface ValidationIssue {
  category: ValidationCategory;
  message: string;
  field?: string;
}

export class ProfileValidator {
  /**
   * Validates a DownloadProfile for internal consistency and workflow safety.
   *
   * @param profile The profile to validate.
   * @returns A Result indicating success or a list of validation issues.
   */
  validate(profile: DownloadProfile): Result<void, ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Validate required fields
    if (!profile.url) {
      issues.push({
        category: 'missing-fields',
        message: 'URL is required',
        field: 'url',
      });
    }

    // Validate incompatible options
    if (profile.mediaKind === 'audio') {
      if (profile.videoQuality) {
        issues.push({
          category: 'incompatible-options',
          message: 'Audio profile should not specify video quality',
          field: 'videoQuality',
        });
      }
      if (profile.subtitleOptions && profile.subtitleOptions.mode !== 'none') {
        issues.push({
          category: 'incompatible-options',
          message:
            'Audio-only workflows should not require subtitles embedding',
          field: 'subtitleOptions',
        });
      }
    }

    if (profile.mediaKind === 'video') {
      if (profile.audioOptions) {
        issues.push({
          category: 'incompatible-options',
          message:
            'Video profile should not specify separate audio options (use video quality instead)',
          field: 'audioOptions',
        });
      }
    }

    if (issues.length > 0) {
      return fail(issues);
    }

    return ok(undefined);
  }
}
