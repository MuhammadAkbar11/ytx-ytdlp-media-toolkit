import { describe, expect, test, mock } from 'bun:test';
import { ProcessLifecycleManager } from '../../src/infrastructure/process/process-lifecycle';

describe('ProcessLifecycleManager', () => {
  test('should register and kill processes', () => {
    const manager = new ProcessLifecycleManager();
    const mockProcess = { kill: mock() };
    
    manager.register(mockProcess);
    manager.killAll();
    
    expect(mockProcess.kill).toHaveBeenCalled();
  });

  test('should not kill unregistered processes', () => {
    const manager = new ProcessLifecycleManager();
    const mockProcess = { kill: mock() };
    
    manager.register(mockProcess);
    manager.unregister(mockProcess);
    manager.killAll();
    
    expect(mockProcess.kill).not.toHaveBeenCalled();
  });

  test('should handle errors during kill gracefully', () => {
    const manager = new ProcessLifecycleManager();
    const mockProcess = { 
      kill: mock(() => { throw new Error('Already dead'); }) 
    };
    
    manager.register(mockProcess);
    
    // Should not throw
    expect(() => manager.killAll()).not.toThrow();
    expect(mockProcess.kill).toHaveBeenCalled();
  });
});
