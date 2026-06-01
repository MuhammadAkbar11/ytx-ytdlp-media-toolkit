import { input, select } from '@inquirer/prompts';
import { InspectionService } from '../../core/downloader/inspection.service';
import { Mp4DownloadWorkflow } from '../../core/workflows/mp4-download-workflow';
import { Mp3DownloadWorkflow } from '../../core/workflows/mp3-download-workflow';
import { SubtitleWorkflow } from '../../core/workflows/subtitle-workflow';
import {
  FilenamePreview,
  FilenamePreviewResult,
} from '../renderers/filename-preview';
import { DryRunWorkflow } from '../../core/workflows/dry-run-workflow';
import { EventStream } from '../../core/runtime/event-stream';
import { TerminalRenderer } from '../renderers/terminal-renderer';
import { validateUrl } from '../../core/validation/url-validator';
import { ProfileBuilder } from '../../core/profiles/profile-builder';
import { ConfigService } from '../../core/config/config-service';
import { PresetRegistry } from '../../core/presets/preset-registry';
import { OutputPathResolver } from '../../core/filesystem/output-path-resolver';

import { ArtifactSizeEstimator } from '../../core/runtime/artifact-size-estimator';
import { BatchUrlResolver } from '../../core/batch/batch-url-resolver';
import { RuntimeContextBuilder } from '../../core/runtime/runtime-context';
import { RuntimePreflightResolver } from '../../core/preflight/runtime-preflight-resolver';
import { PlaylistInspector } from '../../core/playlist/playlist-inspector';
import { SearchablePlaylistSelector } from '../../core/prompts/searchable-playlist-selector';
import { BrowserName } from '../../types/common';
import chalk from 'chalk';
import ora from 'ora';
import { gracefulShutdownManager } from '../../core/runtime/graceful-shutdown';
import { runtimeEnvironment } from '../../core/runtime/runtime-environment';
import { renderCliBanner } from '../renderers/cli-banner';
import { FailureClassifier } from '../../core/errors/failure-classifier';
import { DiagnosticFormatter } from '../../core/errors/diagnostic-formatter';
import {
  AudioBitrate,
  DownloadProfile,
  MediaKind,
  VideoQuality,
  YtDlpInfo,
} from '../../types';

export interface DownloadOptions {
  dryRun?: boolean;
  preset?: string;
  audio?: boolean;
  video?: boolean;
  quality?: string;
  subLang?: string;
  subMode?: string;
  output?: string;
  verbose?: boolean;
  aria2?: boolean;
  browser?: string | boolean;
  file?: string;
}

export class DownloadCommand {
  private failureClassifier: FailureClassifier;
  private diagnosticFormatter: DiagnosticFormatter;

  private batchUrlResolver: BatchUrlResolver;

  constructor(
    private inspectionService: InspectionService,
    private mp4Workflow: Mp4DownloadWorkflow,
    private mp3Workflow: Mp3DownloadWorkflow,
    private subtitleWorkflow: SubtitleWorkflow,
    private filenamePreview: FilenamePreview,
    private eventStream: EventStream,
    private profileBuilder: ProfileBuilder,
    private configService: ConfigService,
    private presetRegistry: PresetRegistry,
    private dryRunWorkflow: DryRunWorkflow,
    private outputPathResolver: OutputPathResolver,
    private runtimePreflightResolver: RuntimePreflightResolver,
    private playlistInspector: PlaylistInspector,
    private searchablePlaylistSelector: SearchablePlaylistSelector
  ) {
    this.failureClassifier = new FailureClassifier();
    this.diagnosticFormatter = new DiagnosticFormatter();
    this.batchUrlResolver = new BatchUrlResolver();
  }

  async execute(
    initialUrl?: string,
    options: DownloadOptions = {}
  ): Promise<void> {
    const renderer = new TerminalRenderer(this.eventStream);
    renderer.start();
    gracefulShutdownManager.registerCleanup(() => renderer.stop());

    try {
      // Display banner in interactive mode
      if (runtimeEnvironment.isInteractive) {
        renderCliBanner();
      }

      // Determine if this is a batch operation
      const hasFileInput =
        typeof options.file === 'string' && options.file.trim().length > 0;
      const isBatch =
        hasFileInput || !!(initialUrl && initialUrl.includes(','));

      if (isBatch) {
        await this.executeBatch(hasFileInput ? undefined : initialUrl, options);
        return;
      }

      // Single URL flow (existing)
      // 1. Prompt for URL if not provided
      let url = initialUrl;
      if (!url) {
        if (!runtimeEnvironment.isInteractive) {
          console.log(chalk.red('✘ URL is required in non-interactive mode.'));
          console.log(
            chalk.yellow('\n  Usage: ytx <url> or ytx "url1,url2,url3"')
          );
          return;
        }
        url = await input({
          message: 'Enter YouTube URL (or comma-separated URLs for batch):\n➤',
          validate: (val) => {
            const trimmed = val.trim();
            if (trimmed.includes(',')) {
              // Batch input — basic non-empty check; full validation happens in BatchUrlResolver
              return (
                trimmed.split(',').some((u) => u.trim().length > 0) ||
                'At least one URL is required'
              );
            }
            return validateUrl(trimmed).ok || 'Invalid URL';
          },
        });

        // Check if interactive input is a batch (comma-separated)
        if (url && url.trim().includes(',')) {
          await this.executeBatch(url.trim(), options);
          return;
        }
      } else {
        const valRes = validateUrl(url);
        if (!valRes.ok) {
          console.log(chalk.red('✘ Invalid URL provided.'));
          console.log(
            chalk.yellow(
              '\nSupported formats: youtube.com/watch, youtu.be, youtube.com/shorts'
            )
          );
          return;
        }
      }

      const appConfig = this.configService.getAll();

      // 1.5 Browser Cookie Resolution
      let browserCookies: BrowserName | null = null;

      if (options.browser === true) {
        if (!runtimeEnvironment.isInteractive) {
          console.log(
            chalk.yellow(
              '⚠ --browser flag without value ignored in non-interactive mode.'
            )
          );
        } else {
          browserCookies = await select<BrowserName>({
            message: 'Select browser:',
            choices: [
              { name: 'Brave', value: 'brave' },
              { name: 'Chrome', value: 'chrome' },
              { name: 'Firefox', value: 'firefox' },
              { name: 'Edge', value: 'edge' },
              { name: 'Safari', value: 'safari' },
            ],
          });
        }
      } else if (typeof options.browser === 'string') {
        browserCookies = options.browser as BrowserName;
      } else if (appConfig.preferredBrowser) {
        browserCookies = appConfig.preferredBrowser;
      }

      const runtimeContextBuilder = new RuntimeContextBuilder();
      runtimeContextBuilder.withBrowserCookies(browserCookies);
      const runtimeContext = runtimeContextBuilder.build();

      // 1.8 Runtime Preflight Resolution
      const preflightSpinner = runtimeEnvironment.isInteractive
        ? ora('Resolving runtime capabilities...').start()
        : null;
      if (!runtimeEnvironment.isInteractive) {
        console.log(chalk.blue('➤ Resolving runtime capabilities...'));
      }
      const preparedContext =
        await this.runtimePreflightResolver.resolve(runtimeContext);
      preflightSpinner?.stop();

      if (!preparedContext.capabilities.ytDlpAvailable) {
        console.log(chalk.red('✘ yt-dlp was not found.'));
        console.log(
          chalk.yellow(
            '\nInstall yt-dlp and ensure it is available in PATH.\n\n  pip install yt-dlp\n\nVerify with: ytx doctor'
          )
        );
        return;
      }

      if (preparedContext.capabilities.ffmpegAvailable === false) {
        console.log(
          chalk.yellow(
            '⚠ ffmpeg was not detected. Merging and post-processing may fail.\n  Install ffmpeg: sudo apt install ffmpeg'
          )
        );
      }

      // 2. Inspect the URL
      const spinner = runtimeEnvironment.isInteractive
        ? ora('Inspecting URL...').start()
        : null;
      if (!runtimeEnvironment.isInteractive) {
        console.log(chalk.blue('➤ Inspecting URL...'));
      }
      // Check if this is a playlist URL to use tolerant inspection
      const preValRes = validateUrl(url);
      const isPlaylistUrl = preValRes.ok && preValRes.value.type === 'playlist';

      const inspectRes = isPlaylistUrl
        ? await this.inspectionService.inspectPlaylist(url, runtimeContext)
        : await this.inspectionService.inspect(url, runtimeContext);
      spinner?.stop();

      if (!inspectRes.ok) {
        const classified = this.failureClassifier.classifyInspectionFailure(
          inspectRes.error.message,
          1
        );
        console.log(
          this.diagnosticFormatter.formatFailure(classified, options.verbose)
        );
        return;
      }

      console.log(chalk.green(`✔ Found: ${inspectRes.value.title}`));

      // Show skipped playlist entries feedback
      if (
        inspectRes.value.skippedEntries &&
        inspectRes.value.skippedEntries.length > 0
      ) {
        const skippedCount = inspectRes.value.skippedEntries.length;
        const availableCount = inspectRes.value.entriesCount
          ? inspectRes.value.entriesCount - skippedCount
          : undefined;
        console.log(
          chalk.yellow(
            `\n⚠ ${skippedCount} unavailable video${skippedCount > 1 ? 's' : ''} skipped`
          )
        );
        if (availableCount !== undefined) {
          console.log(chalk.blue(`  Available videos: ${availableCount}`));
        }
        if (options.verbose) {
          for (const entry of inspectRes.value.skippedEntries) {
            console.log(chalk.dim(`  - ${entry.title}: ${entry.reason}`));
          }
        }
      }

      // 2.5 Playlist Prompt
      let globalOverrides: Partial<DownloadProfile> = {};
      if (options.aria2) {
        globalOverrides.useAria2 = true;
      }
      if (browserCookies) {
        globalOverrides.browserCookies = browserCookies;
      }
      const valRes = validateUrl(url);
      if (valRes.ok && valRes.value.type === 'playlist') {
        let playlistMode: 'entire_playlist' | 'first_video' | 'selected_items' =
          'entire_playlist';
        let selectedItems: string | undefined;

        if (runtimeEnvironment.isInteractive) {
          playlistMode = await select<
            'entire_playlist' | 'first_video' | 'selected_items'
          >({
            message: 'Playlist detected. How do you want to proceed?',
            choices: [
              { name: 'Download entire playlist', value: 'entire_playlist' },
              { name: 'Download first item only', value: 'first_video' },
              { name: 'Select specific items', value: 'selected_items' },
            ],
          });

          if (playlistMode === 'selected_items') {
            const spinner = ora('Fetching playlist items...').start();
            const itemsRes = await this.playlistInspector.getPlaylistItems(
              url,
              browserCookies || undefined
            );
            spinner.stop();

            if (!itemsRes.ok) {
              console.log(
                chalk.red(
                  `\n✘ Failed to fetch playlist items: ${itemsRes.error}`
                )
              );
              selectedItems = await input({
                message: 'Enter items manually (e.g. 1,3,5-10):',
                validate: (val) => val.trim().length > 0 || 'Cannot be empty',
              });
            } else {
              const selection =
                await this.searchablePlaylistSelector.promptForSelection(
                  itemsRes.value
                );
              if (!selection) {
                console.log(
                  chalk.yellow(
                    '\n⚠ No items selected. Falling back to entire playlist.'
                  )
                );
                playlistMode = 'entire_playlist';
              } else {
                selectedItems = selection;
              }
            }
          }
        } else {
          // Non-interactive fallback: we must have a flag or we default to entire_playlist
          playlistMode = 'entire_playlist';
        }

        globalOverrides.playlist = {
          mode: playlistMode,
          selectedItems,
        };
      }

      const resolvedOutputPath = await this.outputPathResolver.resolve(
        options.output,
        appConfig.outputPath
      );
      if (
        options.output &&
        resolvedOutputPath !==
          this.outputPathResolver.normalizePath(options.output)
      ) {
        console.log(
          chalk.yellow(
            `⚠ Output path "${options.output}" is not valid. Using default: ${resolvedOutputPath}`
          )
        );
      }
      globalOverrides.outputPath = resolvedOutputPath;

      // 3. Prompt for Preset or Custom
      const presets = this.presetRegistry.getAllPresets();
      const presetChoices = presets.map((p) => ({
        name: `${p.label} - ${p.description}`,
        value: p.id,
      }));

      presetChoices.unshift({
        name: 'Custom (Configure manually)',
        value: 'custom',
      });

      let selectedPresetId: string;
      if (options.preset) {
        selectedPresetId = options.preset;
      } else if (!runtimeEnvironment.isInteractive) {
        selectedPresetId = appConfig.defaultPreset || 'custom';
        console.log(
          chalk.blue(
            `➤ Non-interactive mode: using preset "${selectedPresetId}"`
          )
        );
      } else {
        selectedPresetId = await select<string>({
          message: 'Select a download preset:',
          choices: presetChoices,
          default: appConfig.defaultPreset || 'custom',
        });
      }

      if (options.dryRun) {
        console.log(chalk.blue('ⓘ Dry run enabled. Previewing execution...'));
        const dryRunRes = await this.dryRunWorkflow.run(
          url,
          appConfig,
          selectedPresetId
        );

        if (!dryRunRes.ok) {
          console.log(chalk.red('✘ Dry run failed:'));
          dryRunRes.error.forEach((issue) => {
            console.log(
              chalk.red(
                `  - [${issue.category}] ${issue.message} (${issue.field || 'general'})`
              )
            );
          });
          return;
        }

        const res = dryRunRes.value;
        console.log(
          chalk.green('\n✔ Dry Run Successful! Previewing resolved state:')
        );
        console.log(chalk.yellow('\n--- Resolved Profile ---'));
        console.log(JSON.stringify(res.profile, null, 2));

        console.log(chalk.yellow('\n--- Resolved Arguments ---'));
        console.log(chalk.cyan(`yt-dlp ${res.arguments.join(' ')}`));

        console.log(chalk.yellow('\n------------------------'));
        return;
      }

      let profile: DownloadProfile;

      if (selectedPresetId !== 'custom') {
        const preset = this.presetRegistry.getPreset(selectedPresetId);
        profile = this.profileBuilder.build(url, appConfig, preset);
        console.log(chalk.green(`✔ Using preset: ${preset?.label}`));
      } else {
        // Custom flow
        let mediaKind: MediaKind;
        if (options.audio) {
          mediaKind = 'audio';
        } else if (options.video) {
          mediaKind = 'video';
        } else if (!runtimeEnvironment.isInteractive) {
          mediaKind = 'video';
          console.log(
            chalk.blue('➤ Non-interactive mode: defaulting to video format')
          );
        } else {
          mediaKind = await select<MediaKind>({
            message: 'Select format:',
            choices: [
              { name: 'Video (MP4)', value: 'video' },
              { name: 'Audio (MP3)', value: 'audio' },
            ],
          });
        }

        const overrides: Partial<DownloadProfile> = {
          mediaKind,
        };

        if (mediaKind === 'video') {
          let quality: VideoQuality;
          if (options.quality) {
            quality = options.quality as VideoQuality;
            if (options.quality !== 'best') {
              quality = parseInt(options.quality, 10) as VideoQuality;
            }
          } else if (!runtimeEnvironment.isInteractive) {
            quality = 'best';
          } else {
            quality = await select<VideoQuality>({
              message: 'Select quality:',
              choices: [
                { name: 'Best Available', value: 'best' },
                { name: '1080p', value: 1080 },
                { name: '720p', value: 720 },
                { name: '480p', value: 480 },
              ],
            });
          }
          overrides.videoQuality = quality;

          let wantSubtitles: 'yes' | 'no';
          if (options.subLang) {
            wantSubtitles = 'yes';
          } else if (!runtimeEnvironment.isInteractive) {
            wantSubtitles = 'no';
          } else {
            wantSubtitles = await select<'yes' | 'no'>({
              message: 'Download subtitles?',
              choices: [
                { name: 'No', value: 'no' },
                { name: 'Yes', value: 'yes' },
              ],
            });
          }

          if (wantSubtitles === 'yes') {
            let subtitleLang: 'english' | 'all';
            if (options.subLang) {
              subtitleLang = options.subLang as 'english' | 'all';
            } else if (!runtimeEnvironment.isInteractive) {
              subtitleLang = 'english';
            } else {
              subtitleLang = await select<'english' | 'all'>({
                message: 'Select subtitle language:',
                choices: [
                  { name: 'English', value: 'english' },
                  { name: 'All available', value: 'all' },
                ],
              });
            }

            let subtitleOutput: 'embed' | 'separate';
            if (options.subMode) {
              subtitleOutput = options.subMode as 'embed' | 'separate';
            } else if (!runtimeEnvironment.isInteractive) {
              subtitleOutput = 'embed';
            } else {
              subtitleOutput = await select<'embed' | 'separate'>({
                message: 'Subtitle output format:',
                choices: [
                  { name: 'Embed into video', value: 'embed' },
                  { name: 'Separate file', value: 'separate' },
                ],
              });
            }

            overrides.subtitleOptions = {
              mode: subtitleLang,
              output: subtitleOutput,
            };
          }
        } else {
          let bitrate: AudioBitrate;
          if (!runtimeEnvironment.isInteractive) {
            bitrate = 320;
          } else {
            bitrate = await select<AudioBitrate>({
              message: 'Select audio bitrate:',
              choices: [
                { name: '320kbps (Best)', value: 320 },
                { name: '192kbps (Good)', value: 192 },
                { name: '128kbps (Standard)', value: 128 },
              ],
            });
          }
          overrides.audioOptions = { format: 'mp3', bitrate };
        }

        let configureEmbedding: boolean;
        if (!runtimeEnvironment.isInteractive) {
          configureEmbedding = false;
        } else {
          configureEmbedding = await select<false | true>({
            message: 'Configure advanced embedding options?',
            choices: [
              { name: 'No', value: false },
              { name: 'Yes', value: true },
            ],
            default: false,
          });
        }

        if (configureEmbedding) {
          const embedMetadata = await select<'yes' | 'no'>({
            message: 'Embed metadata?',
            choices: [
              { name: 'Yes', value: 'yes' },
              { name: 'No', value: 'no' },
            ],
          });

          const embedThumbnail = await select<'yes' | 'no'>({
            message: 'Embed thumbnail?',
            choices: [
              { name: 'Yes', value: 'yes' },
              { name: 'No', value: 'no' },
            ],
          });

          const embedChapters = await select<'yes' | 'no'>({
            message: 'Embed chapters?',
            choices: [
              { name: 'Yes', value: 'yes' },
              { name: 'No', value: 'no' },
            ],
          });

          overrides.metadataOptions = {
            embedMetadata: embedMetadata === 'yes',
            embedThumbnail: embedThumbnail === 'yes',
            embedChapters: embedChapters === 'yes',
          };
        }

        profile = this.profileBuilder.build(
          url,
          appConfig,
          undefined,
          overrides
        );
      }

      if (globalOverrides.playlist) {
        profile.playlist = globalOverrides.playlist;
      }
      if (globalOverrides.outputPath) {
        profile.outputPath = globalOverrides.outputPath;
      }
      if (globalOverrides.useAria2) {
        profile.useAria2 = globalOverrides.useAria2;
      }
      if (globalOverrides.browserCookies) {
        profile.browserCookies = globalOverrides.browserCookies;
      }

      // Calculate estimated size
      const estimator = new ArtifactSizeEstimator();
      const estimatedSize = estimator.estimate(profile, inspectRes.value);
      if (estimatedSize) {
        profile.estimatedSize = estimatedSize;
      }

      if (options.verbose) {
        this.eventStream.emit({
          type: 'debug',
          message: `preset: ${selectedPresetId}`,
        });
        this.eventStream.emit({
          type: 'debug',
          message: `output path: ${profile.outputPath}`,
        });
        this.eventStream.emit({
          type: 'debug',
          message: `media kind: ${profile.mediaKind}`,
        });
        this.eventStream.emit({
          type: 'debug',
          message: `quality: ${profile.videoQuality || 'N/A'}`,
        });
        this.eventStream.emit({
          type: 'debug',
          message: `subtitles: ${profile.subtitleOptions?.mode || 'none'}`,
        });
      }

      // 4.5 Filename Preview
      const previewResult = await this.filenamePreview.render(profile);

      // 5. Execute workflow
      if (profile.mediaKind === 'video') {
        let res;
        if (
          profile.subtitleOptions &&
          profile.subtitleOptions.mode !== 'none'
        ) {
          console.log(
            chalk.blue('\nⓘ Subtitles requested. Using SubtitleWorkflow...')
          );
          res = await this.subtitleWorkflow.run(profile);
        } else {
          res = await this.mp4Workflow.run(profile);
        }

        if (res.ok) {
          this.printSavedMessage(previewResult, profile.outputPath);
        } else {
          this.printWorkflowFailure(res.error, options.verbose);
        }
      } else {
        const res = await this.mp3Workflow.run(profile);
        if (res.ok) {
          this.printSavedMessage(previewResult, profile.outputPath);
        } else {
          this.printWorkflowFailure(res.error, options.verbose);
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'ExitPromptError') {
        console.log(chalk.yellow('\n⚠ Operation aborted by user.'));
      } else {
        const classified = this.failureClassifier.classifyFromError(e);
        console.log(
          '\n' +
            this.diagnosticFormatter.formatFailure(classified, options.verbose)
        );
      }
    } finally {
      renderer.stop();
    }
  }

  private async executeBatch(
    initialUrl: string | undefined,
    options: DownloadOptions
  ): Promise<void> {
    // Resolve batch URLs
    const batchResult = await this.batchUrlResolver.resolve(
      initialUrl,
      options.file
    );

    if (!batchResult.ok) {
      console.log(chalk.red(`✘ Batch error: ${batchResult.error.message}`));
      return;
    }

    const { urls, duplicatesRemoved } = batchResult.value;

    if (duplicatesRemoved > 0) {
      console.log(
        chalk.yellow(
          `⚠ Removed ${duplicatesRemoved} duplicate URL${duplicatesRemoved > 1 ? 's' : ''}`
        )
      );
    }

    console.log(
      chalk.blue(
        `➤ Batch mode: ${urls.length} URL${urls.length > 1 ? 's' : ''} to process`
      )
    );

    const appConfig = this.configService.getAll();

    let browserCookies: BrowserName | null = null;
    if (options.browser === true) {
      if (!runtimeEnvironment.isInteractive) {
        console.log(
          chalk.yellow(
            '⚠ --browser flag without value ignored in non-interactive mode.'
          )
        );
      } else {
        browserCookies = await select<BrowserName>({
          message: 'Select browser:',
          choices: [
            { name: 'Brave', value: 'brave' },
            { name: 'Chrome', value: 'chrome' },
            { name: 'Firefox', value: 'firefox' },
            { name: 'Edge', value: 'edge' },
            { name: 'Safari', value: 'safari' },
          ],
        });
      }
    } else if (typeof options.browser === 'string') {
      browserCookies = options.browser as BrowserName;
    } else if (appConfig.preferredBrowser) {
      browserCookies = appConfig.preferredBrowser;
    }

    const runtimeContextBuilder = new RuntimeContextBuilder();
    runtimeContextBuilder.withBrowserCookies(browserCookies);
    const runtimeContext = runtimeContextBuilder.build();

    const firstUrl = urls[0];
    const spinner = runtimeEnvironment.isInteractive
      ? ora('Inspecting first URL...').start()
      : null;
    if (!runtimeEnvironment.isInteractive) {
      console.log(chalk.blue('➤ Inspecting first URL...'));
    }
    const firstInspectRes = await this.inspectionService.inspect(
      firstUrl,
      runtimeContext
    );
    spinner?.stop();

    if (!firstInspectRes.ok) {
      const classified = this.failureClassifier.classifyInspectionFailure(
        firstInspectRes.error.message,
        1
      );
      console.log(
        this.diagnosticFormatter.formatFailure(classified, options.verbose)
      );
      return;
    }

    console.log(chalk.green(`✔ Found: ${firstInspectRes.value.title}`));

    const resolvedOutputPath = await this.outputPathResolver.resolve(
      options.output,
      appConfig.outputPath
    );

    // Resolve preset once for all URLs
    let selectedPresetId: string;
    if (options.preset) {
      selectedPresetId = options.preset;
    } else if (!runtimeEnvironment.isInteractive) {
      selectedPresetId = appConfig.defaultPreset || 'custom';
    } else {
      const presets = this.presetRegistry.getAllPresets();
      const presetChoices = presets.map((p) => ({
        name: `${p.label} - ${p.description}`,
        value: p.id,
      }));
      presetChoices.unshift({
        name: 'Custom (Configure manually)',
        value: 'custom',
      });
      selectedPresetId = await select<string>({
        message: 'Select a download preset (applies to all URLs):',
        choices: presetChoices,
        default: appConfig.defaultPreset || 'custom',
      });
    }

    // Resolve format and quality once for custom preset
    let customMediaKind: MediaKind | undefined;
    let customOverrides: Partial<DownloadProfile> | undefined;

    if (selectedPresetId === 'custom') {
      if (options.audio) {
        customMediaKind = 'audio';
      } else if (options.video) {
        customMediaKind = 'video';
      } else if (!runtimeEnvironment.isInteractive) {
        customMediaKind = 'video';
      } else {
        customMediaKind = await select<MediaKind>({
          message: 'Select format (applies to all URLs):',
          choices: [
            { name: 'Video (MP4)', value: 'video' },
            { name: 'Audio (MP3)', value: 'audio' },
          ],
        });
      }

      customOverrides = { mediaKind: customMediaKind };

      if (customMediaKind === 'video') {
        if (options.quality) {
          customOverrides.videoQuality = this.parseVideoQuality(
            options.quality
          );
        } else if (!runtimeEnvironment.isInteractive) {
          customOverrides.videoQuality = 'best';
        } else {
          customOverrides.videoQuality = await select<VideoQuality>({
            message: 'Select quality (applies to all URLs):',
            choices: [
              { name: 'Best Available', value: 'best' },
              { name: '1080p', value: 1080 },
              { name: '720p', value: 720 },
              { name: '480p', value: 480 },
            ],
          });
        }
      } else {
        const bitrate = runtimeEnvironment.isInteractive
          ? await select<AudioBitrate>({
              message: 'Select audio bitrate (applies to all URLs):',
              choices: [
                { name: '320kbps (Best)', value: 320 },
                { name: '192kbps (Good)', value: 192 },
                { name: '128kbps (Standard)', value: 128 },
              ],
            })
          : 320;
        customOverrides.audioOptions = { format: 'mp3', bitrate };
      }

      if (browserCookies) {
        customOverrides.browserCookies = browserCookies;
      }
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(
        chalk.cyan(`\n━━━ [${i + 1}/${urls.length}] Processing: ${url} ━━━`)
      );

      try {
        const result = await this.downloadSingleUrl(
          url,
          appConfig,
          selectedPresetId,
          resolvedOutputPath,
          customOverrides,
          options,
          browserCookies,
          i === 0 ? firstInspectRes.value : undefined
        );
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
        console.log(
          chalk.red(`✘ Failed: ${e instanceof Error ? e.message : String(e)}`)
        );
      }
    }

    console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(
      chalk.green(
        `✔ Batch complete: ${successCount} succeeded, ${failCount} failed`
      )
    );
  }

  private async downloadSingleUrl(
    url: string,
    appConfig: ReturnType<ConfigService['getAll']>,
    selectedPresetId: string,
    resolvedOutputPath: string,
    customOverrides: Partial<DownloadProfile> | undefined,
    options: DownloadOptions,
    browserCookies?: BrowserName | null,
    inspectedInfo?: YtDlpInfo
  ): Promise<boolean> {
    const runtimeContextBuilder = new RuntimeContextBuilder();
    runtimeContextBuilder.withBrowserCookies(browserCookies ?? null);
    const runtimeContext = runtimeContextBuilder.build();

    let inspectedValue: YtDlpInfo;
    if (inspectedInfo) {
      inspectedValue = inspectedInfo;
    } else {
      const inspectRes = await this.inspectionService.inspect(
        url,
        runtimeContext
      );
      if (!inspectRes.ok) {
        const classified = this.failureClassifier.classifyInspectionFailure(
          inspectRes.error.message,
          1
        );
        console.log(
          this.diagnosticFormatter.formatFailure(classified, options.verbose)
        );
        return false;
      }

      inspectedValue = inspectRes.value;
      console.log(chalk.green(`✔ Found: ${inspectedValue.title}`));
    }

    // Build profile
    let profile: DownloadProfile;
    if (selectedPresetId !== 'custom') {
      const preset = this.presetRegistry.getPreset(selectedPresetId);
      profile = this.profileBuilder.build(url, appConfig, preset);
    } else {
      profile = this.profileBuilder.build(
        url,
        appConfig,
        undefined,
        customOverrides
      );
    }

    profile.outputPath = resolvedOutputPath;

    if (browserCookies) {
      profile.browserCookies = browserCookies;
    }

    if (options.aria2) {
      profile.useAria2 = true;
    }

    // Estimated size
    const estimator = new ArtifactSizeEstimator();
    const estimatedSize = estimator.estimate(profile, inspectedValue);
    if (estimatedSize) {
      profile.estimatedSize = estimatedSize;
    }

    // Filename preview
    const previewResult = await this.filenamePreview.render(profile);

    // Execute workflow
    if (profile.mediaKind === 'video') {
      const res = await this.mp4Workflow.run(profile);
      if (res.ok) {
        this.printSavedMessage(previewResult, profile.outputPath);
        return true;
      } else {
        this.printWorkflowFailure(res.error, options.verbose);
        return false;
      }
    } else {
      const res = await this.mp3Workflow.run(profile);
      if (res.ok) {
        this.printSavedMessage(previewResult, profile.outputPath);
        return true;
      } else {
        this.printWorkflowFailure(res.error, options.verbose);
        return false;
      }
    }
  }

  private printSavedMessage(
    previewResult: FilenamePreviewResult,
    outputPath: string
  ): void {
    const checkSymbol = chalk.green('✔');
    if (previewResult.isError) {
      console.log(
        chalk.green(`\n${checkSymbol} File saved to directory: ${outputPath}`)
      );
    } else if (previewResult.filenames.length === 1) {
      console.log(
        chalk.green(
          `\n${checkSymbol} File saved to: ${previewResult.filenames[0]}`
        )
      );
    } else {
      console.log(
        chalk.green(
          `\n${checkSymbol} ${previewResult.filenames.length} files saved:`
        )
      );
      for (let i = 0; i < previewResult.filenames.length; i++) {
        console.log(
          `  ${chalk.dim(`${i + 1}.`)} ${previewResult.filenames[i]}`
        );
      }
    }
  }

  private printWorkflowFailure(
    issues: { category: string; message: string }[],
    verbose?: boolean
  ): void {
    for (const issue of issues) {
      const result = { exitCode: 1, stdout: '', stderr: issue.message };
      const classified = this.failureClassifier.classifyFromProcessResult(
        result,
        'yt-dlp'
      );
      console.log(
        '\n' + this.diagnosticFormatter.formatFailure(classified, verbose)
      );
    }
  }

  private parseVideoQuality(value: string): VideoQuality {
    return value === 'best' ? 'best' : (parseInt(value, 10) as VideoQuality);
  }
}
