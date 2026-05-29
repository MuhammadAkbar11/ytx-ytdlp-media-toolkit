import { PresetRegistry } from '../../core/presets/preset-registry';
import { ConfigService } from '../../core/config/config-service';
import chalk from 'chalk';

export class PresetCommand {
  constructor(
    private presetRegistry: PresetRegistry,
    private configService: ConfigService
  ) {}

  execute(args: string[]): void {
    const [subcommand, id] = args;

    switch (subcommand) {
      case 'list':
        this.list();
        break;
      case 'show':
        this.show(id);
        break;
      case 'use':
        this.use(id);
        break;
      default:
        console.log(chalk.yellow('Usage: ytx preset <list|show|use> [id]'));
        break;
    }
  }

  public list(): void {
    const presets = this.presetRegistry.getAllPresets();
    console.log(chalk.blue('➤ Available Presets:'));
    presets.forEach((p) => {
      console.log(`  ${chalk.cyan(p.id)}: ${p.label} — ${p.description}`);
    });
  }

  public show(id: string): void {
    if (!id) {
      console.error(chalk.red('✘ Please specify a preset ID.'));
      return;
    }
    const preset = this.presetRegistry.getPreset(id);
    if (!preset) {
      console.error(chalk.red(`✘ Preset "${id}" not found.`));
      console.error(
        chalk.yellow('  Run ytx preset list to see available presets.')
      );
      return;
    }
    console.log(chalk.blue(`➤ Preset: ${preset.label} (${preset.id})`));
    console.log(`  Description: ${preset.description}`);
    console.log('  Profile:');
    console.log(JSON.stringify(preset.profile, null, 2));
  }

  public use(id: string): void {
    if (!id) {
      console.error(chalk.red('✘ Please specify a preset ID.'));
      return;
    }
    const preset = this.presetRegistry.getPreset(id);
    if (!preset) {
      console.error(chalk.red(`✘ Preset "${id}" not found.`));
      console.error(
        chalk.yellow('  Run ytx preset list to see available presets.')
      );
      return;
    }

    try {
      this.configService.set('defaultPreset', id);
      console.log(chalk.green(`✔ Default preset set to "${id}".`));
    } catch (e) {
      console.error(
        chalk.red(
          `✘ Failed to update configuration: ${e instanceof Error ? e.message : String(e)}`
        )
      );
    }
  }
}
