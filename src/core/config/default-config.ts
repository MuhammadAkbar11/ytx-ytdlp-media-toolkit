import { AppConfig } from '../../types/config';

export const DEFAULT_CONFIG: AppConfig = {
  version: 3,
  outputPath: '~/Downloads',
  preferredBrowser: null,
  preferredBitrate: 192,
  filenameTemplate: '%(title)s [%(id)s].%(ext)s',
  subtitleOptions: {
    mode: 'none',
    output: 'embed',
  },
  metadataOptions: {
    embedThumbnail: true,
    embedMetadata: true,
    embedChapters: true,
  },
  defaultPreset: 'balanced',
  preferredVideoQuality: 'best',
};
