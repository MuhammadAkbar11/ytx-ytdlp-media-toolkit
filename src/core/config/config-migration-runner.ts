import { runtimeDiagnostics } from '../runtime/diagnostics/runtime-diagnostics';

export class ConfigMigrationRunner {
  /**
   * Migrates the configuration to the latest version.
   * @param config The raw configuration object from store.
   * @returns The migrated configuration object.
   */
  migrate(config: Record<string, any>): Record<string, any> {
    const initialVersion = config.version || 1;
    let currentVersion = initialVersion;
    const migratedConfig = { ...config };

    runtimeDiagnostics.log('info', `Checking config migration. Current version: ${initialVersion}`);

    // v1 -> v2 migration example (placeholder)
    if (currentVersion === 1) {
      runtimeDiagnostics.log('info', 'Migrating config from v1 to v2');
      // Perform migration steps here if needed
      // Example: if (migratedConfig.oldKey) { migratedConfig.newKey = migratedConfig.oldKey; delete migratedConfig.oldKey; }
      
      currentVersion = 2;
      migratedConfig.version = 2;
    }

    // Add future migrations here:
    // if (currentVersion === 2) { ... }

    if (currentVersion !== initialVersion) {
      runtimeDiagnostics.log('info', `Config migrated successfully to version ${currentVersion}`);
    }

    return migratedConfig;
  }
}
