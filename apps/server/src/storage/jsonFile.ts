import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

/**
 * A JSON-file-backed store with:
 *  - atomic writes (tmp file + rename)
 *  - per-store write serialization (no concurrent write corruption)
 *  - corruption detection with .bak fallback — never silently overwrites bad data
 *  - graceful handling of missing files
 */
export class JsonFile<T> {
  private data: T;
  private queue: Promise<unknown> = Promise.resolve();
  private dirty = false;

  constructor(
    private filePath: string,
    private initial: T,
    private validate?: (raw: unknown) => T,
  ) {
    this.data = this.load();
  }

  private load(): T {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      return structuredClone(this.initial);
    }
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      return this.validate ? this.validate(parsed) : (parsed as T);
    } catch (err) {
      // Corruption detected — try the .bak sibling before giving up.
      const bak = this.filePath + ".bak";
      if (fs.existsSync(bak)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(bak, "utf8"));
          return this.validate ? this.validate(parsed) : (parsed as T);
        } catch {
          /* fall through */
        }
      }
      throw new Error(`Corrupted data file ${this.filePath}: ${(err as Error).message}. Refusing to overwrite; restore from backup or delete data/ to reset.`);
    }
  }

  get(): T {
    return this.data;
  }

  /** Mutate in place, then persist atomically. Serialized per store. */
  update(fn: (data: T) => T | void): Promise<void> {
    const run = async () => {
      const result = fn(this.data);
      if (result !== undefined) this.data = result;
      await this.persist();
    };
    this.queue = this.queue.then(run, run);
    return this.queue as Promise<void>;
  }

  /** Synchronous read-modify-write for callers that already serialized externally. */
  mutate(fn: (data: T) => T | void): void {
    const result = fn(this.data);
    if (result !== undefined) this.data = result;
    this.persistSync();
  }

  private async persist(): Promise<void> {
    const tmp = this.filePath + ".tmp";
    await fsp.writeFile(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    // Keep previous good copy as .bak before rename
    if (fs.existsSync(this.filePath)) {
      await fsp.copyFile(this.filePath, this.filePath + ".bak").catch(() => {});
    }
    await fsp.rename(tmp, this.filePath);
    this.dirty = false;
  }

  private persistSync(): void {
    const tmp = this.filePath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    if (fs.existsSync(this.filePath)) {
      try { fs.copyFileSync(this.filePath, this.filePath + ".bak"); } catch { /* ignore */ }
    }
    fs.renameSync(tmp, this.filePath);
    this.dirty = false;
  }

  flush(): Promise<void> {
    return this.queue as Promise<void>;
  }
}
