import { describe, test, expect } from 'bun:test';
import { RuntimePreflightResolver } from '../../src/core/preflight/runtime-preflight-resolver';
import { ProcessRunner } from '../../src/infrastructure/process/process-runner';

const makeRunner = (
  responses: Record<
    string,
    { exitCode: number; stdout: string; stderr: string }
  >
): ProcessRunner => ({
  async run(command) {
    const key = command;
    const resp = responses[key] ?? {
      exitCode: 1,
      stdout: '',
      stderr: 'not found',
    };
    return {
      exitCode: resp.exitCode,
      stdout: resp.stdout,
      stderr: resp.stderr,
    };
  },
});

describe('RuntimePreflightResolver', () => {
  test('should resolve all capabilities as available', async () => {
    const runner = makeRunner({
      'yt-dlp': { exitCode: 0, stdout: '2024.01.01', stderr: '' },
      ffmpeg: { exitCode: 0, stdout: 'ffmpeg version 6.0', stderr: '' },
      aria2c: { exitCode: 0, stdout: 'aria2 version 1.36.0', stderr: '' },
    });

    const resolver = new RuntimePreflightResolver(runner);
    const ctx = await resolver.resolve({});

    expect(ctx.capabilities.ytDlpAvailable).toBe(true);
    expect(ctx.capabilities.ffmpegAvailable).toBe(true);
    expect(ctx.capabilities.aria2Available).toBe(true);
  });

  test('should mark ytDlp unavailable when it exits with non-zero', async () => {
    const runner = makeRunner({
      'yt-dlp': { exitCode: 1, stdout: '', stderr: 'not found' },
      ffmpeg: { exitCode: 0, stdout: 'ffmpeg version 6.0', stderr: '' },
      aria2c: { exitCode: 0, stdout: 'aria2 version 1.36.0', stderr: '' },
    });

    const resolver = new RuntimePreflightResolver(runner);
    const ctx = await resolver.resolve({});

    expect(ctx.capabilities.ytDlpAvailable).toBe(false);
    expect(ctx.capabilities.ffmpegAvailable).toBe(true);
  });

  test('should mark ffmpeg and aria2 unavailable when missing', async () => {
    const runner = makeRunner({
      'yt-dlp': { exitCode: 0, stdout: '2024.01.01', stderr: '' },
      ffmpeg: { exitCode: 1, stdout: '', stderr: 'not found' },
      aria2c: { exitCode: 1, stdout: '', stderr: 'not found' },
    });

    const resolver = new RuntimePreflightResolver(runner);
    const ctx = await resolver.resolve({});

    expect(ctx.capabilities.ytDlpAvailable).toBe(true);
    expect(ctx.capabilities.ffmpegAvailable).toBe(false);
    expect(ctx.capabilities.aria2Available).toBe(false);
  });

  test('should preserve browser cookies from input context', async () => {
    const runner = makeRunner({
      'yt-dlp': { exitCode: 0, stdout: '2024.01.01', stderr: '' },
      ffmpeg: { exitCode: 0, stdout: 'ffmpeg version 6.0', stderr: '' },
      aria2c: { exitCode: 0, stdout: 'aria2 version 1.36.0', stderr: '' },
    });

    const resolver = new RuntimePreflightResolver(runner);
    const ctx = await resolver.resolve({ browserCookies: 'firefox' });

    expect(ctx.browserCookies).toBe('firefox');
    expect(ctx.capabilities.ytDlpAvailable).toBe(true);
  });

  test('should handle process runner throwing an error gracefully', async () => {
    const runner: ProcessRunner = {
      async run(command) {
        if (command === 'yt-dlp') throw new Error('Command not found');
        return { exitCode: 0, stdout: 'ok', stderr: '' };
      },
    };

    const resolver = new RuntimePreflightResolver(runner);
    const ctx = await resolver.resolve({});

    expect(ctx.capabilities.ytDlpAvailable).toBe(false);
    expect(ctx.capabilities.ffmpegAvailable).toBe(true);
  });
});
