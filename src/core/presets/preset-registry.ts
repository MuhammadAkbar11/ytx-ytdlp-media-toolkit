import { Preset } from '../../types/domain';

export const BUILT_IN_PRESETS: Record<string, Preset> = {
  'best-quality': {
    id: 'best-quality',
    label: 'Best Quality',
    description: 'Downloads the best available video and audio quality.',
    profile: {
      mediaKind: 'video',
      videoQuality: 1080,
    },
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    description: 'A good balance between quality and file size.',
    profile: {
      mediaKind: 'video',
      videoQuality: 720,
    },
  },
  mobile: {
    id: 'mobile',
    label: 'Mobile',
    description: 'Optimized for mobile devices (smaller file size).',
    profile: {
      mediaKind: 'video',
      videoQuality: 480,
    },
  },
  podcast: {
    id: 'podcast',
    label: 'Podcast',
    description: 'Audio only (MP3).',
    profile: {
      mediaKind: 'audio',
      audioOptions: {
        format: 'mp3',
        bitrate: 192,
      },
    },
  },
  archive: {
    id: 'archive',
    label: 'Archive',
    description: 'Downloads everything including subtitles (if available).',
    profile: {
      mediaKind: 'video',
      subtitleOptions: {
        mode: 'english',
        output: 'embed',
      },
      useDownloadArchive: true,
    },
  },
};

export class PresetRegistry {
  /**
   * Looks up a preset by ID.
   *
   * @param id The preset ID.
   * @returns The Preset or undefined if not found.
   */
  getPreset(id: string): Preset | undefined {
    return BUILT_IN_PRESETS[id];
  }

  /**
   * Returns all available presets.
   *
   * @returns An array of Preset.
   */
  getAllPresets(): Preset[] {
    return Object.values(BUILT_IN_PRESETS);
  }
}
