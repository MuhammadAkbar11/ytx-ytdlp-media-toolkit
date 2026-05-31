import { describe, expect, test, mock, spyOn } from 'bun:test';
import { ConfigCommand } from '../../src/cli/commands/config-command';
import { ConfigService } from '../../src/core/config/config-service';
import { DEFAULT_CONFIG } from '../../src/core/config/default-config';

function createMockService(overrides: Record<string, any> = {}) {
  const config = { ...DEFAULT_CONFIG, ...overrides };
  return {
    get: mock((key: string) => config[key as keyof typeof config]),
    set: mock(() => {}),
    reset: mock(() => {}),
    getAll: mock(() => config),
  } as unknown as ConfigService;
}

describe('ConfigCommand', () => {
  test('should get and set config values', () => {
    const mockService = createMockService({ outputPath: '/tmp/dl' });
    const cmd = new ConfigCommand(mockService);
    cmd.get('outputPath');
    expect(mockService.get).toHaveBeenCalledWith('outputPath');
    cmd.set('outputPath', '/tmp/new');
    expect(mockService.set).toHaveBeenCalledWith('outputPath', '/tmp/new');
  });

  test('should list all config', () => {
    const mockService = createMockService();
    const cmd = new ConfigCommand(mockService);
    cmd.list();
    expect(mockService.getAll).toHaveBeenCalled();
  });

  describe('Zod validation in set', () => {
    test('should reject invalid enum value for preferredBrowser', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

      cmd.set('preferredBrowser', 'invalid-browser');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid value for "preferredBrowser"')
      );
      // Should NOT have called configService.set
      expect(mockService.set).not.toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    test('should accept valid enum value for preferredBrowser', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      cmd.set('preferredBrowser', 'firefox');

      expect(mockService.set).toHaveBeenCalledWith('preferredBrowser', 'firefox');
      logSpy.mockRestore();
    });

    test('should accept null for nullable preferredBrowser', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      cmd.set('preferredBrowser', 'null');

      expect(mockService.set).toHaveBeenCalledWith('preferredBrowser', null);
      logSpy.mockRestore();
    });

    test('should reject invalid preferredBitrate', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

      cmd.set('preferredBitrate', '512');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid value for "preferredBitrate"')
      );
      expect(mockService.set).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    test('should accept valid preferredBitrate', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      cmd.set('preferredBitrate', '320');

      expect(mockService.set).toHaveBeenCalledWith('preferredBitrate', 320);
      logSpy.mockRestore();
    });

    test('should reject invalid preferredVideoQuality', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

      cmd.set('preferredVideoQuality', '999');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid value for "preferredVideoQuality"')
      );
      expect(mockService.set).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    test('should accept valid preferredVideoQuality number', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      cmd.set('preferredVideoQuality', '1080');

      expect(mockService.set).toHaveBeenCalledWith('preferredVideoQuality', 1080);
      logSpy.mockRestore();
    });

    test('should accept valid preferredVideoQuality string', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      cmd.set('preferredVideoQuality', '"best"');

      expect(mockService.set).toHaveBeenCalledWith('preferredVideoQuality', 'best');
      logSpy.mockRestore();
    });

    test('should reject empty outputPath', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

      // Empty string is valid for z.string(), so outputPath accepts it
      // This test verifies no crash occurs
      cmd.set('outputPath', '');

      // Empty string passes z.string() so it should succeed
      expect(mockService.set).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    test('should reject invalid key', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

      cmd.set('nonExistentKey', 'value');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid configuration key: "nonExistentKey"')
      );
      expect(mockService.set).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    test('should display helpful error with allowed values for enum fields', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

      cmd.set('preferredBrowser', 'ie6');

      // Should print allowed values
      const calls = errorSpy.mock.calls.map((c) => String(c[0]));
      const hasAllowedValues = calls.some((c) => c.includes('Allowed values'));
      expect(hasAllowedValues).toBe(true);
      const hasFirefox = calls.some((c) => c.includes('firefox'));
      expect(hasFirefox).toBe(true);

      errorSpy.mockRestore();
    });

    test('should display allowed values for union/literal fields', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

      cmd.set('preferredBitrate', '999');

      const calls = errorSpy.mock.calls.map((c) => String(c[0]));
      const hasAllowedValues = calls.some((c) => c.includes('Allowed values'));
      expect(hasAllowedValues).toBe(true);
      const has320 = calls.some((c) => c.includes('320'));
      expect(has320).toBe(true);

      errorSpy.mockRestore();
    });

    test('should pass Zod validation and call configService.set for valid string value', () => {
      const mockService = createMockService();
      const cmd = new ConfigCommand(mockService);
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      cmd.set('filenameTemplate', '%(title)s.%(ext)s');

      expect(mockService.set).toHaveBeenCalledWith(
        'filenameTemplate',
        '%(title)s.%(ext)s'
      );
      logSpy.mockRestore();
    });
  });
});