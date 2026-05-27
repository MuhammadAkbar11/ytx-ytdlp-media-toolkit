import { describe, expect, test, mock } from 'bun:test';
import { ProcessLifecycleManager } from '../../src/infrastructure/process/process-lifecycle';

describe('ProcessLifecycleManager', () => {
  test('should register and kill processes, handle unregister and errors', () => {
    const manager = new ProcessLifecycleManager();
    const mockA = { kill: mock() };
    const mockB = {
      kill: mock(() => {
        throw new Error('dead');
      }),
    };

    manager.register(mockA);
    manager.register(mockB);
    manager.unregister(mockB);
    manager.killAll();

    expect(mockA.kill).toHaveBeenCalled();
    expect(mockB.kill).not.toHaveBeenCalled();
  });
});
