/* eslint-disable @typescript-eslint/no-unused-vars */
import { ProcessRunner } from '../../infrastructure/process/process-runner';
import { ConfigService } from '../../core/config/config.service';
import * as fs from 'fs';

export class DoctorCommand {
  constructor(
    private processRunner: ProcessRunner,
    private configService: ConfigService
  ) {}

  /**
   * Executes the doctor command.
   */
  async execute(): Promise<void> {
    console.log('Running diagnostics...\n');

    // 1. Check yt-dlp
    await this.checkDependency('yt-dlp', ['--version'], 'yt-dlp');

    // 2. Check ffmpeg
    await this.checkDependency('ffmpeg', ['-version'], 'ffmpeg');

    // 3. Check aria2c
    await this.checkDependency('aria2c', ['--version'], 'aria2');

    // 4. Check Config
    this.checkConfig();

    // 5. Check Download Directory
    await this.checkDownloadDirectory();
  }

  private async checkDependency(
    command: string,
    args: string[],
    label: string
  ): Promise<void> {
    try {
      const result = await this.processRunner.run(command, args, {
        bufferStderr: false,
      });
      if (result.exitCode === 0) {
        const version = result.stdout.split('\n')[0].trim();
        console.log(`[✓] ${label} is available: ${version}`);
      } else {
        console.log(`[✗] ${label} failed with exit code ${result.exitCode}`);
      }
    } catch (e) {
      console.log(`[✗] ${label} is NOT available or failed to run`);
    }
  }

  private checkConfig(): void {
    try {
      const config = this.configService.getAll();
      console.log(
        `[✓] Config is accessible (${Object.keys(config).length} keys found)`
      );
    } catch (e) {
      console.log('[✗] Config is NOT accessible');
    }
  }

  private async checkDownloadDirectory(): Promise<void> {
    const dir = this.configService.get('outputDirectory') || '.';
    try {
      await fs.promises.access(dir, fs.constants.W_OK);
      console.log(`[✓] Download directory is writable: ${dir}`);
    } catch (e) {
      // Check if it exists at all
      try {
        await fs.promises.access(dir, fs.constants.F_OK);
        console.log(`[✗] Download directory is NOT writable: ${dir}`);
      } catch {
        console.log(`[✗] Download directory does NOT exist: ${dir}`);
      }
    }
  }
}
