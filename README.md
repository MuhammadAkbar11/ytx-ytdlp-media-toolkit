# ytx

A modern CLI tool for downloading YouTube videos using yt-dlp, built with Bun and TypeScript.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Download Videos](#download-videos)
  - [Manage Configuration](#manage-configuration)
  - [Use Presets](#use-presets)
  - [Run Diagnostics](#run-diagnostics)
- [Supported Platforms](#supported-platforms)
- [Prerequisites](#prerequisites)
- [Development](#development)
- [Testing](#testing)
- [License](#license)

## Features

- **Interactive CLI**: Guided workflow with prompts and confirmations for a seamless user experience.
- **Cookie Support**: Utilize browser cookies to download age-restricted or private videos.
- **Profile Management**: Save and reuse your favorite download settings as profiles for quick access.
- **Smart Configuration**: Automatically detects and suggests optimal format combinations for the best quality.
- **Progress Tracking**: Real-time updates on download progress and status.
- **Process Management**: Graceful handling of interrupted downloads, allowing for resume capabilities.
- **Doctor Command**: Built-in health checks for dependencies, configuration, and download directories to ensure smooth operation.
- **Flexible Download Options**: Support for various download scenarios including single videos, playlists, MP3 audio, MP4 video, and subtitles.
- **Archiving**: Keep track of downloaded videos to prevent re-downloading.

## Installation

Please refer to the [Linux Installation and Runtime Setup Guide](docs/installation.md) for detailed instructions on how to install `ytx` and its dependencies on various Linux distributions.

For a quick setup from the repository:

```bash
git clone https://github.com/your-repo/ytx.git
cd ytx
bun install
bun link
```

## Usage

### Download Videos

To download a video, simply run:

```bash
ytx download <URL>
```

The CLI will guide you through the available options.

### Manage Configuration

View and manage `ytx`'s configuration:

```bash
ytx config
```

### Use Presets

Save and use custom download presets:

```bash
ytx preset
```

### Run Diagnostics

Check your environment and dependencies:

```bash
ytx doctor
```

## Supported Platforms

- **Linux**: This tool is officially supported and optimized for Linux environments.

## Prerequisites

Before using `ytx`, ensure you have the following installed and available in your system's PATH:

- [Bun](https://bun.sh/): JavaScript runtime and package manager.
- `yt-dlp`: Command-line program to download videos from YouTube and other video sites.
- `ffmpeg`: A complete, cross-platform solution to record, convert and stream audio and video.

## Development

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/ytx.git
   cd ytx
   ```
2. Install dependencies:
   ```bash
   bun install
   ```
3. Run the application in development mode:
   ```bash
   bun run dev
   ```

## Testing

The project uses Bun's built-in test runner. Tests are organized into:

- `tests/unit/`: For unit tests of pure logic.
- `tests/integration/`: For tests that interact with external systems or infrastructure.

To run tests:

```bash
bun test
```

To run tests in watch mode:

```bash
bun test --watch
```

## License

MIT