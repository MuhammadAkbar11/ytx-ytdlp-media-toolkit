import { ConfigService } from '../../core/config/config.service';
import { AppConfig } from '../../types/config';

export class ConfigCommand {
  constructor(private configService: ConfigService) {}

  /**
   * Executes the config command based on arguments.
   *
   * @param args CLI arguments after 'config'
   */
  execute(args: string[]): void {
    const [subcommand, key, value] = args;

    switch (subcommand) {
      case 'get':
        this.get(key);
        break;
      case 'set':
        this.set(key, value);
        break;
      case 'reset':
        this.reset();
        break;
      case 'list':
        this.list();
        break;
      default:
        console.log('Usage: ytx config <get|set|reset|list> [key] [value]');
        break;
    }
  }

  public get(key: string): void {
    if (!key) {
      console.error('Error: Please specify a key');
      return;
    }
    try {
      const val = this.configService.get(key as keyof AppConfig);
      if (val === undefined) {
        console.log(`${key} is not set`);
      } else {
        console.log(
          `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`
        );
      }
    } catch (e) {
      console.error(
        `Error reading config: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  public set(key: string, value: string): void {
    if (!key || value === undefined) {
      console.error('Error: Please specify both key and value');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedValue: any;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      // If not valid JSON, treat as string
      parsedValue = value;
    }

    try {
      const currentVal = this.configService.get(key as keyof AppConfig);

      // Type validation
      if (
        currentVal !== undefined &&
        typeof parsedValue !== typeof currentVal
      ) {
        console.error(
          `Error: Type mismatch for ${key}. Expected ${typeof currentVal}, got ${typeof parsedValue}`
        );
        return;
      }

      this.configService.set(key as keyof AppConfig, parsedValue);
      console.log(
        `Updated ${key} to ${typeof parsedValue === 'object' ? JSON.stringify(parsedValue) : parsedValue}`
      );
    } catch (e) {
      console.error(
        `Error updating config: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  public reset(): void {
    try {
      this.configService.reset();
      console.log('Configuration reset to defaults');
    } catch (e) {
      console.error(
        `Error resetting config: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  public list(): void {
    try {
      const config = this.configService.getAll();
      console.log('Current Configuration:');
      console.log(JSON.stringify(config, null, 2));
    } catch (e) {
      console.error(
        `Error listing config: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
