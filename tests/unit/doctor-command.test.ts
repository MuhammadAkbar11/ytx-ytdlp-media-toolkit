/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, test } from 'bun:test';
import { DoctorCommand } from '../../src/cli/commands/doctor-command';
import { ProcessRunner } from '../../src/infrastructure/process/process-runner';
import { ConfigService } from '../../src/core/config/config.service';
import * as fs from 'fs';

describe('DoctorCommand', () => {
  test('should detect available dependencies', async () => {
    const mockProcessRunner = {
      run: async (command: string) => {
        return { exitCode: 0, stdout: `${command} version 1.0`, stderr: '' };
      },
    } as ProcessRunner;

    const mockConfigService = {
      getAll: () => ({}),
      get: () => '.',
    } as any;

    const command = new DoctorCommand(mockProcessRunner, mockConfigService);

    // Capture console.log
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    // Mock fs.promises.access to succeed
    const originalAccess = fs.promises.access;
    fs.promises.access = async () => {};

    await command.execute();

    console.log = originalLog;
    fs.promises.access = originalAccess;

    expect(logs.length).toBe(6); // Running..., 3 deps, config, dir
    expect(logs[1]).toContain('yt-dlp is available');
    expect(logs[2]).toContain('ffmpeg is available');
    expect(logs[3]).toContain('aria2 is available');
    expect(logs[4]).toContain('Config is accessible');
    expect(logs[5]).toContain('Download directory is writable');
  });

  test('should report missing dependencies', async () => {
    const mockProcessRunner = {
      run: async () => {
        throw new Error('command not found');
      },
    } as ProcessRunner;

    const mockConfigService = {
      getAll: () => ({}),
      get: () => '.',
    } as any;

    const command = new DoctorCommand(mockProcessRunner, mockConfigService);

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    const originalAccess = fs.promises.access;
    fs.promises.access = async () => {};

    await command.execute();

    console.log = originalLog;
    fs.promises.access = originalAccess;

    expect(logs.length).toBe(6);
    expect(logs[1]).toContain('yt-dlp is NOT available');
    expect(logs[2]).toContain('ffmpeg is NOT available');
    expect(logs[3]).toContain('aria2 is NOT available');
  });
});
