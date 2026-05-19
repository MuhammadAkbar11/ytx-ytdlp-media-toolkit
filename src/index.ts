#!/usr/bin/env bun

import { Command } from 'commander';
import { bootstrap } from './bootstrap';
import { DownloadCommand } from './cli/commands/download-command';
import { runtimeDiagnostics } from './core/runtime/diagnostics/runtime-diagnostics';
import { DoctorCommand } from './cli/commands/doctor-command';
import { ConfigCommand } from './cli/commands/config-command';
import { PresetCommand } from './cli/commands/preset-command';
import chalk from 'chalk';
import { gracefulShutdownManager } from './core/runtime/graceful-shutdown';

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

  // Initialize services with error boundary
  let services;
  try {
    services = bootstrap();
  } catch (error) {
    console.error(
      chalk.red(`\n✘ Bootstrap Error: Failed to initialize application.`)
    );
    console.error(
      chalk.red(
        `Details: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    if (process.argv.includes('--debug-runtime') && error instanceof Error) {
      console.error(chalk.red(`Stack: ${error.stack}`));
    }
    process.exit(1);
  }

  const downloadCommand = new DownloadCommand(
    services.inspectionService,
    services.mp4Workflow,
    services.mp3Workflow,
    services.subtitleWorkflow,
    services.filenamePreview,
    services.eventStream,
    services.profileBuilder,
    services.configService,
    services.presetRegistry,
    services.dryRunWorkflow,
    services.directoryValidator,
    services.runtimePreflightResolver,
    services.playlistInspector,
    services.searchablePlaylistSelector
  );

  const doctorCommand = new DoctorCommand(
    services.processRunner,
    services.configService
  );

  const configCommand = new ConfigCommand(services.configService);
  const presetCommand = new PresetCommand(
    services.presetRegistry,
    services.configService
  );

  // Default command (interactive download)
  program
    .argument('[url]', 'Optional YouTube URL to download')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--aria2', 'Use aria2 for multi-threaded downloads')
    .option('--browser [browser]', 'Browser to use for cookies (chrome, firefox, edge, brave, safari)')
    .action(async (url, options) => {
      await downloadCommand.execute(url, options);
    });

  // Download explicit command
  program
    .command('download')
    .description('Download workflow (interactive by default)')
    .argument('[url]', 'Optional YouTube URL to download')
    .option('--dry-run', 'Preview the download without executing')
    .option('--preset <id>', 'Use a specific preset')
    .option('--audio', 'Download audio only (MP3)')
    .option('--video', 'Download video (MP4)')
    .option(
      '--quality <quality>',
      'Preferred video quality (2160, 1440, 1080, 720, 480, best)'
    )
    .option('--sub-lang <lang>', 'Download subtitles (english, all)')
    .option('--sub-mode <mode>', 'Subtitle mode (embed, separate)')
    .option('--output <dir>', 'Output directory')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--aria2', 'Use aria2 for multi-threaded downloads')
    .option('--browser [browser]', 'Browser to use for cookies (chrome, firefox, edge, brave, safari)')
    .action(async (url, options) => {
      await downloadCommand.execute(url, options);
    });

  // Doctor command
  program
    .command('doctor')
    .description('Run environment diagnostics')
    .action(async () => {
      await doctorCommand.execute();
    });

  // Config commands
  const configCmd = program
    .command('config')
    .description('Manage configuration');

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

  const shutdown = () => {
    console.log(chalk.yellow('\n\n⚠️ Interrupted. Cleaning up...'));
    gracefulShutdownManager.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(
      chalk.red(
        `\n✘ CLI Error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    if (process.argv.includes('--debug-runtime') && error instanceof Error) {
      console.error(chalk.red(`Stack: ${error.stack}`));
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(chalk.red('\n✘ Uncaught Fatal Error:'), err);
  process.exit(1);
});
