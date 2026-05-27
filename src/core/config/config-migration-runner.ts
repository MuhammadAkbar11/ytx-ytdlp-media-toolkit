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

    runtimeDiagnostics.log(
      'info',
      `Checking config migration. Current version: ${initialVersion}`
    );

    // v1 -> v2 migration (placeholder from previous version)
    if (currentVersion === 1) {
      runtimeDiagnostics.log('info', 'Migrating config from v1 to v2');
      currentVersion = 2;
      migratedConfig.version = 2;
    }

    // v2 -> v3 migration: rename outputDirectory → outputPath
    if (currentVersion === 2) {
      runtimeDiagnostics.log('info', 'Migrating config from v2 to v3');
      if (
        'outputDirectory' in migratedConfig &&
        !('outputPath' in migratedConfig)
      ) {
        migratedConfig.outputPath = migratedConfig.outputDirectory;
      }
      delete migratedConfig.outputDirectory;
      currentVersion = 3;
      migratedConfig.version = 3;
    }

    // Add future migrations here:
    // if (currentVersion === 3) { ... }

    if (currentVersion !== initialVersion) {
      runtimeDiagnostics.log(
        'info',
        `Config migrated successfully to version ${currentVersion}`
      );
    }

    return migratedConfig;
  }
}
