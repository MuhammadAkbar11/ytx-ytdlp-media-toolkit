# Linux Installation Guide

This guide covers installing `ytx` and its dependencies on Linux.

`ytx` is **Linux-only** by design.

## 1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

Restart your terminal or run `source ~/.bashrc` (or `source ~/.zshrc`) to add Bun to your PATH.

Verify:

```bash
bun --version
```

## 2. Install yt-dlp

`yt-dlp` is the download engine. Install via your package manager or pip.

### Package Manager (recommended)

**Debian / Ubuntu:**

```bash
sudo apt update && sudo apt install yt-dlp
```

**Fedora:**

```bash
sudo dnf install yt-dlp
```

**Arch Linux:**

```bash
sudo pacman -S yt-dlp
```

### pip (if packaged version is outdated)

```bash
pip install --upgrade yt-dlp
```

### Standalone Binary

```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

Verify:

```bash
yt-dlp --version
```

## 3. Install ffmpeg

Required for merging video/audio streams and extracting audio.

**Debian / Ubuntu:**

```bash
sudo apt install ffmpeg
```

**Fedora:**

```bash
sudo dnf install ffmpeg
```

**Arch Linux:**

```bash
sudo pacman -S ffmpeg
```

Verify:

```bash
ffmpeg -version
```

## 4. Install aria2 (optional)

Enables faster multi-threaded downloads when enabled via config or CLI flag.

**Debian / Ubuntu:**

```bash
sudo apt install aria2
```

**Fedora:**

```bash
sudo dnf install aria2
```

**Arch Linux:**

```bash
sudo pacman -S aria2
```

Verify:

```bash
aria2c --version
```

## 5. Install ytx

```bash
git clone https://github.com/MuhammadAkbar11/ytx-ytdlp-media-toolkit.git
cd ytx-ytdlp-media-toolkit
bun install
bun link
```

Ensure `~/.bun/bin` is in your PATH:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

Add the line to `~/.bashrc` or `~/.zshrc` to make it permanent.

## 6. Verify Installation

```bash
ytx --help
ytx doctor
```

`ytx doctor` checks for yt-dlp, ffmpeg, aria2, config accessibility, and output directory writability.

## Runtime Configuration

Configuration is stored at:

```
$XDG_CONFIG_HOME/ytx-downloader/config.json
```

Falls back to `~/.config/ytx-downloader/config.json` if `XDG_CONFIG_HOME` is not set.

### Output Path Resolution

The output directory for downloads is resolved in this order:

1. `--output <path>` CLI flag
2. `outputPath` value from config file
3. `~/Downloads` fallback

Invalid paths (non-existent, not writable, not a directory) are skipped automatically and the next option is tried.

## Troubleshooting

### `ytx` command not found

Ensure `~/.bun/bin` is in your PATH:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

### Missing dependencies

Run `ytx doctor` to identify which dependencies are missing or not on PATH.

### Browser cookies not working

Some content requires authentication. Pass browser cookies explicitly:

```bash
ytx download <URL> --browser firefox
```

Supported browsers: chrome, firefox, edge, brave, safari.

### yt-dlp errors

Update yt-dlp to the latest version:

```bash
yt-dlp --update
```

Or via pip:

```bash
pip install --upgrade yt-dlp
```
