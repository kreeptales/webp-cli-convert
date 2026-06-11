type KeyHandler = (key: string) => void;

export class RawModeSession {
  private handlers: Set<KeyHandler> = new Set();
  private active = false;
  private boundOnData: ((chunk: string) => void) | null = null;
  private boundCleanup: (() => void) | null = null;

  async run<T>(fn: (session: RawModeSession) => Promise<T>): Promise<T> {
    this.start();
    try {
      return await fn(this);
    } finally {
      this.stop();
    }
  }

  private start(): void {
    if (this.active) return;

    process.stdout.write("\x1b[?1049h"); // enter alternate screen
    process.stdout.write("\x1b[?25l"); // hide cursor

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (chunk: string) => {
      for (const handler of this.handlers) {
        handler(chunk);
      }
    };

    this.boundOnData = onData;
    process.stdin.on("data", onData);

    const cleanup = () => this.stop();
    this.boundCleanup = cleanup;

    process.once("SIGINT", cleanup);
    process.once("SIGTERM", cleanup);
    process.once("exit", cleanup);
    process.once("uncaughtException", (err) => {
      this.stop();
      throw err;
    });

    this.active = true;
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;

    if (this.boundOnData) {
      process.stdin.removeListener("data", this.boundOnData);
      this.boundOnData = null;
    }

    if (this.boundCleanup) {
      process.removeListener("SIGINT", this.boundCleanup);
      process.removeListener("SIGTERM", this.boundCleanup);
      process.removeListener("exit", this.boundCleanup);
      this.boundCleanup = null;
    }

    try {
      process.stdin.setRawMode(false);
    } catch {
      // not a TTY — ignore
    }
    process.stdin.pause();

    process.stdout.write("\x1b[?25h"); // show cursor
    process.stdout.write("\x1b[?1049l"); // leave alternate screen
  }

  onKey(handler: KeyHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /** Wait for a single key press. */
  waitKey(): Promise<string> {
    return new Promise((resolve) => {
      const off = this.onKey((key) => {
        off();
        resolve(key);
      });
    });
  }

  /** Clear screen and move cursor to top-left (main screen variant for alternate buffer). */
  clear(): void {
    process.stdout.write("\x1b[2J\x1b[H");
  }
}
