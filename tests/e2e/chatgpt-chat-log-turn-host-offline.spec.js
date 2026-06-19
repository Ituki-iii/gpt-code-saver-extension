const fs = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");
const { ensureArtifactDirs, writeJsonArtifact } = require("../helpers/e2eArtifacts");
const { loadFixtureHtml, openStaticChatgptPage } = require("../helpers/mockChatgptPage");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const fixturePath = path.join(testsRoot, "fixtures", "chatgpt-chatlog-turn-host.html");
const artifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-chat-log-turn-host-offline");

test("chat log uses inner message content from conversation-turn hosts", async () => {
  const screenshotDir = path.join(artifactsRoot, "turn-host", "screenshots");
  const stateDir = path.join(artifactsRoot, "turn-host", "state");
  const profileBaseDir = path.join(artifactsRoot, "turn-host", "profiles");
  await ensureArtifactDirs(screenshotDir, stateDir, profileBaseDir);

  const profileDir = await fs.mkdtemp(path.join(profileBaseDir, "run-"));
  const launchProbe = await probeExtensionContext({
    chromium,
    profileDir,
    extensionPath,
  });
  test.skip(!launchProbe.ok, launchProbe.reason);
  const context = launchProbe.context;

  try {
    const html = await loadFixtureHtml(fixturePath);
    const page = await context.newPage();
    await openStaticChatgptPage(page, "https://chatgpt.com/c/offline-turn-host-chatlog", html, {
      documentOnly: false,
    });

    await page.getByRole("button", { name: "Chat Log" }).click();
    const modal = page.locator("#cgpt-helper-chatlog-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("[Image: image(25).png]");
    await expect(modal).toContainText("Use the following code block.");
    await expect(modal).toContainText("Code blocks (1)");
    await expect(modal).toContainText("src/app.js");
    await expect(modal).not.toContainText("You said:");
    await expect(modal).not.toContainText("ChatGPT said:");
    await expect(modal).not.toContainText("思考時間: 10s");

    const state = await modal.evaluate((element) => {
      const rows = [...element.querySelectorAll(".cgpt-helper-fold")].map((fold, index) => ({
        index,
        label: String((fold.querySelector(".cgpt-helper-fold-title span") || {}).textContent || "").trim(),
        body: String((fold.querySelector(".cgpt-helper-fold-body > div") || {}).textContent || "").trim(),
      }));
      return {
        rows,
      };
    });

    expect(state.rows.slice(0, 2)).toEqual([
      {
        index: 0,
        label: "User",
        body: "[Image: image(25).png]",
      },
      {
        index: 1,
        label: "GPT 5.5 Thinking",
        body: "Use the following code block.",
      },
    ]);

    await Promise.all([
      page.screenshot({
        path: path.join(screenshotDir, "turn-host-chat-log.png"),
        fullPage: true,
      }),
      writeJsonArtifact(path.join(stateDir, "turn-host-chat-log.json"), state),
    ]);
  } finally {
    await context.close();
  }
});
