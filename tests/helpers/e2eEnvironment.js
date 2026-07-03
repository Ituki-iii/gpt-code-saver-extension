const { getBrowserLaunchEnv } = require("./browserLaunchEnv");
let cachedProbeFailureReason = null;

function buildProbePageHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Extension Probe</title>
  </head>
  <body>
    <main>
      <div data-message-author-role="user" data-message-id="probe-user-1">
        <p>Probe</p>
        <time datetime="2026-03-03T00:00:00.000Z">2026-03-03 09:00</time>
      </div>
      <div data-message-author-role="assistant" data-message-id="probe-assistant-1">
        <h2>Probe Heading</h2>
        <p>Ensure the extension panel and heading folds are injected.</p>
        <p>PATH: src/probe.js</p>
        <pre><code>export const probe = true;</code></pre>
        <time datetime="2026-03-03T00:00:05.000Z">2026-03-03 09:00</time>
      </div>
      <textarea data-testid="chat-input" name="prompt-textarea"></textarea>
    </main>
  </body>
</html>`;
}

async function verifyContentScriptInjection(context) {
  const page = await context.newPage();
  const probeUrl = "https://chatgpt.com/c/cgpt-extension-probe";
  try {
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
        body: buildProbePageHtml(),
      });
    });
    await page.goto(probeUrl, { waitUntil: "domcontentloaded" });
    await page.locator("#cgpt-code-helper-panel").waitFor({ state: "visible", timeout: 7_500 });
    await page.locator(".cgpt-helper-message-body").first().waitFor({ state: "attached", timeout: 7_500 });
    return true;
  } catch {
    return false;
  } finally {
    await page.close().catch(() => {});
  }
}

async function probeExtensionContext({ chromium, profileDir, extensionPath }) {
  if (cachedProbeFailureReason) {
    return {
      ok: false,
      reason: cachedProbeFailureReason,
    };
  }
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let context;
    try {
      context = await chromium.launchPersistentContext(profileDir, {
        channel: "chromium",
        headless: true,
        env: getBrowserLaunchEnv(),
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
      });
      const isReady = await verifyContentScriptInjection(context);
      if (isReady) {
        return { ok: true, context };
      }
      lastError = new Error("Extension content scripts did not inject into the probe page.");
    } catch (error) {
      lastError = error;
    }
    if (context) {
      await context.close().catch(() => {});
    }
  }
  return {
    ok: false,
    reason: (() => {
      cachedProbeFailureReason = `Extension persistent context is unavailable in this environment: ${lastError ? lastError.message : "unknown error"}`;
      return cachedProbeFailureReason;
    })(),
  };
}

module.exports = {
  probeExtensionContext,
};
