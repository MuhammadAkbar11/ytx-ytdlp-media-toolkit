import {
  TTYCapabilities,
  TTYCapabilityResolver,
} from '../terminal/tty-capability-resolver';

export class RuntimeEnvironment {
  private readonly capabilities: TTYCapabilities;

  constructor(resolver: TTYCapabilityResolver = new TTYCapabilityResolver()) {
    this.capabilities = resolver.resolve();
  }

  get isInteractive(): boolean {
    return this.capabilities.isInteractive;
  }

  get isCI(): boolean {
    return this.capabilities.isCI;
  }

  get supportsColor(): boolean {
    return this.capabilities.supportsColor;
  }

  get supportsCursorControl(): boolean {
    return this.capabilities.supportsCursorControl;
  }

  get isStdoutTTY(): boolean {
    return this.capabilities.isStdoutTTY;
  }

  get isStderrTTY(): boolean {
    return this.capabilities.isStderrTTY;
  }
}

// Export a singleton instance for easy access
export const runtimeEnvironment = new RuntimeEnvironment();
