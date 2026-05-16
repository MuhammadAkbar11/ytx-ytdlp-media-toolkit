export interface TTYCapabilities {
  isInteractive: boolean;
  supportsColor: boolean;
  supportsCursorControl: boolean;
  isStdoutTTY: boolean;
  isStderrTTY: boolean;
  isCI: boolean;
}

export class TTYCapabilityResolver {
  resolve(): TTYCapabilities {
    const isStdoutTTY = process.stdout.isTTY ?? false;
    const isStderrTTY = process.stderr.isTTY ?? false;
    const isCI = !!process.env.CI || !!process.env.CONTINUOUS_INTEGRATION || !!process.env.GITHUB_ACTIONS;

    // We consider it interactive if stdout is a TTY and we are NOT in CI
    const isInteractive = isStdoutTTY && !isCI;

    return {
      isInteractive,
      supportsColor: isStdoutTTY || !!process.env.FORCE_COLOR,
      supportsCursorControl: isStdoutTTY && !isCI,
      isStdoutTTY,
      isStderrTTY,
      isCI,
    };
  }
}
