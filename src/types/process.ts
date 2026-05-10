export interface ProcessSpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
}

export interface ProcessExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}
