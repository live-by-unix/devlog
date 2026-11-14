import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JsonFile } from "../src/storage/jsonFile.js";
import { z } from "zod";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "devlog-store-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("JsonFile", () => {
  it("creates missing files with initial value", async () => {
    const store = new JsonFile<number[]>(path.join(dir, "nums.json"), []);
    await store.update((d) => { d.push(1, 2, 3); });
    expect(fs.existsSync(path.join(dir, "nums.json"))).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(dir, "nums.json"), "utf8"))).toEqual([1, 2, 3]);
  });

  it("persists and reloads data", async () => {
    const file = path.join(dir, "nums.json");
    const s1 = new JsonFile<number[]>(file, []);
    await s1.update((d) => { d.push(42); });
    const s2 = new JsonFile<number[]>(file, []);
    expect(s2.get()).toEqual([42]);
  });

  it("keeps a .bak copy of the previous version", async () => {
    const file = path.join(dir, "nums.json");
    const s = new JsonFile<number[]>(file, []);
    await s.update((d) => { d.push(1); });
    await s.update((d) => { d.push(2); });
    expect(fs.existsSync(file + ".bak")).toBe(true);
    expect(JSON.parse(fs.readFileSync(file + ".bak", "utf8"))).toEqual([1]);
  });

  it("serializes concurrent writes", async () => {
    const file = path.join(dir, "nums.json");
    const s = new JsonFile<number[]>(file, []);
    await Promise.all(Array.from({ length: 20 }, (_, i) =>
      s.update((d) => { d.push(i); })),
    );
    const reloaded = new JsonFile<number[]>(file, []);
    expect(reloaded.get().length).toBe(20);
    expect(new Set(reloaded.get()).size).toBe(20);
  });

  it("recovers from .bak when main file is corrupted", async () => {
    const file = path.join(dir, "nums.json");
    const s = new JsonFile<number[]>(file, []);
    await s.update((d) => { d.push(7); });
    await s.update((d) => { d.push(8); });
    fs.writeFileSync(file, "{corrupt!!!");
    const s2 = new JsonFile<number[]>(file, []);
    expect(s2.get()).toEqual([7]);
  });

  it("throws on corruption when no backup exists", () => {
    const file = path.join(dir, "nums.json");
    fs.writeFileSync(file, "not json");
    expect(() => new JsonFile(file, [])).toThrow(/Corrupted data file/);
  });

  it("validates schema on load", () => {
    const file = path.join(dir, "item.json");
    fs.writeFileSync(file, JSON.stringify({ name: "ok" }));
    const schema = z.object({ name: z.string(), count: z.number().default(0) });
    const s = new JsonFile(file, { name: "", count: 0 }, (raw) => schema.parse(raw));
    expect(s.get()).toEqual({ name: "ok", count: 0 });
  });
});
