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
      console.error(chalk.yellow(parseResult.error.message));
      this.store.store = DEFAULT_CONFIG;
    } else {
      this.store.store = parseResult.data as AppConfig;
    }
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.store.get(key);
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.store.set(key, value);
  }

  reset(): void {
    this.store.clear();
  }

  getAll(): AppConfig {
    return this.store.store;
  }
}
