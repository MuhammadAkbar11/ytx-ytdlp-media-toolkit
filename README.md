# ytx

A modern, interactive CLI for downloading YouTube videos and audio using yt-dlp. Built with [Bun](https://bun.sh/) and TypeScript. **Linux only.**

## Features

- **Interactive guided workflow** — prompts for format, quality, subtitles, metadata, and more
- **MP4 video downloads** — with automatic audio/video merging via ffmpeg
- **MP3 audio extraction** — configurable bitrate (128/192/256/320 kbps)
- **Playlist support** — download entire playlists, first item, or select specific items with fuzzy search
- **Browser cookie support** — download age-restricted or private content using cookies from Chrome, Firefox, Edge, Brave, or Safari
- **Presets** — save and reuse download configurations (balanced, best quality, audio only, etc.)
- **Subtitles** — download and embed or save as separate files
- **Metadata embedding** — embed metadata, thumbnails, and chapters into output files
- **Dry-run mode** — preview resolved yt-dlp arguments without downloading
- **Filename preview** — see predicted output filename before downloading
- **Artifact size estimation** — estimated file size based on bitrate and duration
- **aria2 support** — optional multi-threaded downloading via aria2
- **Doctor command** — check runtime dependencies and configuration health
- **XDG-compliant config** — stored at `~/.config/ytx-downloader/config.json`
- **Graceful shutdown** — clean process termination on Ctrl+C

## Supported Platforms

**Linux only.** This tool is designed and tested exclusively for Linux environments.

## Prerequisites

| Dependency | Required | Purpose |
|---|---|---|
| [Bun](https://bun.sh/) | Yes | JavaScript runtime |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Yes | Download engine |
| [ffmpeg](https://ffmpeg.org/) | Yes | Format merging and audio extraction |
| [aria2](https://aria2.github.io/) | Optional | Faster multi-threaded downloads |

All dependencies must be available in your system `PATH`.

## Installation

See the [Linux Installation Guide](docs/installation.md) for detailed per-distribution instructions.

### Quick Start

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash

# 2. Clone and install
git clone https://github.com/MuhammadAkbar11/ytx-ytdlp-media-toolkit.git
cd ytx-ytdlp-media-toolkit
bun install

# 3. Link the CLI globally
bun link

# 4. Verify installation
ytx --help
ytx doctor
```

Make sure `~/.bun/bin` is in your `PATH`:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

Add the line above to your `~/.bashrc` or `~/.zshrc` to make it permanent.

## Usage

### Download a Video

```bash
# Interactive mode — guided prompts for format, quality, etc.
ytx download <URL>

# Audio-only (MP3)
ytx download <URL> --audio

# Video with specific quality
ytx download <URL> --video --quality 720

# Use browser cookies for restricted content
ytx download <URL> --browser firefox

# Dry-run — preview without downloading
ytx download <URL> --dry-run
```

### Manage Configuration

```bash
# View all config
ytx config get outputPath

# Set a value
ytx config set outputPath ~/Videos

# List current configuration
ytx config list

# Reset to defaults
ytx config reset
```

### Use Presets

```bash
# List available presets
ytx preset list

# Show preset details
ytx preset show balanced

# Set a default preset
ytx preset use balanced
```

### Run Diagnostics

```bash
ytx doctor
```

Checks for yt-dlp, ffmpeg, aria2, config accessibility, and output directory writability.

## Runtime Configuration

Configuration is stored at:

```
$XDG_CONFIG_HOME/ytx-downloader/config.json
```

Falls back to `~/.config/ytx-downloader/config.json` if `XDG_CONFIG_HOME` is not set.

### Output Path Resolution

Output paths are resolved in this order:

1. `--output` CLI flag
2. `outputPath` from config
3. `~/Downloads` fallback

Paths are normalized (tilde expansion, relative-to-absolute) and validated (exists, writable, is directory). Invalid paths fall through to the next option automatically.

## Development

```bash
# Clone
git clone https://github.com/MuhammadAkbar11/ytx-ytdlp-media-toolkit.git
cd ytx-ytdlp-media-toolkit

# Install dependencies
bun install

# Run in dev mode
bun run dev

# Run with hot-reload
bun run dev:hot
```

### Testing

```bash
# Run all tests
bun test

# Run in watch mode
bun test --watch
```

### Linting and Formatting

```bash
bun run lint
bun run lint:fix
bun run format
bun run format:check
```

## License

[MIT](LICENSE)