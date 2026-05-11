/* eslint-disable @typescript-eslint/no-explicit-any */
export class ProcessLifecycleManager {
  private activeProcesses = new Set<any>();

  /**
   * Registers a process to be managed.
   * @param process The Bun Subprocess
   */
  register(process: any): void {
    this.activeProcesses.add(process);
  }

  /**
   * Unregisters a process.
   * @param process The Bun Subprocess
   */
  unregister(process: any): void {
    this.activeProcesses.delete(process);
  }

  /**
   * Kills all active processes.
   */
  killAll(): void {
    for (const process of this.activeProcesses) {
      try {
        process.kill();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // Ignore errors if process already exited
      }
    }
    this.activeProcesses.clear();
  }
}

export const processLifecycleManager = new ProcessLifecycleManager();
