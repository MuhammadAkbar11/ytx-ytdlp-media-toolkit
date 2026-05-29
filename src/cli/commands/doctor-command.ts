import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { ConfigService } from '../../core/config/config-service';
import { OutputPathResolver } from '../../core/filesystem/output-path-resolver';
import chalk from 'chalk';
import * as fs from 'fs';

export class DoctorCommand {
  constructor(
    private processRunner: ProcessRunner,
    private configService: ConfigService,
    private outputPathResolver: OutputPathResolver
  ) {}

  async execute(): Promise<void> {
    console.log(chalk.blue('➤ Running environment diagnostics...\n'));

    await this.checkDependency(
      'yt-dlp',
      ['--version'],
      'yt-dlp',
      'pip install yt-dlp'
    );
    await this.checkDependency(
      'ffmpeg',
      ['-version'],
      'ffmpeg',
      'sudo apt install ffmpeg'
    );
    await this.checkDependency(
      'aria2c',
      ['--version'],
      'aria2c',
      'sudo apt install aria2'
    );

    this.checkConfig();
    await this.checkDownloadDirectory();

    console.log('');
  }

  private async checkDependency(
    command: string,
    args: string[],
    label: string,
    installHint: string
  ): Promise<void> {
    try {
      const result = await this.processRunner.run(command, args, {
        bufferStderr: false,
      });
      if (result.exitCode === 0) {
        const version = result.stdout.split('\n')[0].trim();
        console.log(chalk.green(`  [✓] ${label} is available: ${version}`));
      } else {
        console.log(
          chalk.red(`  [✗] ${label} failed (exit code ${result.exitCode})`)
        );
        console.log(chalk.yellow(`      Install: ${installHint}`));
      }
    } catch {
      console.log(chalk.red(`  [✗] ${label} is not installed or not in PATH`));
      console.log(chalk.yellow(`      Install: ${installHint}`));
    }
  }

  private checkConfig(): void {
    try {
      const config = this.configService.getAll();
      console.log(
        chalk.green(
          `  [✓] Config is accessible (${Object.keys(config).length} keys)`
        )
      );
    } catch {
      console.log(chalk.red('  [✗] Config is not accessible'));
      console.log(chalk.yellow('      Reset with: ytx config reset'));
    }
  }

  private async checkDownloadDirectory(): Promise<void> {
    const rawDir = this.configService.get('outputPath') || '.';
    const dir = this.outputPathResolver.normalizePath(rawDir);
    try {
      await fs.promises.access(dir, fs.constants.W_OK);
      console.log(chalk.green(`  [✓] Download directory is writable: ${dir}`));
    } catch {
      try {
        await fs.promises.access(dir, fs.constants.F_OK);
        console.log(
          chalk.red(`  [✗] Download directory is not writable: ${dir}`)
        );
        console.log(
          chalk.yellow(
            '      Check permissions or use: ytx config set outputPath <dir>'
          )
        );
      } catch {
        console.log(
          chalk.red(`  [✗] Download directory does not exist: ${dir}`)
        );
        console.log(
          chalk.yellow(
            '      Create it or use: ytx config set outputPath <dir>'
          )
        );
      }
    }
  }
}
