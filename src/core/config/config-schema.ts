import { z } from 'zod';

export const SubtitleOptionsSchema = z.object({
  mode: z.enum(['none', 'english', 'all']),
  output: z.enum(['embed', 'separate']),
});

export const MetadataOptionsSchema = z.object({
  embedThumbnail: z.boolean(),
  embedMetadata: z.boolean(),
  embedChapters: z.boolean(),
});

export const AppConfigSchema = z.object({
  version: z.number(),
  outputDirectory: z.string(),
  preferredBrowser: z.enum(['chrome', 'firefox', 'edge', 'brave', 'safari']).nullable(),
  preferredBitrate: z.union([
    z.literal(320),
    z.literal(256),
    z.literal(192),
    z.literal(128),
  ]),
  filenameTemplate: z.string(),
  subtitleOptions: SubtitleOptionsSchema,
  metadataOptions: MetadataOptionsSchema,
  defaultPreset: z.string(),
  preferredVideoQuality: z.union([
    z.literal(2160),
    z.literal(1440),
    z.literal(1080),
    z.literal(720),
    z.literal(480),
    z.literal('best'),
  ]).optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
