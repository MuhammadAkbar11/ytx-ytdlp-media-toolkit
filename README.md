# ytx

A modern CLI tool for downloading YouTube videos using yt-dlp, built with Bun and TypeScript.

## Features

- **Interactive CLI**: Guided workflow with prompts and confirmations
- **Cookie Support**: Use cookies from your browser for age-restricted or private videos
- **Profile Management**: Save and reuse your favorite download settings
- **Smart Configuration**: Auto-detects optimal format combinations
- **Progress Tracking**: Real-time download progress and status
- **Process Management**: Graceful handling of interrupted downloads
- **Doctor Command**: Health checks for dependencies and configuration

## Prerequisites

- [Bun](https://bun.sh/)
- `yt-dlp` (must be available on PATH)
- `ffmpeg` (must be available on PATH)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Run the application in development mode:
   ```bash
   bun run dev
   ```

## Scripts

- `bun run dev`: Run the application from source.
- `bun run build`: Compile TypeScript to JavaScript.
- `bun run start`: Run the compiled application.
- `bun test`: Run tests using Bun's test runner.
- `bun test --watch`: Run tests in watch mode.

## Testing

The project uses Bun's built-in test runner. Tests are organized into:
- `tests/unit/`: For unit tests of pure logic.
- `tests/integration/`: For tests that interact with external systems or infrastructure.

To run tests:
```bash
bun test
```

## License

MIT
