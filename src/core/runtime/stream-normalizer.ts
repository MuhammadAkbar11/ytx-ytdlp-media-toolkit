export class StreamNormalizer {
  private buffer: string = '';

  /**
   * Processes a chunk of raw string data and yields complete logical lines.
   * Handles \r, \n, and \r\n boundaries.
   *
   * @param chunk The raw string chunk from the subprocess
   * @returns An array of normalized, complete runtime lines
   */
  processChunk(chunk: string): string[] {
    this.buffer += chunk;

    // Split on \r\n, \n, or \r
    const lines = this.buffer.split(/\r\n|\n|\r/);

    // The last element is either an incomplete line or an empty string
    // if the chunk ended with a newline character.
    this.buffer = lines.pop() || '';

    // Return all lines that are completed in this chunk
    return lines;
  }

  /**
   * Flushes any remaining data in the buffer as a final line.
   * Should be called when the stream is closed.
   *
   * @returns An array containing the final line if the buffer is not empty, otherwise an empty array.
   */
  flush(): string[] {
    if (this.buffer) {
      const finalLine = this.buffer;
      this.buffer = '';
      return [finalLine];
    }
    return [];
  }
}
