import { test, expect, type Page } from "@playwright/test";

const ADMIN = { username: "admin", password: "adminpass123" };
const USER = { username: "alice", password: "alicepass123" };

test.describe.configure({ mode: "serial" });

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/^password/i).first().fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
}

test("first-time setup creates admin and project", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Devlog" })).toBeVisible();
  await page.getByLabel(/username/i).fill(ADMIN.username);
  await page.getByLabel(/^password/i).first().fill(ADMIN.password);
  await page.getByLabel(/confirm password/i).fill(ADMIN.password);
  await page.getByRole("button", { name: /create admin account/i }).click();
  await expect(page.getByText(/step 2 of 2/i)).toBeVisible();
  await page.getByLabel(/program name/i).fill("E2E Test App");
  await page.getByLabel(/description/i).first().fill("An app built by Playwright");
  await page.getByRole("button", { name: /finish setup/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  await expect(page.getByText("E2E Test App").first()).toBeVisible();
});

test("admin creates and publishes a release", async ({ page }) => {
  await login(page, ADMIN.username, ADMIN.password);
  await page.goto("/admin/releases/new");
  await page.getByLabel(/release name/i).fill("v1.0 Release");
  await page.getByLabel(/version/i).fill("1.0.0");
  await page.locator("textarea").first().fill("# Launch\n\nFirst release notes.");
  await page.getByLabel(/status/i).selectOption("published");
  await page.getByRole("button", { name: /create release/i }).click();
  await expect(page).toHaveURL(/\/admin\/releases$/, { timeout: 15000 });
  await expect(page.getByText("v1.0 Release")).toBeVisible();
  // ensure it is published (public visibility depends on it)
  const row = page.locator("tr", { hasText: "v1.0 Release" });
  if (await row.getByText("Draft").isVisible()) {
    await row.getByRole("button", { name: /^publish$/i }).click();
    await expect(row.getByText("Published")).toBeVisible();
  }
});

test("admin creates and publishes a newsletter", async ({ page }) => {
  await login(page, ADMIN.username, ADMIN.password);
  await page.goto("/admin/newsletters/new");
  await page.getByLabel(/title/i).fill("Launch Newsletter");
  await page.getByLabel(/short description/i).fill("We launched!");
  await page.locator("textarea").first().fill("# Hello world\n\nOur first newsletter.");
  await page.getByLabel(/status/i).selectOption("published");
  await page.getByRole("button", { name: /create newsletter/i }).click();
  await expect(page).toHaveURL(/\/admin\/newsletters$/, { timeout: 15000 });
  await expect(page.getByText("Launch Newsletter")).toBeVisible();
  const row = page.locator("tr", { hasText: "Launch Newsletter" });
  if (await row.getByText("Draft").isVisible()) {
    await row.getByRole("button", { name: /^publish$/i }).click();
    await expect(row.getByText("Published")).toBeVisible();
  }
});

test("public homepage shows release and newsletter", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("E2E Test App").first()).toBeVisible();
  await page.goto("/releases");
  await expect(page.getByText("v1.0 Release")).toBeVisible();
  await page.goto("/newsletters");
  await expect(page.getByText("Launch Newsletter")).toBeVisible();
});

test("visitor cannot post, registered user can", async ({ page }) => {
  await page.goto("/discussions");
  await page.getByText("v1.0 Release").click();
  await expect(page.getByRole("button", { name: /new thread/i })).toHaveCount(0);

  await page.goto("/register");
  await page.getByLabel(/username/i).fill(USER.username);
  await page.getByLabel(/^password/i).first().fill(USER.password);
  await page.getByLabel(/confirm password/i).fill(USER.password);
  await page.getByRole("button", { name: /^register$/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });

  await page.goto("/discussions");
  await page.getByText("v1.0 Release").first().click();
  await page.getByRole("button", { name: /new thread/i }).click();
  await page.getByLabel(/title/i).fill("Discussion thread");
  await page.locator("textarea").first().fill("What do you think of this release?");
  await page.getByRole("button", { name: /post thread/i }).click();
  await expect(page.getByText("Discussion thread")).toBeVisible({ timeout: 15000 });
});

test("admin moderation page loads", async ({ page }) => {
  await login(page, ADMIN.username, ADMIN.password);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /overview/i })).toBeVisible();
  await page.goto("/admin/discussions");
  await expect(page.getByText("Discussion thread")).toBeVisible();
  await page.goto("/admin/users");
  await expect(page.getByText("alice")).toBeVisible();
});
