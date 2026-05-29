# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-05-29

### Added

- Interactive guided download workflow with prompts for format, quality, subtitles, metadata
- MP4 video downloads with automatic audio/video merging via ffmpeg
- MP3 audio extraction with configurable bitrate (128/192/256/320 kbps)
- Playlist support: download entire playlist, first item, or select specific items with fuzzy search
- Browser cookie support for age-restricted/private content (chrome, firefox, edge, brave, safari)
- Preset system: save and reuse download configurations (balanced, best quality, audio only, etc.)
- Subtitle downloading with embed or separate-file modes
- Metadata, thumbnail, and chapter embedding into output files
- Dry-run mode to preview resolved yt-dlp arguments without downloading
- Filename preview showing predicted output filename before download
- Artifact size estimation based on bitrate and duration
- Optional aria2 multi-threaded downloading
- Doctor command (`ytx doctor`) for runtime dependency and configuration health checks
- XDG-compliant configuration at `~/.config/ytx-downloader/config.json`
- Automatic config migration (v1 -> v2 -> v3) with `outputDirectory` to `outputPath` rename
- Output path resolution with fallback chain: CLI flag -> config -> ~/Downloads
- Non-interactive mode for scripted/CI usage
- Graceful shutdown on Ctrl+C with clean process termination
- Transient failure classification with automatic retry
- Session inspection cache for faster repeated workflows
- Runtime preflight resolver for environment validation
- `--debug-runtime` flag for deep runtime diagnostics
- Verbose mode (`-v, --verbose`) for detailed output
- Full Linux installation guide for Debian, Fedora, and Arch
