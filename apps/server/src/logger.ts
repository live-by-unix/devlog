import fs from "node:fs";
import path from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export class Logger {
  private minLevel: number;
  private stream: fs.WriteStream | null = null;

  constructor(level: LogLevel = "info", logFile?: string) {
    this.minLevel = LEVELS[level] ?? LEVELS.info;
    if (logFile) {
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      this.stream = fs.createWriteStream(logFile, { flags: "a" });
    }
  }

  private write(level: LogLevel, msg: string, meta?: unknown) {
    if (LEVELS[level] < this.minLevel) return;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg,
      ...(meta !== undefined ? { meta } : {}),
    });
    // eslint-disable-next-line no-console
    console.log(line);
    this.stream?.write(line + "\n");
  }

  debug(msg: string, meta?: unknown) { this.write("debug", msg, meta); }
  info(msg: string, meta?: unknown) { this.write("info", msg, meta); }
  warn(msg: string, meta?: unknown) { this.write("warn", msg, meta); }
  error(msg: string, meta?: unknown) { this.write("error", msg, meta); }
}
