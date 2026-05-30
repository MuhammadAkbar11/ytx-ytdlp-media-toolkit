import cfonts from 'cfonts';
import chalk from 'chalk';

const BANNER_TEXT = '  YTX  ';
const SUBTITLE = 'yt-dlp toolkit';
const LEFT_MARGIN = 16;

/**
 * Render a branded startup banner for interactive workflows.
 *
 * Displays a large ASCII "YTX" title left-aligned with margin,
 * and a subtitle below. Designed to be called once at the start
 * of interactive sessions.
 *
 * The banner is purely a presentation layer — it has no effect on
 * runtime behavior, download workflows, or renderer lifecycle.
 */
export function renderCliBanner(): void {
  const bannerOutput = cfonts.render(BANNER_TEXT, {
    font: 'block',
    align: 'left',
    colors: ['system'],
    background: 'transparent',
    letterSpacing: 1,
    lineHeight: 1,
    space: false,
    maxLength: 0,
  });

  const bannerString =
    typeof bannerOutput === 'string'
      ? bannerOutput
      : ((bannerOutput as any)?.string ?? '');
  const bannerLines = bannerString
    .split('\n')
    .filter(
      (line: string, i: number, arr: string[]) =>
        !(i === arr.length - 1 && line.trim() === '')
    );
  const output = bannerLines.join('\n');

  console.log(output);

  const margin = ' '.repeat(LEFT_MARGIN);
  console.log(margin + chalk.dim(SUBTITLE));
  console.log();
  const termWidth = process.stdout.columns || 80;
  console.log(chalk.dim('─'.repeat(termWidth)));
}
