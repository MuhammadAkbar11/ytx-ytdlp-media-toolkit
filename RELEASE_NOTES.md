# Release Notes

## v0.1.0 — Initial Release

First public release of `ytx`, a modern interactive CLI for downloading YouTube videos and audio using yt-dlp.

### Highlights

- **Interactive workflow** — guided prompts for format, quality, subtitles, metadata, and more
- **MP4 and MP3** — video downloads with ffmpeg merging, audio extraction with configurable bitrate
- **Playlist support** — download all, first item, or fuzzy-search and select specific items
- **Browser cookies** — access age-restricted or private content using cookies from Chrome, Firefox, Edge, Brave, or Safari
- **Presets** — save and reuse download configurations
- **aria2** — optional multi-threaded downloading for faster speeds
- **Doctor command** — diagnose environment issues with `ytx doctor`
- **XDG config** — standard Linux config location with automatic migration
- **Non-interactive mode** — works in scripts and CI environments

### Requirements

- Linux (only)
- Bun >= 1.0.0
- yt-dlp
- ffmpeg
- aria2 (optional)

### Installation

```bash
curl -fsSL https://bun.sh/install | bash
git clone https://github.com/MuhammadAkbar11/ytx-ytdlp-media-toolkit.git
cd ytx-ytdlp-media-toolkit
bun install
bun link
ytx --help
```

See the [Linux Installation Guide](docs/installation.md) for per-distribution instructions.

### What's Next

Future releases will focus on:
- Additional output format support
- Enhanced error recovery
- Expanded preset library
- Community feedback and bug fixes
