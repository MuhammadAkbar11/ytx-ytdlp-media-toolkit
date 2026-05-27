import { describe, expect, test, mock } from 'bun:test';
import { ConfigCommand } from '../../src/cli/commands/config-command';
import { ConfigService } from '../../src/core/config/config.service';

describe('ConfigCommand', () => {
  test('should get and set config values', () => {
    const mockService = {
      get: mock((key: string) =>
        key === 'outputPath' ? '/tmp/dl' : undefined
      ),
      set: mock(() => {}),
      reset: mock(() => {}),
      getAll: mock(() => ({ version: 3, outputPath: '/tmp/dl' })),
    } as unknown as ConfigService;
    const cmd = new ConfigCommand(mockService);
    cmd.get('outputPath');
    expect(mockService.get).toHaveBeenCalledWith('outputPath');
    cmd.set('outputPath', '/tmp/new');
    expect(mockService.set).toHaveBeenCalledWith('outputPath', '/tmp/new');
  });

  test('should list all config', () => {
    const mockService = {
      get: mock(() => {}),
      set: mock(() => {}),
      reset: mock(() => {}),
      getAll: mock(() => ({ version: 3, outputPath: '/tmp/dl' })),
    } as unknown as ConfigService;
    const cmd = new ConfigCommand(mockService);
    cmd.list();
    expect(mockService.getAll).toHaveBeenCalled();
  });
});
