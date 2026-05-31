import { ConfigService } from '../../core/config/config-service';
import { AppConfig } from '../../types/config';
import {
  AppConfigSchema,
  SubtitleOptionsSchema,
  MetadataOptionsSchema,
} from '../../core/config/config-schema';
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
      // Validate key exists in schema
      if (!(key in AppConfigSchema.shape)) {
        console.error(chalk.red(`✘ Invalid configuration key: "${key}"`));
        return;
      }

      // Build proposed config and validate with Zod schema
      const currentConfig = this.configService.getAll();
      const nextConfig = { ...currentConfig, [key]: parsedValue };
      const parseResult = AppConfigSchema.safeParse(nextConfig);

      if (!parseResult.success) {
        const keyIssues = parseResult.error.issues.filter(
          (issue) => issue.path.length === 0 || issue.path[0] === key
        );
        const issues =
          keyIssues.length > 0
            ? keyIssues
            : parseResult.error.issues;

        console.error(
          chalk.red(`✘ Invalid value for "${key}".`)
        );
        for (const issue of issues) {
          console.error(chalk.yellow(`  ${issue.message}`));
        }
        this.printAllowedValues(key as keyof AppConfig);
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

  private printAllowedValues(key: keyof AppConfig): void {
    const schemaMap: Record<string, { description?: string; _def?: any }> = {
      preferredBrowser: AppConfigSchema.shape.preferredBrowser,
      preferredBitrate: AppConfigSchema.shape.preferredBitrate,
      preferredVideoQuality: AppConfigSchema.shape.preferredVideoQuality,
      subtitleOptions: SubtitleOptionsSchema,
      metadataOptions: MetadataOptionsSchema,
    };

    const fieldSchema = schemaMap[key as string];
    if (!fieldSchema) return;

    const options = this.extractOptions(fieldSchema);
    if (options.length > 0) {
      console.error(chalk.cyan('  Allowed values:'));
      for (const opt of options) {
        console.error(chalk.cyan(`    - ${opt}`));
      }
    }
  }

  private extractOptions(schema: any): string[] {
    const options: string[] = [];
    const type = schema?.def?.type ?? schema?._def?.type;

    // Handle z.enum (Zod v4: schema.options is array of values)
    if (type === 'enum') {
      return schema.options ? [...schema.options] : [];
    }

    // Handle z.union of z.literal (Zod v4: def.options is array of schemas)
    if (type === 'union') {
      const unionOptions = schema.def?.options ?? [];
      for (const option of unionOptions) {
        const optType = option?.def?.type;
        if (optType === 'literal') {
          // Zod v4: literal has def.values as array
          const vals = option.def?.values ?? [];
          for (const v of vals) {
            options.push(String(v));
          }
        }
      }
    }

    // Handle z.nullable — unwrap inner type
    if (type === 'nullable') {
      const inner = schema.def?.innerType ?? schema._def?.innerType;
      if (inner) {
        const innerOptions = this.extractOptions(inner);
        options.push(...innerOptions, 'null');
      }
    }

    // Handle z.optional — unwrap inner type
    if (type === 'optional') {
      const inner = schema.def?.innerType ?? schema._def?.innerType;
      if (inner) {
        return this.extractOptions(inner);
      }
    }

    return options;
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
