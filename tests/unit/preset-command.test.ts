/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, test } from 'bun:test';
import { PresetCommand } from '../../src/cli/commands/preset-command';
import { PresetRegistry } from '../../src/core/presets/preset-registry';
import { ConfigService } from '../../src/core/config/config.service';

describe('PresetCommand', () => {
  test('should list presets', () => {
    const mockPresetRegistry = {
      getAllPresets: () => [
        { id: 'balanced', label: 'Balanced', description: 'A good balance' },
      ],
    } as any;

    const mockConfigService = {} as any;

    const command = new PresetCommand(mockPresetRegistry, mockConfigService);

    // Capture console.log
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    command.execute(['list']);

    console.log = originalLog;

    expect(logs.length).toBe(2);
    expect(logs[0]).toBe('Available Presets:');
    expect(logs[1]).toBe('- balanced: Balanced - A good balance');
  });

  test('should show preset details', () => {
    const mockPresetRegistry = {
      getPreset: (id: string) => {
        if (id === 'balanced') {
          return {
            id: 'balanced',
            label: 'Balanced',
            description: 'A good balance',
            profile: { mediaKind: 'video' },
          };
        }
        return undefined;
      },
    } as any;

    const mockConfigService = {} as any;

    const command = new PresetCommand(mockPresetRegistry, mockConfigService);

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    command.execute(['show', 'balanced']);

    console.log = originalLog;

    expect(logs.length).toBe(4);
    expect(logs[0]).toBe('Preset: Balanced (balanced)');
    expect(logs[1]).toBe('Description: A good balance');
    expect(logs[2]).toBe('Profile:');
    expect(logs[3]).toContain('mediaKind');
  });

  test('should use preset', () => {
    const mockPresetRegistry = {
      getPreset: (id: string) => {
        if (id === 'balanced') return { id: 'balanced' };
        return undefined;
      },
    } as any;

    let setKey = '';
    let setVal = '';
    const mockConfigService = {
      set: (key: string, value: any) => {
        setKey = key;
        setVal = value;
      },
    } as any;

    const command = new PresetCommand(mockPresetRegistry, mockConfigService);

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    command.execute(['use', 'balanced']);

    console.log = originalLog;

    expect(setKey).toBe('defaultPreset');
    expect(setVal).toBe('balanced');
    expect(logs.length).toBe(1);
    expect(logs[0]).toBe("Set default preset to 'balanced'");
  });
});
