import { input, select } from '@inquirer/prompts';
import { InspectionService } from '../../core/downloader/inspection.service';
import { Mp4DownloadWorkflow } from '../../core/workflows/mp4-download-workflow';
import { Mp3DownloadWorkflow } from '../../core/workflows/mp3-download-workflow';
import { EventStream } from '../../core/runtime/event-stream';
import { TerminalRenderer } from '../renderers/terminal-renderer';
import { validateUrl } from '../../core/validation/url-validator';
import { ProfileBuilder } from '../../core/profiles/profile-builder';
import { ConfigService } from '../../core/config/config.service';
import { PresetRegistry } from '../../core/presets/preset-registry';
import chalk from 'chalk';
import ora from 'ora';
import {
  AudioBitrate,
  DownloadProfile,
  MediaKind,
  VideoQuality,
} from '../../types';

export class DownloadCommand {
  constructor(
    private inspectionService: InspectionService,
    private mp4Workflow: Mp4DownloadWorkflow,
    private mp3Workflow: Mp3DownloadWorkflow,
    private eventStream: EventStream,
    private profileBuilder: ProfileBuilder,
    private configService: ConfigService,
    private presetRegistry: PresetRegistry
  ) {}

  async execute(initialUrl?: string): Promise<void> {
    const renderer = new TerminalRenderer(this.eventStream);
    renderer.start();

    try {
      // 1. Prompt for URL if not provided
      let url = initialUrl;
      if (!url) {
        url = await input({
          message: 'Enter YouTube URL:',
          validate: (val) => validateUrl(val).ok || 'Invalid URL',
        });
      } else {
        const valRes = validateUrl(url);
        if (!valRes.ok) {
          console.log(chalk.red('✘ Invalid URL provided.'));
          return;
        }
      }

      // 2. Inspect the URL
      const spinner = ora('Inspecting URL...').start();
      const inspectRes = await this.inspectionService.inspect(url);
      spinner.stop();

      if (!inspectRes.ok) {
        console.log(
          chalk.red(`✘ Inspection failed: ${inspectRes.error.message}`)
        );
        return;
      }

      console.log(chalk.green(`✔ Found: ${inspectRes.value.title}`));

      // 3. Prompt for Preset or Custom
      const presets = this.presetRegistry.getAllPresets();
      const presetChoices = presets.map((p) => ({
        name: `${p.label} - ${p.description}`,
        value: p.id,
      }));
      
      presetChoices.unshift({ name: 'Custom (Configure manually)', value: 'custom' });

      const selectedPresetId = await select<string>({
        message: 'Select a download preset:',
        choices: presetChoices,
      });

      let profile: DownloadProfile;
      const appConfig = this.configService.getAll();

      if (selectedPresetId !== 'custom') {
        const preset = this.presetRegistry.getPreset(selectedPresetId);
        profile = this.profileBuilder.build(url, appConfig, preset);
        console.log(chalk.green(`✔ Using preset: ${preset?.label}`));
      } else {
        // Custom flow
        const mediaKind = await select<MediaKind>({
          message: 'Select format:',
          choices: [
            { name: 'Video (MP4)', value: 'video' },
            { name: 'Audio (MP3)', value: 'audio' },
          ],
        });

        const useCookies = await select<'yes' | 'no'>({
          message: 'Use cookies from browser (for restricted videos)?',
          choices: [
            { name: 'No', value: 'no' },
            { name: 'Yes', value: 'yes' },
          ],
        });

        let browserCookies: 'chrome' | 'firefox' | 'edge' | 'brave' | 'safari' | null = null;
        if (useCookies === 'yes') {
          browserCookies = await select<'chrome' | 'firefox' | 'edge' | 'brave' | 'safari'>({
            message: 'Select browser:',
            choices: [
              { name: 'Brave', value: 'brave' },
              { name: 'Chrome', value: 'chrome' },
              { name: 'Firefox', value: 'firefox' },
              { name: 'Edge', value: 'edge' },
            ],
          });
        }

        const overrides: Partial<DownloadProfile> = {
          mediaKind,
          browserCookies,
        };

        if (mediaKind === 'video') {
          const quality = await select<VideoQuality>({
            message: 'Select quality:',
            choices: [
              { name: 'Best Available', value: 'best' },
              { name: '1080p', value: 1080 },
              { name: '720p', value: 720 },
              { name: '480p', value: 480 },
            ],
          });
          overrides.videoQuality = quality;
        } else {
          const bitrate = await select<AudioBitrate>({
            message: 'Select audio bitrate:',
            choices: [
              { name: '320kbps (Best)', value: 320 },
              { name: '192kbps (Good)', value: 192 },
              { name: '128kbps (Standard)', value: 128 },
            ],
          });
          overrides.audioOptions = { format: 'mp3', bitrate };
        }

        profile = this.profileBuilder.build(url, appConfig, undefined, overrides);
      }

      // 5. Execute workflow
      if (profile.mediaKind === 'video') {
        const res = await this.mp4Workflow.run(profile);
        if (res.ok) {
          console.log(chalk.green(`\n📂 File saved to directory: ${profile.outputDirectory}`));
        }
      } else {
        const res = await this.mp3Workflow.run(profile);
        if (res.ok) {
          console.log(chalk.green(`\n📂 File saved to directory: ${profile.outputDirectory}`));
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'ExitPromptError') {
        console.log(chalk.yellow('\n⚠ Operation aborted by user.'));
      } else {
        console.log(
          chalk.red(
            `\n✘ Unexpected error: ${e instanceof Error ? e.message : String(e)}`
          )
        );
      }
    } finally {
      renderer.stop();
    }
  }
}
