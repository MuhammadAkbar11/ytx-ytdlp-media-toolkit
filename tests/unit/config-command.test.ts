/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, test } from 'bun:test';
import { ConfigCommand } from '../../src/cli/commands/config-command';
// import { ConfigService } from '../../src/core/config/config.service';

describe('ConfigCommand', () => {
  test('should get config value', () => {
    const mockConfigService = {
      get: (key: string) => {
        if (key === 'defaultPreset') return 'best-video';
        return undefined;
      },
    } as any;

    const command = new ConfigCommand(mockConfigService);

    // Capture console.log
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    command.execute(['get', 'defaultPreset']);

    console.log = originalLog;

    expect(logs.length).toBe(1);
    expect(logs[0]).toBe('defaultPreset: best-video');
  });

  test('should set config value with type validation', () => {
    const mockConfigService = {
      get: (key: string) => {
        if (key === 'version') return 1;
        return undefined;
      },
      set: (key: string, value: any) => {},
    } as any;

    const command = new ConfigCommand(mockConfigService);

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    command.execute(['set', 'version', '2']);

    console.log = originalLog;

    expect(logs.length).toBe(1);
    expect(logs[0]).toBe('Updated version to 2');
  });

  test('should fail on type mismatch', () => {
    const mockConfigService = {
      get: (key: string) => {
        if (key === 'version') return 1;
        return undefined;
      },
      set: (key: string, value: any) => {},
    } as any;

    const command = new ConfigCommand(mockConfigService);

    const errors: string[] = [];
    const originalError = console.error;
    console.error = (msg: string) => errors.push(msg);

    command.execute(['set', 'version', 'not-a-number']);

    console.error = originalError;

    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('Type mismatch');
  });
});
