const fs = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");
const { ensureArtifactDirs, writeJsonArtifact } = require("../helpers/e2eArtifacts");
const { loadFixtureHtml, openStaticChatgptPage } = require("../helpers/mockChatgptPage");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const fixturePath = path.join(testsRoot, "fixtures", "chatgpt-chatlog-capture-then-assistant.html");
const artifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-chat-log-capture-then-assistant-offline");

test("chat log captures the assistant turn that follows a capture-only user turn", async () => {
  const screenshotDir = path.join(artifactsRoot, "capture-then-assistant", "screenshots");
  const stateDir = path.join(artifactsRoot, "capture-then-assistant", "state");
  const profileBaseDir = path.join(artifactsRoot, "capture-then-assistant", "profiles");
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
    await openStaticChatgptPage(page, "https://chatgpt.com/c/offline-capture-then-assistant", html, {
      documentOnly: false,
    });

    await page.getByRole("button", { name: "Chat Log" }).click();
    const modal = page.locator("#cgpt-helper-chatlog-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("[Image: capture-only.png]");

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const assistant = document.querySelector("[data-message-author-role='assistant']");
          if (!assistant) return null;
          const badge =
            assistant.querySelector(":scope > [data-cgpt-helper-chat-badge='1'] span") ||
            assistant.querySelector(":scope > .cgpt-helper-fold .cgpt-helper-fold-title-badge");
          const body = assistant.querySelector(".assistant-body");
          return {
            text: String((body && body.textContent) || "").trim(),
            badge: badge ? String(badge.textContent || "").trim() : "",
          };
        });
      }, { timeout: 10_000 })
      .toEqual({
        text: "Captured image acknowledged.",
        badge: "GPT 5.5 Thinking",
      });

    await expect(modal).toContainText("[Image: capture-only.png]");
    await expect(modal).toContainText("Captured image acknowledged.");
    await expect(modal).toContainText("GPT 5.5 Thinking");

    const state = await modal.evaluate((element) => {
      const rows = [...element.querySelectorAll(".cgpt-helper-fold")].map((fold, index) => ({
        index,
        label: String((fold.querySelector(".cgpt-helper-fold-title span") || {}).textContent || "").trim(),
        body: String((fold.querySelector(".cgpt-helper-fold-body > div") || {}).textContent || "").trim(),
      }));
      return { rows };
    });

    expect(state.rows).toEqual([
      {
        index: 0,
        label: "User",
        body: "[Image: capture-only.png]",
      },
      {
        index: 1,
        label: "GPT 5.5 Thinking",
        body: "Captured image acknowledged.",
      },
    ]);

    await Promise.all([
      page.screenshot({
        path: path.join(screenshotDir, "capture-then-assistant-chat-log.png"),
        fullPage: true,
      }),
      writeJsonArtifact(path.join(stateDir, "capture-then-assistant-chat-log.json"), state),
    ]);
  } finally {
    await context.close();
  }
});
