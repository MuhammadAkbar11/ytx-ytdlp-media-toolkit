import { describe, expect, test } from 'bun:test';
import { RuntimeEnvironment } from '../../src/core/runtime/runtime-environment';
import { TTYCapabilities } from '../../src/core/terminal/tty-capability-resolver';

describe('RuntimeEnvironment', () => {
  test('should detect non-interactive mode when CI is true', () => {
    const mockResolver = {
      resolve: (): TTYCapabilities => ({
        isInteractive: false,
        isCI: true,
        supportsColor: false,
        supportsCursorControl: false,
        isStdoutTTY: false,
        isStderrTTY: false,
      }),
    };
    const env = new RuntimeEnvironment(mockResolver);
    expect(env.isInteractive).toBe(false);
    expect(env.isCI).toBe(true);
  });

  test('should detect interactive mode', () => {
    const mockResolver = {
      resolve: (): TTYCapabilities => ({
        isInteractive: true,
        isCI: false,
        supportsColor: true,
        supportsCursorControl: true,
        isStdoutTTY: true,
        isStderrTTY: true,
      }),
    };
    const env = new RuntimeEnvironment(mockResolver);
    expect(env.isInteractive).toBe(true);
    expect(env.supportsColor).toBe(true);
  });
});
