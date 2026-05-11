import { input, select } from '@inquirer/prompts';
import { InspectionService } from '../../core/downloader/inspection.service';
import { Mp4DownloadWorkflow } from '../../core/workflows/mp4-download-workflow';
import { Mp3DownloadWorkflow } from '../../core/workflows/mp3-download-workflow';
import { EventStream } from '../../core/runtime/event-stream';
import { TerminalRenderer } from '../renderers/terminal-renderer';
import { validateUrl } from '../../core/validation/url-validator';
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
    private eventStream: EventStream
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

      // 3. Prompt for format
      const mediaKind = await select<MediaKind>({
        message: 'Select format:',
        choices: [
          { name: 'Video (MP4)', value: 'video' },
          { name: 'Audio (MP3)', value: 'audio' },
        ],
      });

      // 4. Build base profile
      const profile: DownloadProfile = {
        url,
        mediaKind,
        outputDirectory: '.',
        filenameTemplate: '%(title)s.%(ext)s',
        subtitleOptions: { mode: 'none', output: 'separate' },
        metadataOptions: {
          embedMetadata: false,
          embedThumbnail: false,
          embedChapters: false,
        },
        playlist: { mode: 'entire_playlist' },
        useDownloadArchive: false,
      };

      // 5. Execute workflow
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
        profile.videoQuality = quality;

        const res = await this.mp4Workflow.run(profile);
        if (res.ok) {
          console.log(chalk.green(`\n📂 File saved to directory: ${profile.outputDirectory}`));
        } else {
          // Failure already printed by event stream via TerminalRenderer
        }
      } else {
        const bitrate = await select<AudioBitrate>({
          message: 'Select audio bitrate:',
          choices: [
            { name: '320kbps (Best)', value: 320 },
            { name: '192kbps (Good)', value: 192 },
            { name: '128kbps (Standard)', value: 128 },
          ],
        });
        profile.audioOptions = { format: 'mp3', bitrate };

        const res = await this.mp3Workflow.run(profile);
        if (res.ok) {
          console.log(chalk.green(`\n📂 File saved to directory: ${profile.outputDirectory}`));
        } else {
          // Failure already printed by event stream via TerminalRenderer
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'ExitPromptError') {
        // User aborted the prompt
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
