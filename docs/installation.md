# Linux Installation and Runtime Setup Guide

This guide provides instructions for setting up the `ytx` runtime environment on Linux.

## Prerequisites

The project officially targets **Linux-only** runtime support. Ensure you are running a modern Linux distribution.

### 1. Install Bun

`ytx` is built with Bun. Install it using the official script:

```bash
curl -fsSL https://bun.sh/install | bash
```

Restart your terminal or source your profile to make `bun` available in your PATH.

### 2. Install yt-dlp

`yt-dlp` is the core engine for downloading. We recommend installing it via your package manager or directly from the source to ensure you have the latest version.

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install yt-dlp
```
*Note: The version in apt might be outdated. If you encounter issues, install it via pip or direct download.*

**Arch Linux:**
```bash
sudo pacman -S yt-dlp
```

**Fedora:**
```bash
sudo dnf install yt-dlp
```

### 3. Install FFmpeg

FFmpeg is required for merging formats and extracting audio.

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**Arch Linux:**
```bash
sudo pacman -S ffmpeg
```

**Fedora:**
```bash
sudo dnf install ffmpeg
```

### 4. Install aria2 (Optional but Recommended)

`aria2` is used as an external downloader by `yt-dlp` for faster multi-threaded downloads.

**Ubuntu/Debian:**
```bash
sudo apt install aria2
```

**Arch Linux:**
```bash
sudo pacman -S aria2
```

**Fedora:**
```bash
sudo dnf install aria2
```

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/yt-downloader.git
cd yt-downloader
```

### 2. Install Node Dependencies

```bash
bun install
```

### 3. Link the CLI

To use the `ytx` command globally:

```bash
bun link
```

Ensure that Bun's global bin directory is in your PATH. Usually, it is `~/.bun/bin`.
Add this to your `~/.bashrc` or `~/.zshrc` if not present:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

## Verification

Verify that everything is installed correctly:

```bash
ytx --help
```

You can also use the built-in doctor command to check dependencies:
```bash
ytx doctor
```

## Troubleshooting

### PATH Issues
If the `ytx` command is not found after `bun link`, ensure `~/.bun/bin` is in your PATH.

### Missing Dependencies
If `ytx` warns about missing `yt-dlp` or `ffmpeg`, ensure they are installed and executable from your terminal.

### Browser Cookies
For downloading age-restricted or private videos, you may need to pass cookies from your browser. Ensure your browser is supported (Chrome, Firefox, Edge, Brave, Safari) and use the `--browser` flag or configure it in settings.
