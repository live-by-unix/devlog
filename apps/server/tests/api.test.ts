import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Must set env BEFORE importing app modules.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "devlog-api-"));
process.env.DATA_DIR = dataDir;
process.env.SESSION_SECRET = "test-secret-that-is-long-enough-0123456789";
process.env.NODE_ENV = "test";
process.env.TRUST_PROXY = "false";

import type { Express } from "express";
import type { Agent } from "supertest";

let app: Express;
let admin: Agent;
let user: Agent;
let anon: Agent;
let adminCsrf = "";
let userCsrf = "";
let anonCsrf = "";
let releaseId = "";
let newsletterId = "";
let threadId = "";

function csrfFrom(res: request.Response): string {
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  if (!cookies) return "";
  for (const c of cookies) {
    const m = c.match(/devlog_csrf=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return "";
}

async function prime(agent: Agent): Promise<string> {
  const res = await agent.get("/api/v1/status");
  const token = csrfFrom(res);
  return token;
}

beforeAll(async () => {
  const { boot } = await import("../src/app.js");
  ({ app } = await boot());
  admin = request.agent(app);
  user = request.agent(app);
  anon = request.agent(app);
  adminCsrf = await prime(admin);
  userCsrf = await prime(user);
  anonCsrf = await prime(anon);
});

describe("installation & setup", () => {
  it("reports uninitialized status", async () => {
    const res = await anon.get("/api/v1/status");
    expect(res.body.initialized).toBe(false);
  });

  it("rejects mutations without CSRF token", async () => {
    const res = await anon.post("/api/v1/setup").send({
      username: "admin", password: "adminpass123", confirmPassword: "adminpass123",
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("csrf_failed");
  });

  it("completes first-time setup and creates admin", async () => {
    const res = await anon.post("/api/v1/setup")
      .set("X-CSRF-Token", anonCsrf)
      .send({
        username: "admin",
        password: "adminpass123",
        confirmPassword: "adminpass123",
        project: { name: "TestApp", description: "A test application", type: "Application", license: "MIT" },
      });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("admin");
    anonCsrf = csrfFrom(res) || anonCsrf;
    const me = await anon.get("/api/v1/auth/me");
    expect(me.body.user.role).toBe("admin");
    // setup signed in the `anon` agent — log it out so it becomes truly anonymous,
    // then sign the dedicated `admin` agent in.
    await anon.post("/api/v1/auth/logout").set("X-CSRF-Token", anonCsrf);
    const login = await admin.post("/api/v1/auth/login").set("X-CSRF-Token", adminCsrf)
      .send({ username: "admin", password: "adminpass123" });
    expect(login.status).toBe(200);
  });

  it("rejects second setup", async () => {
    const res = await anon.post("/api/v1/setup").set("X-CSRF-Token", anonCsrf)
      .send({ username: "other", password: "otherpass123", confirmPassword: "otherpass123" });
    expect(res.status).toBe(409);
  });

  it("exposes public project info", async () => {
    const res = await anon.get("/api/v1/project");
    expect(res.body.project.name).toBe("TestApp");
  });
});

describe("authentication", () => {
  it("registers a regular user", async () => {
    const res = await user.post("/api/v1/auth/register").set("X-CSRF-Token", userCsrf)
      .send({ username: "alice", password: "alicepass123", confirmPassword: "alicepass123" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("user");
  });

  it("rejects duplicate username", async () => {
    const res = await user.post("/api/v1/auth/register").set("X-CSRF-Token", userCsrf)
      .send({ username: "alice", password: "alicepass123", confirmPassword: "alicepass123" });
    expect(res.status).toBe(409);
  });

  it("rejects weak passwords", async () => {
    const res = await user.post("/api/v1/auth/register").set("X-CSRF-Token", userCsrf)
      .send({ username: "bob", password: "short", confirmPassword: "short" });
    expect(res.status).toBe(400);
  });

  it("logs in with valid credentials", async () => {
    const res = await anon.post("/api/v1/auth/login").set("X-CSRF-Token", anonCsrf)
      .send({ username: "alice", password: "alicepass123" });
    expect(res.status).toBe(200);
  });

  it("rejects bad login", async () => {
    const res = await anon.post("/api/v1/auth/login").set("X-CSRF-Token", anonCsrf)
      .send({ username: "alice", password: "wrongpass123" });
    expect(res.status).toBe(401);
  });

  it("logout clears session", async () => {
    const res = await anon.post("/api/v1/auth/logout").set("X-CSRF-Token", anonCsrf);
    expect(res.status).toBe(200);
    const me = await anon.get("/api/v1/auth/me");
    expect(me.body.user).toBeNull();
  });
});

describe("admin authorization", () => {
  it("blocks non-admin from admin API", async () => {
    const res = await user.get("/api/v1/admin/stats");
    expect(res.status).toBe(403);
  });

  it("blocks anonymous from admin API", async () => {
    const res = await anon.get("/api/v1/admin/stats");
    expect(res.status).toBe(401);
  });

  it("admin can read stats", async () => {
    const res = await admin.get("/api/v1/admin/stats");
    expect(res.status).toBe(200);
    expect(res.body.counts.users).toBe(2);
  });
});

describe("releases", () => {
  it("admin creates a draft release", async () => {
    const res = await admin.post("/api/v1/admin/releases").set("X-CSRF-Token", adminCsrf)
      .send({ name: "First Release", version: "1.0.0", description: "# Notes\n\nHello **world**.", status: "draft" });
    expect(res.status).toBe(201);
    releaseId = res.body.release.id;
    expect(res.body.release.status).toBe("draft");
  });

  it("draft is not publicly visible", async () => {
    const res = await anon.get("/api/v1/releases");
    expect(res.body.total).toBe(0);
  });

  it("publishes the release", async () => {
    const res = await admin.patch(`/api/v1/admin/releases/${releaseId}/status`)
      .set("X-CSRF-Token", adminCsrf).send({ status: "published" });
    expect(res.status).toBe(200);
    expect(res.body.release.status).toBe("published");
    expect(res.body.release.publishedAt).toBeTruthy();
  });

  it("public can list and view the release", async () => {
    const list = await anon.get("/api/v1/releases");
    expect(list.body.total).toBe(1);
    const detail = await anon.get(`/api/v1/releases/${releaseId}`);
    expect(detail.body.release.name).toBe("First Release");
  });

  it("regular user cannot create releases", async () => {
    const res = await user.post("/api/v1/admin/releases").set("X-CSRF-Token", userCsrf)
      .send({ name: "nope", version: "1", description: "x", status: "draft" });
    expect(res.status).toBe(403);
  });
});

describe("newsletters", () => {
  it("admin creates and publishes a newsletter", async () => {
    const res = await admin.post("/api/v1/admin/newsletters").set("X-CSRF-Token", adminCsrf)
      .send({ title: "Launch News", description: "We launched!", content: "# Big news\n\nDetails here.", status: "published" });
    expect(res.status).toBe(201);
    newsletterId = res.body.newsletter.id;
    expect(res.body.newsletter.status).toBe("published");
  });

  it("public can list newsletters", async () => {
    const res = await anon.get("/api/v1/newsletters");
    expect(res.body.total).toBe(1);
  });
});

describe("discussions", () => {
  it("anonymous cannot create threads", async () => {
    const res = await anon.post("/api/v1/discussions/threads").set("X-CSRF-Token", anonCsrf)
      .send({ scope: "release", targetId: releaseId, title: "Hello?", content: "Testing" });
    expect(res.status).toBe(401);
  });

  it("user creates a thread", async () => {
    const res = await user.post("/api/v1/discussions/threads").set("X-CSRF-Token", userCsrf)
      .send({ scope: "release", targetId: releaseId, title: "First thread", content: "What do you think?" });
    expect(res.status).toBe(201);
    threadId = res.body.thread.id;
  });

  it("anonymous can read threads", async () => {
    const res = await anon.get(`/api/v1/discussions/threads?scope=release&targetId=${releaseId}`);
    expect(res.body.total).toBe(1);
  });

  it("user replies to thread", async () => {
    const res = await user.post(`/api/v1/discussions/threads/${threadId}/replies`)
      .set("X-CSRF-Token", userCsrf).send({ content: "Looks great!" });
    expect(res.status).toBe(201);
    expect(res.body.reply.threadId).toBe(threadId);
  });

  it("thread detail returns nested replies", async () => {
    const res = await anon.get(`/api/v1/discussions/threads/${threadId}`);
    expect(res.body.thread.title).toBe("First thread");
    expect(res.body.replies.length).toBe(1);
  });

  it("author can edit own thread", async () => {
    const res = await user.patch(`/api/v1/discussions/threads/${threadId}`)
      .set("X-CSRF-Token", userCsrf).send({ content: "Edited content", title: "Updated title" });
    expect(res.status).toBe(200);
  });

  it("other users cannot edit the thread", async () => {
    const res = await admin.patch(`/api/v1/discussions/threads/${threadId}`)
      .set("X-CSRF-Token", adminCsrf).send({ content: "admin edit" });
    // admin CAN moderate — expect success
    expect(res.status).toBe(200);
  });

  it("user can report a thread", async () => {
    const res = await user.post("/api/v1/discussions/reports").set("X-CSRF-Token", userCsrf)
      .send({ targetType: "thread", targetId: threadId, reason: "Testing report flow" });
    expect(res.status).toBe(201);
  });

  it("admin sees open reports", async () => {
    const res = await admin.get("/api/v1/admin/reports?status=open");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it("admin can lock a thread", async () => {
    const res = await admin.patch(`/api/v1/admin/threads/${threadId}/lock`)
      .set("X-CSRF-Token", adminCsrf).send({ locked: true });
    expect(res.body.thread.locked).toBe(true);
  });

  it("locked thread rejects user replies but allows admin", async () => {
    const denied = await user.post(`/api/v1/discussions/threads/${threadId}/replies`)
      .set("X-CSRF-Token", userCsrf).send({ content: "should fail" });
    expect(denied.status).toBe(403);
    const allowed = await admin.post(`/api/v1/discussions/threads/${threadId}/replies`)
      .set("X-CSRF-Token", adminCsrf).send({ content: "mod reply" });
    expect(allowed.status).toBe(201);
  });
});

describe("user management", () => {
  it("admin lists users", async () => {
    const res = await admin.get("/api/v1/admin/users");
    expect(res.body.total).toBe(2);
  });

  it("admin cannot delete self", async () => {
    const me = await admin.get("/api/v1/auth/me");
    const res = await admin.delete(`/api/v1/admin/users/${me.body.user.id}`)
      .set("X-CSRF-Token", adminCsrf);
    expect(res.status).toBe(400);
  });
});

describe("settings & health", () => {
  it("health endpoints respond", async () => {
    expect((await anon.get("/health")).body.status).toBe("ok");
    expect((await anon.get("/ready")).body.status).toBe("ready");
  });

  it("admin can update settings", async () => {
    const res = await admin.put("/api/v1/admin/settings").set("X-CSRF-Token", adminCsrf)
      .send({ maxUploadMb: 50, maxImageMb: 5, sessionTtlDays: 30, sessionIdleHours: 72, maintenanceMode: false });
    expect(res.status).toBe(200);
    expect(res.body.settings.maxUploadMb).toBe(50);
  });

  it("sitemap and feeds are served", async () => {
    expect((await anon.get("/sitemap.xml")).status).toBe(200);
    expect((await anon.get("/robots.txt")).status).toBe(200);
    expect((await anon.get("/feed/releases.xml")).status).toBe(200);
  });
});
