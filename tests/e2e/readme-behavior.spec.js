const fs = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");
const { loadFixtureHtml, openStaticChatgptPage } = require("../helpers/mockChatgptPage");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const artifactsRoot = path.join(testsRoot, "artifacts", "readme-behavior");
const fixturePath = path.join(testsRoot, "fixtures", "chatgpt-mock.html");

const LOG_STORAGE_KEY = "cgptHelper.logs";
const PROJECT_FOLDER_STORAGE_KEY = "cgptProjectFolderPath";

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readStorage(serviceWorker, areaName, keys) {
  return serviceWorker.evaluate(async ({ areaName, keys }) => {
    return new Promise((resolve) => {
      chrome.storage[areaName].get(keys, (result) => {
        resolve(result);
      });
    });
  }, { areaName, keys });
}

async function searchDownload(serviceWorker, downloadId) {
  return serviceWorker.evaluate(async (id) => {
    return new Promise((resolve) => {
      chrome.downloads.search({ id }, (items) => {
        resolve(items && items.length ? items[0] : null);
      });
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
    const logs = Array.isArray(storageState[LOG_STORAGE_KEY])
      ? storageState[LOG_STORAGE_KEY]
      : [];
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

test.describe("README workflow regression", () => {
  let sharedContext = null;
  let serviceWorker = null;
  let launchFailureReason = "";

  test.beforeAll(async () => {
    const profileBaseDir = path.join(artifactsRoot, "profiles");
    await ensureDir(profileBaseDir);
    const profileDir = await fs.mkdtemp(path.join(profileBaseDir, "suite-"));
    const launchProbe = await probeExtensionContext({
      chromium,
      profileDir,
      extensionPath,
    });
    if (!launchProbe.ok) {
      launchFailureReason = launchProbe.reason;
      return;
    }

    sharedContext = launchProbe.context;
    serviceWorker =
      sharedContext.serviceWorkers()[0] ||
      (await sharedContext.waitForEvent("serviceworker", { timeout: 20_000 }));
  });

  test.afterAll(async () => {
    if (sharedContext) {
      await sharedContext.close().catch(() => {});
      sharedContext = null;
      serviceWorker = null;
    }
  });

  test("verifies README workflow on a mocked ChatGPT page", async () => {
    test.setTimeout(120_000);
    test.skip(!sharedContext, launchFailureReason || "Extension context is unavailable.");

    const domDir = path.join(artifactsRoot, "dom");
    const screenshotDir = path.join(artifactsRoot, "screenshots");
    const stateDir = path.join(artifactsRoot, "state");
    await Promise.all([
      ensureDir(domDir),
      ensureDir(screenshotDir),
      ensureDir(stateDir),
    ]);

    const fixtureHtml = await loadFixtureHtml(fixturePath);
    const page = await sharedContext.newPage();

    try {
      await openStaticChatgptPage(page, "https://chatgpt.com/c/readme-smoke", fixtureHtml, {
        documentOnly: false,
      });

      await expect(page.locator("#cgpt-code-helper-panel")).toBeVisible({ timeout: 10_000 });
      const initialLayout = await page.evaluate(() => {
        const main = document.querySelector("main");
        const panel = document.getElementById("cgpt-code-helper-panel");
        if (!main || !panel) {
          return null;
        }

        const mainRect = main.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        return {
          mainRight: mainRect.right,
          panelLeft: panelRect.left,
          marginRight: window.getComputedStyle(main).marginRight,
          paddingBottom: window.getComputedStyle(main).paddingBottom,
          inlineMarginRight: main.style.marginRight,
          inlinePaddingBottom: main.style.paddingBottom,
        };
      });
      expect(initialLayout).toBeTruthy();
      expect(initialLayout.mainRight).toBeGreaterThan(initialLayout.panelLeft);
      expect(initialLayout.inlineMarginRight).toBe("");
      expect(initialLayout.inlinePaddingBottom).toBe("");

      const saveButton = page.locator(
        "[data-cgpt-code-wrapper='1'] button[data-cgpt-button-role='save']"
      );
      await expect(page.locator("[data-cgpt-code-wrapper='1'] pre").first()).toHaveAttribute(
        "data-cgpt-has-detected-path",
        "1"
      );
      await expect(saveButton).toHaveCount(1);
      await expect(saveButton).toBeVisible();
      await expect(saveButton).toBeEnabled();

      await page.getByRole("button", { name: "Templates" }).click();
      await expect(page.locator("#cgpt-helper-template-panel")).toBeVisible();
      await page.locator("#cgpt-helper-template-panel").getByRole("button", { name: "Insert" }).click();
      await expect(page.locator("textarea[data-testid='textbox']")).toHaveValue(/\/\/ 出力ルール/);
      await expect(page.locator("textarea[data-testid='textbox']")).toHaveValue(/PATH: src\/app\.js/);

      const projectFolderInput = page.locator("input[placeholder='e.g. dev/my-project']");
      await projectFolderInput.fill("workspace");
      await page.getByRole("button", { name: "Set Project Folder" }).click();
      await expect(page.locator("#cgpt-helper-toast")).toContainText("Project folder saved: workspace");

      await saveButton.click();

      const { storageState, latestLog, download } = await waitForLatestApplyLog(serviceWorker);
      const downloadedContent = await fs.readFile(download.filename, "utf8");

      expect(storageState[PROJECT_FOLDER_STORAGE_KEY]).toBe("workspace");
      expect(latestLog.filePathRelative).toBe("src/app.js");
      expect(latestLog.filePath).toBe("workspace/src/app.js");
      expect(downloadedContent).toBe('console.log("hello from mock");\n');

      await page.getByRole("button", { name: "Download Log" }).click();
      await expect(page.locator("#cgpt-helper-log-modal")).toBeVisible();
      await expect(page.locator("#cgpt-helper-log-modal")).toContainText("src/app.js");
      await expect(page.locator("#cgpt-helper-log-modal")).toContainText("workspace/src/app.js");

      await page.locator("#cgpt-helper-log-modal").getByRole("button", { name: "Close" }).click();

      await page.getByRole("button", { name: "Chat Log" }).click();
      await expect(page.locator("#cgpt-helper-chatlog-modal")).toBeVisible();
      await expect(page.locator("#cgpt-helper-chatlog-modal")).toContainText(
        "Generate a tiny app file and keep the answer concise."
      );
      await expect(page.locator("#cgpt-helper-chatlog-modal")).toContainText("Implementation...");
      await expect(page.locator("#cgpt-helper-chatlog-modal")).toContainText("Code blocks (1)");
      await expect(page.locator("#cgpt-helper-chatlog-modal")).toContainText("src/app.js");

      await Promise.all([
        page.screenshot({
          path: path.join(screenshotDir, "readme-workflow.png"),
          fullPage: true,
        }),
        fs.writeFile(path.join(domDir, "page.html"), await page.content(), "utf8"),
        writeJson(path.join(stateDir, "storage.json"), storageState),
        writeJson(path.join(stateDir, "latest-log.json"), latestLog),
        writeJson(path.join(stateDir, "download.json"), download),
        fs.writeFile(path.join(stateDir, "downloaded-content.txt"), downloadedContent, "utf8"),
      ]);
    } finally {
      await page.close().catch(() => {});
    }
  });
});
