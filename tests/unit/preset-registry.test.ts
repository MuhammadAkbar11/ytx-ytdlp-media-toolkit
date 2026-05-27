import { describe, expect, test } from 'bun:test';
import {
  PresetRegistry,
  BUILT_IN_PRESETS,
} from '../../src/core/presets/preset-registry';

describe('PresetRegistry', () => {
  test('should lookup presets by ID', () => {
    const registry = new PresetRegistry();
    const preset = registry.getPreset('balanced');
    expect(preset).toBeTruthy();
    expect(preset?.id).toBe('balanced');
  });

  test('should return all presets', () => {
    const registry = new PresetRegistry();
    const presets = registry.getAllPresets();
    expect(presets.length).toBe(Object.keys(BUILT_IN_PRESETS).length);
  });

  test('should support immutable composition', () => {
    const registry = new PresetRegistry();
    const preset = registry.getPreset('balanced');

    const baseProfile = {
      url: 'https://youtube.com/watch?v=123',
      mediaKind: 'video' as const,
      outputPath: '.',
      filenameTemplate: '%(title)s.%(ext)s',
      subtitleOptions: { embedSubtitles: false, languages: [] },
      metadataOptions: { embedMetadata: false, embedThumbnail: false },
      playlist: { downloadAll: false },
    };

    const finalProfile = {
      ...baseProfile,
      ...preset?.profile,
    };

    expect(finalProfile.videoQuality).toBe(720);
    expect(finalProfile.url).toBe('https://youtube.com/watch?v=123'); // Preserved
  });
});
