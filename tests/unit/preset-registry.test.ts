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
});
