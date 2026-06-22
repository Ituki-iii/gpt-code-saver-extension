const fs = require("fs/promises");
const path = require("path");
const { chromium, expect } = require("@playwright/test");
const { getBrowserLaunchEnv } = require("../helpers/browserLaunchEnv");
const { loadFixtureHtml, openStaticChatgptPage } = require("../helpers/mockChatgptPage");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const fixturePath = path.join(testsRoot, "fixtures", "chatgpt-mock.html");
const sidebarFixturePath = path.join(testsRoot, "fixtures", "chatgpt-sidebar-bulk-mock.html");
const artifactsRoot = path.join(testsRoot, "artifacts", "readme-screens-x11");
const docsImagesDir = path.join(repoRoot, "docs", "images", "readme");

const LOG_STORAGE_KEY = "cgptHelper.logs";
const PROJECT_FOLDER_STORAGE_KEY = "cgptProjectFolderPath";

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function buildEnv() {
  const env = getBrowserLaunchEnv();
  delete env.XDG_SESSION_TYPE;
  return env;
}

async function createContext() {
  const profileDir = await fs.mkdtemp(path.join(artifactsRoot, "profile-"));
  return chromium.launchPersistentContext(profileDir, {
    channel: "chromium",
    headless: false,
    env: buildEnv(),
    viewport: { width: 1440, height: 1100 },
    args: [
      "--ozone-platform=x11",
      "--disable-software-rasterizer",
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
    ignoreDefaultArgs: ["--enable-unsafe-swiftshader"],
  });
}

async function createMockPage(page) {
  const fixtureHtml = await loadFixtureHtml(fixturePath);
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await openStaticChatgptPage(page, "https://chatgpt.com/c/readme-screens", fixtureHtml, {
    documentOnly: false,
  });
  return page;
}

async function createSidebarMockPage(page) {
  const fixtureHtml = await loadFixtureHtml(sidebarFixturePath);
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await openStaticChatgptPage(page, "https://chatgpt.com/c/readme-sidebar-screens", fixtureHtml, {
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
  const wrapper = page.locator("[data-cgpt-code-wrapper='1']").first();
  await expect(wrapper.locator("pre").first()).toHaveAttribute("data-cgpt-has-detected-path", "1");
  const projectFolderInput = page.locator("input[placeholder='e.g. dev/my-project']");
  await projectFolderInput.fill("workspace");
  await page.getByRole("button", { name: "Set Project Folder" }).click();
  await expect(page.locator("#cgpt-helper-toast")).toContainText("Project folder saved: workspace");
  const saveButton = wrapper.locator("button[data-cgpt-button-role='save']");
  await expect(saveButton).toBeVisible();
  await saveButton.click();
}

async function captureMainPanel(page) {
  const panel = page.locator("#cgpt-code-helper-panel");
  await expect(panel).toContainText("Extension");
  await expect(panel).toContainText("Project Folder");
  await expect(panel).toContainText("Display");
  await expect(panel).toContainText("View Controls");
  await expect(panel).toContainText("Logs");
  await panel.screenshot({ path: path.join(docsImagesDir, "main-panel.png") });
}

async function captureTemplatePanel(page) {
  await page.getByRole("button", { name: "Templates" }).click();
  const panel = page.locator("#cgpt-helper-template-panel");
  await expect(panel).toBeVisible();
  await panel.screenshot({ path: path.join(docsImagesDir, "templates-panel.png") });
}

async function captureDownloadLog(page, serviceWorker) {
  await saveMockCodeBlock(page);
  await waitForLatestApplyLog(serviceWorker);
  await page.getByRole("button", { name: "Download Log" }).click();
  const modal = page.locator("#cgpt-helper-log-modal");
  await expect(modal).toContainText("Download Log");
  await expect(modal).toContainText("Full path: workspace/");
  await modal.screenshot({ path: path.join(docsImagesDir, "download-log.png") });
  await modal.getByRole("button", { name: "Close" }).click();
}

async function captureChatLog(page) {
  await page.getByRole("button", { name: "Chat Log" }).click();
  const modal = page.locator("#cgpt-helper-chatlog-modal");
  await expect(modal).toContainText("Generate a tiny app file and keep the answer concise.");
  await expect(modal).toContainText("Implementation...");
  await expect(modal).toContainText("Code blocks (1)");
  await modal.screenshot({ path: path.join(docsImagesDir, "chat-log.png") });
}

async function captureWorkflow(page, serviceWorker) {
  await createMockPage(page);
  await page.getByRole("button", { name: "Templates" }).click();
  await expect(page.locator("#cgpt-helper-template-panel")).toBeVisible();
  await page.locator("#cgpt-helper-template-panel").getByRole("button", { name: "Insert" }).click();
  await expect(page.locator("textarea[data-testid='textbox']")).toHaveValue(/PATH: src\/app\.js/);
  await saveMockCodeBlock(page);
  await waitForLatestApplyLog(serviceWorker);
  await page.getByRole("button", { name: "Chat Log" }).click();
  await expect(page.locator("#cgpt-helper-chatlog-modal")).toBeVisible();
  await page.screenshot({
    path: path.join(docsImagesDir, "workflow.png"),
    fullPage: true,
  });
}

async function captureSidebarBulk(page) {
  await createSidebarMockPage(page);
  await page.getByRole("button", { name: "Bulk Chats" }).click();
  const panel = page.locator("#cgpt-helper-sidebar-bulk-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Bulk Chats");
  await panel.screenshot({ path: path.join(docsImagesDir, "bulk-chats.png") });
}

async function main() {
  await Promise.all([ensureDir(artifactsRoot), ensureDir(docsImagesDir)]);
  const summary = {
    startedAt: new Date().toISOString(),
    outputDir: docsImagesDir,
  };

  const context = await createContext();
  try {
    const serviceWorker = await getServiceWorker(context);
    const page = context.pages()[0] || (await context.newPage());

    await createMockPage(page);
    await captureMainPanel(page);
    await captureTemplatePanel(page);

    await createMockPage(page);
    await captureDownloadLog(page, serviceWorker);

    await createMockPage(page);
    await captureChatLog(page);

    await captureWorkflow(page, serviceWorker);
    await captureSidebarBulk(page);

    summary.finishedAt = new Date().toISOString();
    summary.files = [
      "main-panel.png",
      "templates-panel.png",
      "download-log.png",
      "chat-log.png",
      "bulk-chats.png",
      "workflow.png",
    ];
    await fs.writeFile(
      path.join(artifactsRoot, "summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8"
    );
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await context.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
