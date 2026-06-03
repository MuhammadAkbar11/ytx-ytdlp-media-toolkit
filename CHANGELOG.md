# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-06-03

### Added

- Batch download support with comma-separated URLs and file input (`.txt`/`.md`) (`f5b0e08`)
- Video title extraction from download destinations with `item-started` events now including titles for improved UI rendering (`2212870`)
- Playlist filename previews and improved partial download success handling for unavailable items (`8ac05ec`)
- Runtime diagnostic logging instrumented across core components for enhanced observability (`2394e04`)
- Zod schema validation for `config set` commands with descriptive allowed-value error messages (`99181a7`)
- Branded ASCII startup banner for interactive CLI sessions (`a7aad0d`)
- Unit tests for subscriber error isolation in EventStream (`71b32dc`)

### Changed

- Preset selection prompt is now skipped when `--audio` or `--video` flags are provided, jumping directly to the relevant custom flow (`f7e0e05`)
- Terminal renderer now logs messages without destroying the progress bar instance, preventing visual glitches (`864a451`)
- EventStream subscriber error logging improved with proper isolation and ConsoleLogger integration (`71b32dc`)

### Fixed

- Interactive prompts for batch download workflows now function correctly (`e366a04`)

### Removed

- Deprecated CLI flags `--quality <value>`, `--sub-lang <value>`, and `--sub-mode <value>` from both default and download commands (`f7e0e05`)
  - Quality and subtitle options are now selected exclusively through interactive prompts in the custom flow

### Refactored

- Remove deprecated CLI quality and subtitle flags in favor of interactive preset flow (`f7e0e05`)
- Terminal renderer log message handling (`864a451`)
- EventStream subscriber error isolation and logging (`71b32dc`)

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
