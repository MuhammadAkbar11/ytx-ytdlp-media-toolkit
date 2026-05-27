import { describe, expect, test } from 'bun:test';
import { RuntimePreflightResolver } from '../../src/core/preflight/runtime-preflight-resolver';

describe('RuntimePreflightResolver', () => {
  test('should resolve all capabilities as available', async () => {
    const mockRunner = {
      run: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
    };
    const resolver = new RuntimePreflightResolver(mockRunner as any);
    const res = await resolver.resolve({ browserCookies: null } as any);
    expect(res.capabilities.ytDlpAvailable).toBe(true);
    expect(res.capabilities.ffmpegAvailable).toBe(true);
  });

  test('should handle missing tools and process errors', async () => {
    const mockRunner = {
      run: async () => ({ exitCode: 1, stdout: '', stderr: '' }),
    };
    const resolver = new RuntimePreflightResolver(mockRunner as any);
    const res = await resolver.resolve({ browserCookies: null } as any);
    expect(res.capabilities.ytDlpAvailable).toBe(false);
    expect(res.capabilities.ffmpegAvailable).toBe(false);
  });
});
