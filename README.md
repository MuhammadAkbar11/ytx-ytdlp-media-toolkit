# ytx

A modern, interactive CLI for downloading YouTube videos and audio using yt-dlp. Built with [Bun](https://bun.sh/) and TypeScript. **Linux only.**

## Features

- **Interactive guided workflow** — prompts for format, quality, subtitles, metadata, and more
- **MP4 video downloads** — with automatic audio/video merging via ffmpeg
- **MP3 audio extraction** — configurable bitrate (128/192/256/320 kbps)
- **Batch downloads** — download multiple videos via comma-separated URLs or from `.txt`/`.md` files
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

| Dependency                                 | Required | Purpose                             |
| ------------------------------------------ | -------- | ----------------------------------- |
| [Bun](https://bun.sh/)                     | Yes      | JavaScript runtime                  |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Yes      | Download engine                     |
| [ffmpeg](https://ffmpeg.org/)              | Yes      | Format merging and audio extraction |
| [aria2](https://aria2.github.io/)          | Optional | Faster multi-threaded downloads     |

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
ytx download <URL> --browser firefox/brave/chrome

# Dry-run — preview without downloading
ytx download <URL> --dry-run
```

### Batch Downloads

Download multiple videos in a single command:

```bash
# Comma-separated URLs
ytx download "https://youtu.be/aaa,https://youtu.be/bbb,https://youtu.be/ccc"

# From a text file
ytx download --file urls.txt

# From a markdown file
ytx download --file urls.md

# Batch with preset and output directory
ytx download --file urls.txt --preset balanced --output ~/Videos
```

- Playlist URLs are rejected in batch mode (use the playlist workflow instead)
- Duplicate URLs are automatically removed
- Downloads run sequentially, one at a time
- Files should contain one URL per line; markdown links (`[text](url)`) are also supported

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

| Priority | Source                    | Example                                    |
| -------- | ------------------------- | ------------------------------------------ |
| 1        | `--output <dir>` CLI flag | `ytx download <URL> --output ~/Videos`     |
| 2        | `outputPath` in config    | `ytx config set outputPath ~/Videos`       |
| 3        | `~/Downloads` fallback    | auto-applied if above are invalid or unset |

Paths are normalized (~ expansion → absolute) and validated (exists + writable + is directory). Invalid paths fall through silently to the next option.

## Workflows

### Playlist Downloads

When a playlist URL is detected, `ytx` offers three options:

```bash
ytx download https://youtube.com/playlist?list=PLxxxxxx
```

- **Entire playlist** — download all items
- **First item only** — download just the first video
- **Select specific items** — fuzzy search through playlist items with arrow keys

### Browser Cookies

Some content requires authentication (age-restricted, private, or members-only videos).

```bash
# Prompted to select browser interactively
ytx download <URL> --browser

# Pass browser directly
ytx download <URL> --browser firefox/brave/chrome

# Set a default browser in config
ytx config set preferredBrowser firefox
```

Supported browsers: `chrome`, `firefox`, `edge`, `brave`, `safari`.

### aria2 Downloader

Enable multi-threaded downloading via aria2 for faster speeds:

```bash
ytx download <URL> --aria2
```

Requires aria2 to be installed and on `PATH`.

### Non-Interactive Mode

When `ytx` detects it is not running in an interactive terminal (e.g., in scripts or CI):

- No interactive prompts are shown
- CLI flags and config values drive all decisions
- Output path uses `--output` flag → config `outputPath` → `~/Downloads` fallback
- Missing required values produce clear error messages instead of prompting

```bash
# Scripted audio-only download to specific directory
ytx download "https://youtube.com/watch?v=xxxxx" --audio --preset balanced --output /tmp/dl
```

### Config Migration

Config migration is **fully automatic** — no commands or manual steps required.

When you run any `ytx` command, the config file is loaded and its version is checked. If an older config version is detected, the migration chain runs before the command executes:

| Migration | What it does                                      |
| --------- | ------------------------------------------------- |
| v1 → v2   | Version bump (no data changes)                    |
| v2 → v3   | Renames the `outputDirectory` key to `outputPath` |

For example, if your config file still has the old `outputDirectory` field:

```json
{
  "version": 2,
  "outputDirectory": "/home/user/Downloads"
}
```

After migration it becomes:

```json
{
  "version": 3,
  "outputPath": "/home/user/Downloads"
}
```

A green console message appears when migration runs: `✔ Config migrated from v2 to v3`.

If a config file fails validation after migration (e.g., corrupted or missing required fields), `ytx` resets to defaults and prints the validation errors.

To check your current config, run:

```bash
ytx config list
```

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
