import * as path from 'path';
import * as os from 'os';

/**
 * Resolves XDG-compliant config paths for ytx-downloader.
 *
 * Resolution order:
 *   1. $XDG_CONFIG_HOME/ytx-downloader/config.json
 *   2. ~/.config/ytx-downloader/config.json
 */
export class XDGConfigResolver {
  private readonly configDir: string;

  constructor() {
    const xdgConfigHome =
      process.env['XDG_CONFIG_HOME'] || path.join(os.homedir(), '.config');
    this.configDir = path.join(xdgConfigHome, 'ytx-downloader');
  }

  getConfigDir(): string {
    return this.configDir;
  }

  getConfigPath(): string {
    return path.join(this.configDir, 'config.json');
  }
}
