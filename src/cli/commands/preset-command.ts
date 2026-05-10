/* eslint-disable @typescript-eslint/no-unused-vars */
import { PresetRegistry } from '../../core/presets/preset-registry';
import { ConfigService } from '../../core/config/config.service';
import { AppConfig } from '../../types/config';

export class PresetCommand {
  constructor(
    private presetRegistry: PresetRegistry,
    private configService: ConfigService
  ) {}

  /**
   * Executes the presets command based on arguments.
   *
   * @param args CLI arguments after 'presets'
   */
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
        console.log('Usage: ytx presets <list|show|use> [id]');
        break;
    }
  }

  private list(): void {
    const presets = this.presetRegistry.getAllPresets();
    console.log('Available Presets:');
    presets.forEach((p) => {
      console.log(`- ${p.id}: ${p.label} - ${p.description}`);
    });
  }

  private show(id: string): void {
    if (!id) {
      console.error('Error: Please specify a preset ID');
      return;
    }
    const preset = this.presetRegistry.getPreset(id);
    if (!preset) {
      console.error(`Error: Preset '${id}' not found`);
      return;
    }
    console.log(`Preset: ${preset.label} (${preset.id})`);
    console.log(`Description: ${preset.description}`);
    console.log('Profile:');
    console.log(JSON.stringify(preset.profile, null, 2));
  }

  private use(id: string): void {
    if (!id) {
      console.error('Error: Please specify a preset ID');
      return;
    }
    const preset = this.presetRegistry.getPreset(id);
    if (!preset) {
      console.error(`Error: Preset '${id}' not found`);
      return;
    }

    try {
      this.configService.set('defaultPreset', id);
      console.log(`Set default preset to '${id}'`);
    } catch (e) {
      console.error(
        `Error updating config: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
