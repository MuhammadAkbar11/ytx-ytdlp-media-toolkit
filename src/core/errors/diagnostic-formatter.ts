import chalk from 'chalk';
import { ClassifiedFailure } from './failure-classifier';

export class DiagnosticFormatter {
  formatFailure(failure: ClassifiedFailure, verbose = false): string {
    const lines: string[] = [];

    lines.push(chalk.red(`✘ ${failure.summary}`));

    if (failure.recovery) {
      lines.push('');
      lines.push(chalk.yellow(failure.recovery));
    }

    if (verbose && failure.rawDetail) {
      lines.push('');
      lines.push(chalk.gray('--- Raw output ---'));
      lines.push(chalk.gray(failure.rawDetail));
      lines.push(chalk.gray('------------------'));
    }

    return lines.join('\n');
  }

  formatWarning(message: string): string {
    return chalk.yellow(`⚠ ${message}`);
  }

  formatInfo(message: string): string {
    return chalk.blue(`➤ ${message}`);
  }

  formatSuccess(message: string): string {
    return chalk.green(`✔ ${message}`);
  }
}
