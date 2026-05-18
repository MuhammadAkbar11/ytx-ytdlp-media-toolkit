import Conf from 'conf';
import { AppConfig } from '../../types/config';
import { DEFAULT_CONFIG } from './default-config';
import { ConfigMigrationRunner } from './config-migration-runner';
import { AppConfigSchema } from './config-schema';
import chalk from 'chalk';

export class ConfigService {
  private store: Conf<AppConfig>;

  constructor() {
    this.store = new Conf<AppConfig>({
      defaults: DEFAULT_CONFIG,
      projectName: 'ytx',
    });

    const migrationRunner = new ConfigMigrationRunner();
    const currentConfig = this.store.store;
    const migratedConfig = migrationRunner.migrate(currentConfig as any);

    const parseResult = AppConfigSchema.safeParse(migratedConfig);
    if (!parseResult.success) {
      console.error(
        chalk.red(`\n❌️ Config validation failed. Falling back to defaults.`)
      );
      const formattedErrors = parseResult.error.issues
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');
      console.error(chalk.yellow(formattedErrors));
      this.store.store = DEFAULT_CONFIG;
    } else {
      this.store.store = parseResult.data as AppConfig;
    }
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.store.get(key);
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    // 1. Ensure the key is valid (part of AppConfigSchema shape)
    if (!(key in AppConfigSchema.shape)) {
      throw new Error(`Invalid configuration key: '${String(key)}'`);
    }

    // 2. Build proposed new state
    const nextConfig = { ...this.store.store, [key]: value };

    // 3. Validate next state with AppConfigSchema
    const parseResult = AppConfigSchema.safeParse(nextConfig);
    if (!parseResult.success) {
      const formattedErrors = parseResult.error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new Error(`Validation failed: ${formattedErrors}`);
    }

    // 4. Update store with validated data
    this.store.set(key, parseResult.data[key] as any);
  }

  reset(): void {
    this.store.clear();
  }

  getAll(): AppConfig {
    return this.store.store;
  }
}
