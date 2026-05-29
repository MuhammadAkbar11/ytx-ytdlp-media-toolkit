import { runtimeDiagnostics } from '../../core/runtime/diagnostics/runtime-diagnostics';

interface KillableProcess {
  kill(): void;
}

export class ProcessLifecycleManager {
  private activeProcesses = new Set<KillableProcess>();

  /**
   * Registers a process to be managed.
   * @param process The Bun Subprocess
   */
  register(process: KillableProcess): void {
    this.activeProcesses.add(process);
  }

  /**
   * Unregisters a process.
   * @param process The Bun Subprocess
   */
  unregister(process: KillableProcess): void {
    this.activeProcesses.delete(process);
  }

  /**
   * Returns the count of currently active processes.
   */
  get activeCount(): number {
    return this.activeProcesses.size;
  }

  /**
   * Kills all active processes.
   * Each kill is individually try-caught to ensure all processes are attempted.
   */
  killAll(): void {
    const count = this.activeProcesses.size;
    if (count > 0) {
      runtimeDiagnostics.log('info', `Killing ${count} active process(es)...`);
    }
    for (const process of this.activeProcesses) {
      try {
        process.kill();
      } catch {
        // Ignore errors if process already exited
      }
    }
    this.activeProcesses.clear();
  }
}

export const processLifecycleManager = new ProcessLifecycleManager();
