const fs = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");
const { ensureDir } = require("../helpers/e2eArtifacts");
const { loadFixtureHtml, openStaticChatgptPage } = require("../helpers/mockChatgptPage");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const fixturePath = path.join(testsRoot, "fixtures", "chatgpt-sidebar-bulk-mock.html");
const artifactsRoot = path.join(testsRoot, "artifacts", "sidebar-bulk");

async function createMockContext(testInfo) {
  const profileBaseDir = path.join(artifactsRoot, "profiles");
  await ensureDir(profileBaseDir);
  const profileDir = await fs.mkdtemp(path.join(profileBaseDir, `${testInfo.title.replace(/[^\w-]+/g, "-")}-`));
  return probeExtensionContext({
    chromium,
    profileDir,
    extensionPath,
  });
}

async function createSidebarBulkPage(context) {
  const fixtureHtml = await loadFixtureHtml(fixturePath);
  const page = await context.newPage();
  await openStaticChatgptPage(page, "https://chatgpt.com/c/sidebar-bulk-checks", fixtureHtml, {
    documentOnly: false,
  });
  return page;
}

async function createSidebarBulkApiSnapshotPage(context) {
  const fixtureHtml = await loadFixtureHtml(fixturePath);
  const page = await context.newPage();
  await page.route("https://chatgpt.com/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.resourceType() === "document") {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: fixtureHtml,
      });
      return;
    }
    if (url.pathname === "/api/auth/session" || url.pathname === "/backend-api/accounts/check" || url.pathname === "/backend-api/me") {
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({ user: { id: "offline-user" } }),
      });
      return;
    }
    if (url.pathname === "/backend-api/gizmos/snorlax/sidebar" || url.pathname === "/backend-api/projects") {
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({
          items: [
            { id: "proj-alpha", name: "Project Alpha" },
          ],
        }),
      });
      return;
    }
    if (url.pathname === "/backend-api/conversations") {
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({
          items: [
            { id: "api-only", title: "API only plain chat" },
            { id: "alpha", title: "API Alpha planning" },
          ],
        }),
      });
      return;
    }
    await route.fulfill({ status: 204, contentType: "text/plain; charset=utf-8", body: "" });
  });
  await page.goto("https://chatgpt.com/c/sidebar-bulk-api-snapshot", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#cgpt-code-helper-panel")).toBeVisible({ timeout: 10_000 });
  return page;
}

async function armProjectMoreEventProbe(page) {
  await page.evaluate(() => {
    const trigger = document.querySelector("[data-cgpt-project-more='1']");
    if (!trigger) {
      throw new Error("Project More trigger fixture is missing");
    }
    const eventNames = [
      "click",
      "pointerenter",
      "pointerover",
      "pointermove",
      "pointerdown",
      "pointerup",
      "pointerleave",
    ];
    window.__cgptProjectMoreEventCounts = Object.fromEntries(eventNames.map((eventName) => [eventName, 0]));
    eventNames.forEach((eventName) => {
      trigger.addEventListener(eventName, () => {
        window.__cgptProjectMoreEventCounts[eventName] += 1;
      });
    });
  });
}

async function readProjectMoreEventProbe(page) {
  return page.evaluate(() => window.__cgptProjectMoreEventCounts || {});
}

test.describe("sidebar bulk feature", () => {
  let sharedContext = null;

  test.beforeAll(async ({}, testInfo) => {
    const launchProbe = await createMockContext(testInfo);
    test.skip(!launchProbe.ok, launchProbe.reason);
    sharedContext = launchProbe.context;
  });

  test.afterAll(async () => {
    if (sharedContext) {
      await sharedContext.close().catch(() => {});
      sharedContext = null;
    }
  });

  test("bulk list renders API snapshot conversations without DOM references", async () => {
    const page = await createSidebarBulkApiSnapshotPage(sharedContext);
    try {
      await page.getByRole("button", { name: "Bulk Chats" }).click();
      const panel = page.locator("#cgpt-helper-sidebar-bulk-panel");
      await expect(panel).toBeVisible();
      await expect(page.locator("#cgpt-helper-sidebar-bulk-list")).toContainText("API only plain chat");
      await expect(page.locator("#cgpt-helper-sidebar-bulk-list")).toContainText("api-only");
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("opening Bulk Chats does not trigger the project More button", async () => {
    const page = await createSidebarBulkPage(sharedContext);
    try {
      await armProjectMoreEventProbe(page);
      await page.getByRole("button", { name: "Bulk Chats" }).click();
      await expect(page.locator("#cgpt-helper-sidebar-bulk-panel")).toBeVisible();
      await page.waitForTimeout(200);

      const eventCounts = await readProjectMoreEventProbe(page);
      expect(eventCounts).toEqual({
        click: 0,
        pointerenter: 0,
        pointerover: 0,
        pointermove: 0,
        pointerdown: 0,
        pointerup: 0,
        pointerleave: 0,
      });
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("search and selection persist across filter changes", async () => {
    const page = await createSidebarBulkPage(sharedContext);
    try {
      await page.getByRole("button", { name: "Bulk Chats" }).click();
      const panel = page.locator("#cgpt-helper-sidebar-bulk-panel");
      await expect(panel).toBeVisible();
      await expect(panel).toContainText("Excluded 1");

      const search = page.locator("#cgpt-helper-sidebar-bulk-search");
      await search.fill("Alpha");
      await page.locator("#cgpt-helper-sidebar-bulk-list input[type='checkbox']").first().check();
      await expect(panel).toContainText("Selected 1");

      await search.fill("Gamma");
      await page.locator("#cgpt-helper-sidebar-bulk-list input[type='checkbox']").first().check();
      await expect(panel).toContainText("Selected 2");

      await search.fill("");
      await expect(page.locator("#cgpt-helper-sidebar-bulk-list input[type='checkbox']:checked")).toHaveCount(2);
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("filter sits directly above the chat list and each chat shows a pencil rename control", async () => {
    const page = await createSidebarBulkPage(sharedContext);
    try {
      await page.getByRole("button", { name: "Bulk Chats" }).click();
      const panel = page.locator("#cgpt-helper-sidebar-bulk-panel");
      const filter = page.locator("#cgpt-helper-sidebar-bulk-search");
      const list = page.locator("#cgpt-helper-sidebar-bulk-list");
      await expect(filter).toBeVisible();
      await expect(list).toBeVisible();
      const filterBox = await filter.boundingBox();
      const listBox = await list.boundingBox();
      expect(filterBox && listBox && filterBox.y + filterBox.height <= listBox.y).toBeTruthy();

      page.on("dialog", async (dialog) => {
        expect(dialog.message()).toBe("Rename chat");
        await dialog.accept("Alpha renamed");
      });
      const firstRenameButton = page.getByRole("button", { name: "Rename chat" }).first();
      await expect(firstRenameButton).toHaveText("✎");
      await firstRenameButton.click();
      await expect(page.locator("#cgpt-helper-sidebar-bulk-list")).toContainText("Alpha renamed");
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("pencil rename click does not toggle chat selection", async () => {
    const page = await createSidebarBulkPage(sharedContext);
    try {
      await page.getByRole("button", { name: "Bulk Chats" }).click();
      page.on("dialog", async (dialog) => {
        await dialog.dismiss();
      });
      const firstCheckbox = page.locator("#cgpt-helper-sidebar-bulk-list input[type='checkbox']").first();
      await expect(firstCheckbox).not.toBeChecked();
      await page.getByRole("button", { name: "Rename chat" }).first().click();
      await expect(firstCheckbox).not.toBeChecked();
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("snapshot refresh does not move the sidebar scroll position", async () => {
    const page = await createSidebarBulkPage(sharedContext);
    try {
      await page.evaluate(() => {
        const sidebar = document.querySelector("[data-cgpt-sidebar-root='1']");
        const projectList = document.querySelector("[data-cgpt-project-list='1']");
        if (!sidebar || !projectList) return;
        sidebar.style.height = "160px";
        sidebar.style.overflow = "auto";
        for (let index = 0; index < 30; index += 1) {
          const button = document.createElement("button");
          button.dataset.cgptProject = "1";
          button.dataset.cgptProjectId = `scroll-proj-${index}`;
          button.dataset.cgptProjectName = `Scroll Project ${index}`;
          button.textContent = `Scroll Project ${index}`;
          projectList.appendChild(button);
        }
        sidebar.scrollTop = 90;
      });
      const beforeScrollTop = await page.locator("[data-cgpt-sidebar-root='1']").evaluate((sidebar) => sidebar.scrollTop);

      await page.getByRole("button", { name: "Bulk Chats" }).click();
      await expect(page.locator("#cgpt-helper-sidebar-bulk-panel")).toBeVisible();
      await page.getByRole("button", { name: "Refresh" }).click();
      await page.waitForTimeout(500);

      const afterScrollTop = await page.locator("[data-cgpt-sidebar-root='1']").evaluate((sidebar) => sidebar.scrollTop);
      expect(afterScrollTop).toBe(beforeScrollTop);
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("bulk project assignment supports an existing project target", async () => {
    const page = await createSidebarBulkPage(sharedContext);
    try {
      await page.getByRole("button", { name: "Bulk Chats" }).click();
      await page.getByRole("button", { name: "Select All" }).click();
      await page.locator("#cgpt-helper-sidebar-bulk-project-select").selectOption("proj-alpha");
      await page.getByRole("button", { name: "Add to Project" }).click();
      await expect(page.locator("#cgpt-helper-sidebar-bulk-summary")).toContainText("Excluded 4");
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("new project button opens the original project GUI and keeps select usable after create", async () => {
    const page = await createSidebarBulkPage(sharedContext);
    try {
      await page.getByRole("button", { name: "Bulk Chats" }).click();
      await page.getByRole("button", { name: "+ New Project" }).click();
      await expect(page.locator("[data-cgpt-dialog='1']")).toBeVisible();
      await page.locator("[data-cgpt-project-name-input='1']").fill("Project Beta");
      await page.getByRole("button", { name: "Create" }).click();
      await expect(page.locator("[data-cgpt-project='1']")).toContainText("Project Beta");
      await expect(page.locator("#cgpt-helper-sidebar-bulk-project-select")).toBeEnabled();
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("new project cancel returns to a usable project select", async () => {
    const page = await createSidebarBulkPage(sharedContext);
    try {
      await page.getByRole("button", { name: "Bulk Chats" }).click();
      await page.getByRole("button", { name: "+ New Project" }).click();
      await expect(page.locator("[data-cgpt-dialog='1']")).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.locator("#cgpt-helper-sidebar-bulk-project-select")).toBeEnabled();
    } finally {
      await page.close().catch(() => {});
    }
  });
});
