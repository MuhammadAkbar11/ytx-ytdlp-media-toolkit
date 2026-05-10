import chalk from 'chalk';
import { Logger } from '../types/logger';

export class ConsoleLogger implements Logger {
  debug(message: string): void {
    console.debug(`${chalk.gray('[DEBUG]')} ${message}`);
  }

  info(message: string): void {
    console.info(`${chalk.cyan('[INFO]')} ${message}`);
  }

  warn(message: string): void {
    console.warn(`${chalk.yellow('[WARN]')} ${message}`);
  }

  error(message: string): void {
    console.error(`${chalk.red('[ERROR]')} ${message}`);
  }
}
