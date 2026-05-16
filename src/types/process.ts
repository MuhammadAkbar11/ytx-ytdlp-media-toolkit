export interface ProcessSpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
  bufferStdout?: boolean;
  bufferStderr?: boolean;
}

export interface ProcessExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}
