import chalk from 'chalk';

export class RuntimeDiagnostics {
  private enabled = false;

  /**
   * Enables diagnostics mode.
   */
  enable(): void {
    this.enabled = true;
    console.log(
      chalk.magenta('🔍 [diagnostics] Runtime diagnostics mode enabled')
    );
  }

  /**
   * Checks if diagnostics mode is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Logs a diagnostics message if enabled.
   *
   * @param category The category of the diagnostics (e.g., 'raw', 'normalized', 'event').
   * @param message The message or data to log.
   */
  log(category: string, message: string): void {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString().substring(11, 23); // Just time for readability
    console.log(chalk.magenta(` [${category}] [${timestamp}] ${message}`));
  }
}

// Export a singleton instance for easy access
export const runtimeDiagnostics = new RuntimeDiagnostics();
