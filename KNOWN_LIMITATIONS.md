# Known Limitations

## Platform Support

- **Linux only.** Windows and macOS are not supported. No plans to add cross-platform support.
- Requires Bun runtime (>= 1.0.0) — Node.js is not supported.

## Dependencies

- `yt-dlp` must be installed and on PATH. Version drift in yt-dlp can break download workflows.
- `ffmpeg` is required for all video merging and audio extraction. No built-in fallback.
- `aria2` is optional but recommended for faster downloads. Single-threaded fallback works without it.

## Browser Cookies

- Cookie extraction depends on the local browser installation and OS keychain access.
- Some browsers may require the browser to be closed before cookies can be read.
- Safari support is limited on Linux.

## Network and Content

- Geo-restricted content requires a VPN or proxy — ytx does not provide proxy configuration.
- Age-restricted content requires browser cookies to be configured.
- Private/members-only content requires authenticated cookies from the correct account.
- Download speed depends on YouTube throttling, network conditions, and yt-dlp extraction quality.

## Configuration

- Config file is JSON-based. Manual edits with invalid JSON will cause a reset to defaults.
- Migration is one-way — downgrading from v3 to v2 config format requires manual intervention.
- Config version is checked on every command invocation (minimal overhead).

## Output

- Output path validation checks existence, writability, and directory type at runtime.
- Invalid paths fall through silently to the next option in the resolution chain.
- No support for custom filename templates via CLI (uses yt-dlp defaults).

## Playlist

- Large playlists may take time to inspect (depends on yt-dlp metadata fetching).
- Fuzzy search is in-memory — very large playlists (1000+ items) may feel slow.

## General

- No telemetry, analytics, or phone-home behavior.
- No auto-update mechanism — updates require manual `git pull && bun install`.
- No plugin system or extension API.
