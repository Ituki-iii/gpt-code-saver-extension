const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const artifactsRoot = path.join(testsRoot, "artifacts", "chatgpt-ui-patterns-extension-offline");
const fixtureRoot = path.join(testsRoot, "fixtures", "live-ui-patterns");
const manifestPath = path.join(fixtureRoot, "manifest.json");

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

function buildMockPageHtml({ prompt, assistantOuterHtml }) {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Offline ChatGPT UI Pattern Fixture</title>
    <style>
      body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f7f8; color: #1f2937; }
      main { max-width: 960px; margin: 0 auto; padding: 32px 24px 120px; }
      [data-message-author-role] { margin-bottom: 24px; padding: 20px; border-radius: 16px; background: #ffffff; border: 1px solid #e5e7eb; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }
      pre { overflow: auto; padding: 18px 20px; border-radius: 12px; background: #f3f4f6; color: #111827; border: 1px solid #e5e7eb; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #94a3b8; padding: 8px; }
      blockquote { margin: 16px 0; padding-left: 16px; border-left: 4px solid #94a3b8; }
      textarea { width: 100%; min-height: 140px; }
    </style>
  </head>
  <body>
    <main>
      <div data-message-author-role="user" data-message-id="fixture-user-1">
        <pre>${prompt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      </div>
      ${assistantOuterHtml}
      <textarea data-testid="chat-input" name="prompt-textarea"></textarea>
    </main>
  </body>
</html>`;
}

function shouldExpectHeadingFolds(summary) {
  const headingCount = Array.isArray(summary?.headingTags) ? summary.headingTags.length : 0;
  return headingCount > 0;
}

test.describe("offline chatgpt ui pattern fixtures with extension", () => {
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : null;

  const scenarios = (manifest?.scenarios || []).filter((scenario) => scenario.validated);
  let sharedContext = null;
  let launchFailureReason = "";

  if (!scenarios.length) {
    test("skips when no validated heading fixtures are collected", async () => {
      test.skip(true, "Run `npm run collect:ui-patterns:x11` first to generate validated heading fixtures.");
    });
    return;
  }

  test.beforeAll(async () => {
    const profileBaseDir = path.join(artifactsRoot, "profiles");
    await ensureDir(profileBaseDir);
    const profileDir = await fsp.mkdtemp(path.join(profileBaseDir, "suite-"));
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
  });

  test.afterAll(async () => {
    if (sharedContext) {
      await Promise.race([
        sharedContext.close().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 5_000)),
      ]);
      sharedContext = null;
    }
  });

  for (const scenario of scenarios) {
    test(`replays ${scenario.id} with heading UI`, async () => {
      test.skip(!sharedContext, launchFailureReason || "Extension context is unavailable.");
      const scenarioDir = path.join(artifactsRoot, scenario.id);
      const screenshotDir = path.join(scenarioDir, "screenshots");
      const stateDir = path.join(scenarioDir, "state");

      await Promise.all([
        ensureDir(screenshotDir),
        ensureDir(stateDir),
      ]);
      const assistantOuterHtml = await fsp.readFile(
        path.join(fixtureRoot, scenario.responseOuterHtmlFile || scenario.responseHtmlFile),
        "utf8"
      );

      try {
        const page = await sharedContext.newPage();
        await page.route("https://chatgpt.com/**", async (route) => {
          if (route.request().resourceType() !== "document") {
            await route.fulfill({
              status: 204,
              contentType: "text/plain; charset=utf-8",
              body: "",
            });
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: "text/html; charset=utf-8",
            body: buildMockPageHtml({
            prompt: scenario.prompt,
            assistantOuterHtml,
          }),
        });
      });

        await page.goto(`https://chatgpt.com/c/offline-${scenario.id}`, {
          waitUntil: "domcontentloaded",
        });

        await expect(page.locator("#cgpt-code-helper-panel")).toBeVisible({ timeout: 10_000 });
        await page.getByRole("button", { name: "Reapply" }).click();

        const expectedLevels = scenario.summary.headingTags.map((tagName) =>
          Number.parseInt(String(tagName).replace(/^h/i, ""), 10)
        );
        const expectsHeadingFolds = shouldExpectHeadingFolds(scenario.summary);

        await expect
          .poll(async () => page.locator(".cgpt-helper-heading-fold").count(), { timeout: 10_000 })
          .toBe(expectsHeadingFolds ? expectedLevels.length : 0);

        if (expectsHeadingFolds) {
          await expect
            .poll(async () => page.locator(".cgpt-helper-heading-fold").evaluateAll((elements) => {
              return elements.map((element) =>
                Number.parseInt(element.getAttribute("data-cgpt-helper-fold-level") || "0", 10)
              );
            }), { timeout: 10_000 })
            .toEqual(expectedLevels);
        }

        const actualLevels = await page.locator(".cgpt-helper-heading-fold").evaluateAll((elements) => {
          return elements.map((element) =>
            Number.parseInt(element.getAttribute("data-cgpt-helper-fold-level") || "0", 10)
          );
        });
        expect(actualLevels).toEqual(expectsHeadingFolds ? expectedLevels : []);

        if (expectsHeadingFolds && scenario.id === "headings-h1-h6") {
          const headingSection = page.locator("#cgpt-code-helper-panel").filter({ hasText: "Headings" }).first();
          await expect(headingSection).toContainText("Collapse All");
          await expect(headingSection).toContainText("Expand All");
        }

        await Promise.all([
          page.screenshot({
            path: path.join(screenshotDir, `${scenario.id}.png`),
            fullPage: true,
          }),
          fsp.writeFile(
            path.join(stateDir, "levels.json"),
            `${JSON.stringify({ expectedLevels, actualLevels }, null, 2)}\n`,
            "utf8"
          ),
        ]);
        await page.close().catch(() => {});
      } finally {
      }
    });
  }
});
