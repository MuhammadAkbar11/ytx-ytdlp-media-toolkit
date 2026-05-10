import Conf from 'conf';
import { AppConfig } from '../../types/config';
import { DEFAULT_CONFIG } from './default-config';

export class ConfigService {
  private store: Conf<AppConfig>;

  constructor() {
    this.store = new Conf<AppConfig>({
      defaults: DEFAULT_CONFIG,
      projectName: 'ytx',
    });
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
