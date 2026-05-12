import { Command } from 'commander';
import { bootstrap } from './bootstrap';
import { DownloadCommand } from './cli/commands/download-command';
import { runtimeDiagnostics } from './core/runtime/diagnostics/runtime-diagnostics';
import { DoctorCommand } from './cli/commands/doctor-command';
import { ConfigCommand } from './cli/commands/config-command';
import { PresetCommand } from './cli/commands/preset-command';
import { processLifecycleManager } from './infrastructure/process/process-lifecycle';
import chalk from 'chalk';

async function main() {
  if (process.argv.includes('--debug-runtime')) {
    runtimeDiagnostics.enable();
  }

  const program = new Command();

  program
    .name('ytx')
    .description('A CLI tool for downloading YouTube videos using yt-dlp')
    .version('0.1.0')
    .option('--debug-runtime', 'Enable deep runtime diagnostics');

  // Initialize services
  const services = bootstrap();

  const downloadCommand = new DownloadCommand(
    services.inspectionService,
    services.mp4Workflow,
    services.mp3Workflow,
    services.eventStream,
    services.profileBuilder,
    services.configService,
    services.presetRegistry,
    services.dryRunWorkflow
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
    .option('--dry-run', 'Preview the download without executing')
    .action(async (url, options) => {
      await downloadCommand.execute(url, options.dryRun);
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

  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n⚠ Interrupted by user. Cleaning up...'));
    processLifecycleManager.killAll();
    process.exit(0);
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
