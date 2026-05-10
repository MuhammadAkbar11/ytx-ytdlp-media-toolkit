import { ConsoleLogger } from './utils/logger';
import { ConfigService } from './core/config/config.service';
import { BunProcessRunner } from './infrastructure/process/bun-process-runner';

/**
 * Composition Root
 *
 * This function instantiates and wires together the application's services.
 * It follows the constructor injection pattern recommended in the architecture guidelines.
 */
export function bootstrap() {
  const logger = new ConsoleLogger();

  const configService = new ConfigService();

  const processRunner = new BunProcessRunner();

  logger.info('Application services initialized');

  return {
    logger,
    configService,
    processRunner,
  };
}
