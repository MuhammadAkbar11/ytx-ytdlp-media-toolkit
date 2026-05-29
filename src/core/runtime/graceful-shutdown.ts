import { processLifecycleManager } from '../../infrastructure/process/process-lifecycle';

export class GracefulShutdownManager {
  private cleanupCallbacks: Array<() => void> = [];

  /**
   * Registers a callback to be executed during shutdown.
   */
  registerCleanup(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Executes all registered cleanups and kills active processes.
   */
  shutdown(): void {
    // 1. Run registered cleanup callbacks (e.g. stopping renderers)
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch {
        // Ignore errors during cleanup to ensure all callbacks run
      }
    }

    // 2. Kill all active subprocesses
    processLifecycleManager.killAll();
  }
}

export const gracefulShutdownManager = new GracefulShutdownManager();
