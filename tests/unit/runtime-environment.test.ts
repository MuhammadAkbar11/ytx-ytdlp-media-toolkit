import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { TTYCapabilityResolver } from '../../src/core/terminal/tty-capability-resolver';
import { RuntimeEnvironment } from '../../src/core/runtime/runtime-environment';

describe('TTYCapabilityResolver', () => {
  const originalEnv = process.env;
  const originalStdoutTTY = process.stdout.isTTY;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    // @ts-ignore
    process.stdout.isTTY = originalStdoutTTY;
  });

  test('should detect interactive mode when TTY is available and NOT in CI', () => {
    // @ts-ignore
    process.stdout.isTTY = true;
    delete process.env.CI;

    const resolver = new TTYCapabilityResolver();
    const caps = resolver.resolve();

    expect(caps.isInteractive).toBe(true);
    expect(caps.isStdoutTTY).toBe(true);
    expect(caps.isCI).toBe(false);
  });

  test('should detect non-interactive mode when CI is true even if TTY is available', () => {
    // @ts-ignore
    process.stdout.isTTY = true;
    process.env.CI = 'true';

    const resolver = new TTYCapabilityResolver();
    const caps = resolver.resolve();

    expect(caps.isInteractive).toBe(false);
    expect(caps.isCI).toBe(true);
  });

  test('should detect non-interactive mode when TTY is NOT available', () => {
    // @ts-ignore
    process.stdout.isTTY = false;
    delete process.env.CI;

    const resolver = new TTYCapabilityResolver();
    const caps = resolver.resolve();

    expect(caps.isInteractive).toBe(false);
    expect(caps.isStdoutTTY).toBe(false);
  });
});

describe('RuntimeEnvironment', () => {
  test('should provide access to capabilities', () => {
    const mockResolver = {
      resolve: mock(() => ({
        isInteractive: true,
        supportsColor: true,
        supportsCursorControl: true,
        isStdoutTTY: true,
        isStderrTTY: true,
        isCI: false,
      })),
    };

    const env = new RuntimeEnvironment(mockResolver as any);

    expect(env.isInteractive).toBe(true);
    expect(env.supportsColor).toBe(true);
    expect(env.isCI).toBe(false);
    expect(mockResolver.resolve).toHaveBeenCalled();
  });
});
