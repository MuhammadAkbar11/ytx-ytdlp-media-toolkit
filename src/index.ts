import { Command } from 'commander';
import { bootstrap } from './bootstrap';
import { DownloadCommand } from './cli/commands/download-command';
import { DoctorCommand } from './cli/commands/doctor-command';
import { ConfigCommand } from './cli/commands/config-command';
import { PresetCommand } from './cli/commands/preset-command';
import chalk from 'chalk';

async function main() {
  const program = new Command();

  program
    .name('ytx')
    .description('A CLI tool for downloading YouTube videos using yt-dlp')
    .version('0.1.0');

  // Initialize services
  const services = bootstrap();

  const downloadCommand = new DownloadCommand(
    services.inspectionService,
    services.mp4Workflow,
    services.mp3Workflow,
    services.eventStream
  );

  const doctorCommand = new DoctorCommand(
    services.processRunner,
    services.configService
  );

  const configCommand = new ConfigCommand(services.configService);
  const presetCommand = new PresetCommand(services.presetRegistry, services.configService);

  // Default command (interactive download)
  program
    .argument('[url]', 'Optional YouTube URL to download')
    .action(async (url) => {
      await downloadCommand.execute(url);
    });

  // Download explicit command
  program
    .command('download')
    .description('Interactive download workflow')
    .argument('[url]', 'Optional YouTube URL to download')
    .action(async (url) => {
      await downloadCommand.execute(url);
    });

  // Doctor command
  program
    .command('doctor')
    .description('Run environment diagnostics')
    .action(async () => {
      await doctorCommand.execute();
    });

  // Config commands
  const configCmd = program.command('config').description('Manage configuration');
  
  configCmd
    .command('get')
    .description('Get a configuration value')
    .argument('<key>', 'Configuration key')
    .action((key) => {
      configCommand.get(key);
    });

  configCmd
    .command('set')
    .description('Set a configuration value')
    .argument('<key>', 'Configuration key')
    .argument('<value>', 'Configuration value')
    .action((key, value) => {
      configCommand.set(key, value);
    });

  configCmd
    .command('reset')
    .description('Reset configuration to defaults')
    .action(() => {
      configCommand.reset();
    });

  configCmd
    .command('list')
    .description('List all configuration values')
    .action(() => {
      configCommand.list();
    });

  // Preset commands
  const presetCmd = program.command('preset').description('Manage presets');

  presetCmd
    .command('list')
    .description('List all built-in presets')
    .action(() => {
      presetCommand.list();
    });

  presetCmd
    .command('show')
    .description('Show details of a specific preset')
    .argument('<id>', 'Preset ID')
    .action((id) => {
      presetCommand.show(id);
    });

  presetCmd
    .command('use')
    .description('Set a preset as default')
    .argument('<id>', 'Preset ID')
    .action((id) => {
      presetCommand.use(id);
    });

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red(`\n✘ CLI Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});
