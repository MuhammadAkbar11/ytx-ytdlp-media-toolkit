import { ConfigService } from '../../core/config/config-service';
import { AppConfig } from '../../types/config';
import chalk from 'chalk';

export class ConfigCommand {
  constructor(private configService: ConfigService) {}

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
        console.log(
          chalk.yellow('Usage: ytx config <get|set|reset|list> [key] [value]')
        );
        break;
    }
  }

  public get(key: string): void {
    if (!key) {
      console.error(chalk.red('✘ Please specify a configuration key.'));
      return;
    }
    try {
      const val = this.configService.get(key as keyof AppConfig);
      if (val === undefined) {
        console.log(chalk.yellow(`"${key}" is not set.`));
      } else {
        console.log(
          `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`
        );
      }
    } catch (e) {
      console.error(
        chalk.red(
          `✘ Failed to read configuration: ${e instanceof Error ? e.message : String(e)}`
        )
      );
      console.error(chalk.yellow('  Try: ytx config reset'));
    }
  }

  public set(key: string, value: string): void {
    if (!key || value === undefined) {
      console.error(chalk.red('✘ Please specify both key and value.'));
      console.error(chalk.yellow('  Usage: ytx config set <key> <value>'));
      return;
    }

    let parsedValue: any;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }

    try {
      const currentVal = this.configService.get(key as keyof AppConfig);

      if (
        currentVal !== undefined &&
        typeof parsedValue !== typeof currentVal
      ) {
        console.error(
          chalk.red(
            `✘ Type mismatch for "${key}". Expected ${typeof currentVal}, got ${typeof parsedValue}.`
          )
        );
        return;
      }

      this.configService.set(key as keyof AppConfig, parsedValue);
      console.log(
        chalk.green(
          `✔ Updated ${key} to ${typeof parsedValue === 'object' ? JSON.stringify(parsedValue) : parsedValue}`
        )
      );
    } catch (e) {
      console.error(
        chalk.red(
          `✘ Failed to update configuration: ${e instanceof Error ? e.message : String(e)}`
        )
      );
    }
  }

  public reset(): void {
    try {
      this.configService.reset();
      console.log(chalk.green('✔ Configuration reset to defaults.'));
    } catch (e) {
      console.error(
        chalk.red(
          `✘ Failed to reset configuration: ${e instanceof Error ? e.message : String(e)}`
        )
      );
    }
  }

  public list(): void {
    try {
      const config = this.configService.getAll();
      console.log(chalk.blue('➤ Current Configuration:'));
      console.log(JSON.stringify(config, null, 2));
    } catch (e) {
      console.error(
        chalk.red(
          `✘ Failed to read configuration: ${e instanceof Error ? e.message : String(e)}`
        )
      );
    }
  }
}
