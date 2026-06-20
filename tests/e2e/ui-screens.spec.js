const fs = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");
const { ensureDir } = require("../helpers/e2eArtifacts");
const { loadFixtureHtml, openStaticChatgptPage } = require("../helpers/mockChatgptPage");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const fixturePath = path.join(testsRoot, "fixtures", "chatgpt-mock.html");
const sidebarFixturePath = path.join(testsRoot, "fixtures", "chatgpt-sidebar-bulk-mock.html");
const artifactsRoot = path.join(testsRoot, "artifacts", "ui-screen-checks");

const LOG_STORAGE_KEY = "cgptHelper.logs";
const PROJECT_FOLDER_STORAGE_KEY = "cgptProjectFolderPath";

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

async function createMockPage(context) {
  const fixtureHtml = await loadFixtureHtml(fixturePath);
  const page = await context.newPage();
  await openStaticChatgptPage(page, "https://chatgpt.com/c/ui-screen-checks", fixtureHtml, {
    documentOnly: false,
  });
  return page;
}

async function createSidebarMockPage(context) {
  const fixtureHtml = await loadFixtureHtml(sidebarFixturePath);
  const page = await context.newPage();
  await openStaticChatgptPage(page, "https://chatgpt.com/c/sidebar-ui-screen-checks", fixtureHtml, {
    documentOnly: false,
  });
  return page;
}

async function getServiceWorker(context) {
  return context.serviceWorkers()[0] || (await context.waitForEvent("serviceworker", { timeout: 20_000 }));
}

async function readStorage(serviceWorker, areaName, keys) {
  return serviceWorker.evaluate(async ({ areaName, keys }) => {
    return new Promise((resolve) => {
      chrome.storage[areaName].get(keys, (result) => resolve(result));
    });
  }, { areaName, keys });
}

async function searchDownload(serviceWorker, downloadId) {
  return serviceWorker.evaluate(async (id) => {
    return new Promise((resolve) => {
      chrome.downloads.search({ id }, (items) => resolve(items && items.length ? items[0] : null));
    });
  }, downloadId);
}

async function waitForLatestApplyLog(serviceWorker) {
  let latestResult = null;
  await expect.poll(async () => {
    const storageState = await readStorage(serviceWorker, "local", [
      LOG_STORAGE_KEY,
      PROJECT_FOLDER_STORAGE_KEY,
    ]);
    const logs = Array.isArray(storageState[LOG_STORAGE_KEY]) ? storageState[LOG_STORAGE_KEY] : [];
    const latestLog = logs[logs.length - 1];
    if (latestLog && latestLog.ok && typeof latestLog.downloadId === "number") {
      const download = await searchDownload(serviceWorker, latestLog.downloadId);
      if (download && download.state === "complete" && download.filename) {
        latestResult = { storageState, latestLog, download };
        return true;
      }
    }
    return false;
  }, {
    timeout: 10_000,
    intervals: [100, 200, 250],
    message: "Timed out while waiting for a completed download log.",
  }).toBe(true);
  return latestResult;
}

async function saveMockCodeBlock(page) {
  const projectFolderInput = page.locator("input[placeholder='e.g. dev/my-project']");
  await projectFolderInput.fill("workspace");
  await page.getByRole("button", { name: "Set Project Folder" }).click();
  await expect(page.locator("#cgpt-helper-toast")).toContainText("Project folder saved: workspace");
  const saveButton = page.locator("[data-cgpt-code-wrapper='1'] button[data-cgpt-button-role='save']");
  await page.locator("[data-cgpt-code-wrapper='1']").hover();
  await saveButton.click();
}

test.describe("UI screen checks @ui-evidence", () => {
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

  test("main panel shows the current panel sections", async () => {
    test.setTimeout(120_000);
    const screenshotDir = path.join(artifactsRoot, "main-panel", "screenshots");
    await ensureDir(screenshotDir);
    const page = await createMockPage(sharedContext);
    try {
      await expect(page.getByRole("button", { name: "Quick Settings" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Chat Log" })).toBeVisible();
      const panel = page.locator("#cgpt-code-helper-panel");
      await expect(panel).toContainText("Extension");
      await expect(panel).toContainText("Project Folder");
      await expect(panel).toContainText("Save Options");
      await expect(panel).toContainText("Display");
      await expect(panel).toContainText("View Controls");
      await expect(panel).toContainText("Logs");
      await expect(panel).not.toContainText("Chat Log");
      await panel.screenshot({ path: path.join(screenshotDir, "main-panel.png") });
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("templates panel opens from the floating Templates button", async () => {
    const screenshotDir = path.join(artifactsRoot, "templates-panel", "screenshots");
    await ensureDir(screenshotDir);
    const page = await createMockPage(sharedContext);
    try {
      await page.getByRole("button", { name: "Templates" }).click();
      const panel = page.locator("#cgpt-helper-template-panel");
      await expect(panel).toBeVisible();
      await expect(panel).toContainText("Templates");
      await expect(panel).toContainText("Edit");
      await expect(panel).toContainText("Add");
      await expect(panel).toContainText("Insert");
      await panel.screenshot({ path: path.join(screenshotDir, "templates-panel.png") });
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("download log modal opens after a save and shows the latest download entry", async () => {
    const screenshotDir = path.join(artifactsRoot, "download-log-modal", "screenshots");
    await ensureDir(screenshotDir);
    const serviceWorker = await getServiceWorker(sharedContext);
    const page = await createMockPage(sharedContext);
    try {
      await saveMockCodeBlock(page);
      await waitForLatestApplyLog(serviceWorker);
      await page.getByRole("button", { name: "Download Log" }).click();
      const modal = page.locator("#cgpt-helper-log-modal");
      await expect(modal).toBeVisible();
      await expect(modal).toContainText("Download Log");
      await expect(modal).toContainText("src/app.js");
      await expect(modal).toContainText("workspace/src/app.js");
      await modal.screenshot({ path: path.join(screenshotDir, "download-log-modal.png") });
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("chat log modal opens and shows the message/code summary UI", async () => {
    const screenshotDir = path.join(artifactsRoot, "chat-log-modal", "screenshots");
    await ensureDir(screenshotDir);
    const page = await createMockPage(sharedContext);
    try {
      await page.getByRole("button", { name: "Chat Log" }).click();
      const modal = page.locator("#cgpt-helper-chatlog-modal");
      await expect(modal).toBeVisible();
      await expect(modal).toContainText("Chat Log");
      await expect(modal).toContainText("Save uses the project folder");
      await expect(modal).toContainText("Generate a tiny app file and keep the answer concise.");
      await expect(modal).toContainText("Implementation...");
      await expect(modal).toContainText("Code blocks (1)");
      await modal.screenshot({ path: path.join(screenshotDir, "chat-log-modal.png") });
    } finally {
      await page.close().catch(() => {});
    }
  });

  test("sidebar bulk panel opens and shows search, actions, and project controls", async () => {
    const screenshotDir = path.join(artifactsRoot, "sidebar-bulk-panel", "screenshots");
    await ensureDir(screenshotDir);
    const page = await createSidebarMockPage(sharedContext);
    try {
      await page.getByRole("button", { name: "Bulk Chats" }).click();
      const panel = page.locator("#cgpt-helper-sidebar-bulk-panel");
      await expect(panel).toBeVisible();
      await expect(panel).toContainText("Bulk Chats");
      await expect(panel.locator("#cgpt-helper-sidebar-bulk-search")).toBeVisible();
      await expect(panel).toContainText("Select All");
      await expect(panel).toContainText("Add to Project");
      await expect(panel.locator("#cgpt-helper-sidebar-bulk-project-select")).toBeVisible();
      await expect(panel.getByRole("button", { name: "Rename chat" }).first()).toBeVisible();
      await expect(panel.getByRole("button", { name: "Rename" })).toHaveCount(0);
      await panel.screenshot({ path: path.join(screenshotDir, "sidebar-bulk-panel.png") });
    } finally {
      await page.close().catch(() => {});
    }
  });
});
