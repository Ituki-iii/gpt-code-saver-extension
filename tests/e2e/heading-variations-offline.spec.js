const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { probeExtensionContext } = require("../helpers/e2eEnvironment");

const repoRoot = path.join(__dirname, "..", "..");
const testsRoot = path.join(__dirname, "..");
const extensionPath = path.join(repoRoot, "extension");
const artifactsRoot = path.join(testsRoot, "artifacts", "heading-variations-offline");
const fixtureRoot = path.join(testsRoot, "fixtures", "live-heading-variations");
const manifestPath = path.join(fixtureRoot, "manifest.json");
const HEADING_GUIDE_STEP_PX = 12;

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

function buildMockPageHtml({ prompt, assistantInnerHtml }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Offline Heading Fixture</title>
    <style>
      body {
        margin: 0;
        font-family: sans-serif;
        background: #111827;
        color: #f9fafb;
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 32px 24px 120px;
      }
      [data-message-author-role] {
        margin-bottom: 24px;
        padding: 20px;
        border-radius: 16px;
        background: #1f2937;
      }
      pre {
        position: relative;
        overflow: auto;
        padding: 18px 20px;
        border-radius: 12px;
        background: #0f172a;
      }
      code {
        font-family: "Courier New", monospace;
        white-space: pre;
      }
      textarea {
        width: 100%;
        min-height: 140px;
        padding: 12px;
        border-radius: 14px;
        background: #0f172a;
        color: #f9fafb;
      }
    </style>
  </head>
  <body>
    <main>
      <div data-message-author-role="user" data-message-id="fixture-user-1">
        <p>${prompt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        <time datetime="2026-02-28T12:00:00.000Z">2026-02-28 21:00</time>
      </div>
      <div data-message-author-role="assistant" data-message-id="fixture-assistant-1">
        ${assistantInnerHtml}
        <time datetime="2026-02-28T12:00:05.000Z">2026-02-28 21:00</time>
      </div>
      <textarea data-testid="textbox"></textarea>
    </main>
  </body>
</html>`;
}

function getExpectedVisualLevels(expectedLevels) {
  const visualLevels = [];
  const stack = [];

  expectedLevels.forEach((level) => {
    while (stack.length && stack[stack.length - 1] >= level) {
      stack.pop();
    }
    visualLevels.push(stack.length + 1);
    stack.push(level);
  });

  return visualLevels;
}

async function assertAllHeadingFoldsState(page, shouldBeOpen) {
  const expectedValue = shouldBeOpen ? "1" : "0";
  await expect
    .poll(async () => {
      return page.locator(".cgpt-helper-heading-fold").evaluateAll(
        (elements, targetValue) =>
          elements.every((element) => element.getAttribute("data-cgpt-helper-fold-open") === targetValue),
        expectedValue
      );
    }, { timeout: 10_000 })
    .toBeTruthy();
}

test.describe("offline heading fixtures", () => {
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : null;
  let sharedContext = null;
  let launchFailureReason = "";

  if (!manifest || !Array.isArray(manifest.scenarios) || manifest.scenarios.length === 0) {
    test("skips when no live heading fixtures are collected", async () => {
      test.skip(true, "Run `npm run collect:headings` first to generate live heading fixtures.");
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

  for (const scenario of manifest.scenarios) {
    test(`replays ${scenario.id}`, async () => {
      test.setTimeout(120_000);
      test.skip(!sharedContext, launchFailureReason || "Extension context is unavailable.");

      const scenarioDir = path.join(artifactsRoot, scenario.id);
      const screenshotDir = path.join(scenarioDir, "screenshots");
      const stateDir = path.join(scenarioDir, "state");

      await Promise.all([
        ensureDir(screenshotDir),
        ensureDir(stateDir),
      ]);
      const assistantInnerHtml = await fsp.readFile(
        path.join(fixtureRoot, scenario.responseHtmlFile),
        "utf8"
      );

      const page = await sharedContext.newPage();
      try {
        await page.route("https://chatgpt.com/**", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "text/html; charset=utf-8",
            body: buildMockPageHtml({
              prompt: scenario.prompt,
              assistantInnerHtml,
            }),
          });
        });

        await page.goto(`https://chatgpt.com/c/offline-${scenario.id}`, {
          waitUntil: "domcontentloaded",
        });

        await page.getByRole("button", { name: "Reapply" }).click();

        const expectedLevels = scenario.headings.map((heading) =>
          Number.parseInt(String(heading.tagName || "").replace(/^h/i, ""), 10)
        );

        await expect
          .poll(async () => page.locator(".cgpt-helper-heading-fold").count(), { timeout: 10_000 })
          .toBe(expectedLevels.length);

        const actualLevels = await page.locator(".cgpt-helper-heading-fold").evaluateAll((elements) => {
          return elements.map((element) =>
            Number.parseInt(element.getAttribute("data-cgpt-helper-fold-level") || "0", 10)
          );
        });

        expect(actualLevels).toEqual(expectedLevels);

        const expectedVisualLevels = getExpectedVisualLevels(expectedLevels);
        const actualGuideOffsets = await page.locator(".cgpt-helper-heading-guide").evaluateAll((elements) => {
          if (!elements.length) return [];
          const firstLeft = elements[0].getBoundingClientRect().left;
          return elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return Math.round(rect.left - firstLeft);
          });
        });

        expect(actualGuideOffsets).toEqual(
          expectedVisualLevels.map((visualLevel) => (visualLevel - 1) * HEADING_GUIDE_STEP_PX)
        );

        const headingSection = page.locator("#cgpt-code-helper-panel").filter({ hasText: "Headings" }).first();
        await expect(headingSection).toBeVisible();
        await headingSection.getByTitle("Collapse all visible heading folds").click();
        await assertAllHeadingFoldsState(page, false);
        await headingSection.getByTitle("Expand all visible heading folds").click();
        await assertAllHeadingFoldsState(page, true);

        await page.getByRole("button", { name: "Chat Log" }).click();
        await expect(page.locator("#cgpt-helper-chatlog-modal")).toBeVisible();

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
      } finally {
        await page.close().catch(() => {});
      }
    });
  }
});
