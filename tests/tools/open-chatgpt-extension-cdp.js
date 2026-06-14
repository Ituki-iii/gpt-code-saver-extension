const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const repoRoot = path.join(__dirname, "..", "..");

function envFlag(name, defaultValue) {
  const value = process.env[name];
  if (value == null || value === "") {
    return defaultValue;
  }
  return !/^(0|false|no)$/i.test(value);
}

function getDefaultChromiumExecutable() {
  return path.join(
    os.homedir(),
    ".cache",
    "ms-playwright",
    "chromium-1161",
    "chrome-linux",
    "chrome"
  );
}

function getConfig() {
  const cdpPort = Number(process.env.CGPT_CDP_PORT || 9222);
  if (!Number.isInteger(cdpPort) || cdpPort <= 0) {
    throw new Error(`Invalid CGPT_CDP_PORT: ${process.env.CGPT_CDP_PORT}`);
  }

  return {
    chromiumExecutable: process.env.CGPT_CHROMIUM_EXECUTABLE || getDefaultChromiumExecutable(),
    extensionPath: process.env.CGPT_EXTENSION_PATH || path.join(repoRoot, "extension"),
    userDataDir:
      process.env.CGPT_CHROMIUM_USER_DATA_DIR ||
      path.join(os.homedir(), ".local", "share", "chatgpt-code-saver", "chrome-profile"),
    debugUrl: process.env.CGPT_DEBUG_URL || "https://chatgpt.com/",
    cdpAddress: process.env.CGPT_CDP_ADDRESS || "127.0.0.1",
    cdpPort,
    closeExisting: envFlag("CGPT_CLOSE_EXISTING_CDP", true),
    loadExtension: envFlag("CGPT_LOAD_EXTENSION", true),
    enableCdp: envFlag("CGPT_ENABLE_CDP", true),
    attachOnly: envFlag("CGPT_ATTACH_ONLY", false),
    ozonePlatform: process.env.CGPT_OZONE_PLATFORM || "x11",
    logPath: process.env.CGPT_CHROME_LOG || path.join(os.tmpdir(), "chatgpt-code-saver-chrome.log"),
  };
}

async function urlOk(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForCdpDown(config, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const versionUrl = `http://${config.cdpAddress}:${config.cdpPort}/json/version`;
  while (Date.now() < deadline) {
    if (!(await urlOk(versionUrl))) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function waitForCdpUp(config, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const versionUrl = `http://${config.cdpAddress}:${config.cdpPort}/json/version`;
  while (Date.now() < deadline) {
    if (await urlOk(versionUrl)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function closeExistingCdpBrowser(config) {
  if (!config.closeExisting) {
    return false;
  }

  try {
    const browser = await chromium.connectOverCDP(
      `http://${config.cdpAddress}:${config.cdpPort}`
    );
    const session = await browser.newBrowserCDPSession();
    await session.send("Browser.close");
    await waitForCdpDown(config, 10_000);
    return true;
  } catch {
    return false;
  }
}

async function getTargets(config) {
  const response = await fetch(`http://${config.cdpAddress}:${config.cdpPort}/json/list`);
  if (!response.ok) {
    throw new Error(`CDP target list failed: ${response.status}`);
  }
  return response.json();
}

async function inspectPage(config) {
  const browser = await chromium.connectOverCDP(
    "http://" + config.cdpAddress + ":" + config.cdpPort
  );
  const context = browser.contexts()[0];
  if (!context) {
    return { pageFound: false };
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));
  const page =
    context.pages().find((candidate) => /chatgpt\.com/.test(candidate.url())) ||
    context.pages()[0];
  if (!page) {
    return { pageFound: false };
  }

  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(3_000).catch(() => {});

  try {
    return await page.evaluate(() => ({
      pageFound: true,
      url: location.href,
      title: document.title,
      helperIds: Array.from(document.querySelectorAll("[id^=\"cgpt-helper\"]"))
        .map((node) => node.id)
        .slice(0, 40),
      hasBulkToggle: Boolean(document.getElementById("cgpt-helper-sidebar-bulk-toggle")),
      hasPanelToggle: Boolean(document.getElementById("cgpt-helper-panel-toggle")),
      bodyTextSample: document.body
        ? String(document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 500)
        : "",
    }));
  } catch (error) {
    return {
      pageFound: true,
      evaluationFailed: true,
      error: error && error.message ? error.message : String(error),
    };
  }
}

async function main() {
  const config = getConfig();

  const closedExisting = config.attachOnly ? false : await closeExistingCdpBrowser(config);
  let child = { pid: null };
  if (!config.attachOnly) {
    await fs.mkdir(config.userDataDir, { recursive: true });
    const args = [
      "--user-data-dir=" + config.userDataDir,
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--enable-unsafe-swiftshader",
      "--ozone-platform=" + config.ozonePlatform,
    ];
    if (config.enableCdp) {
      args.push(
        "--remote-debugging-address=" + config.cdpAddress,
        "--remote-debugging-port=" + config.cdpPort
      );
    }
    if (config.loadExtension) {
      args.push(
        "--disable-extensions-except=" + config.extensionPath,
        "--load-extension=" + config.extensionPath
      );
    }
    args.push(config.debugUrl);

    const logFile = await fs.open(config.logPath, "a");
    child = spawn(config.chromiumExecutable, args, {
      detached: true,
      stdio: ["ignore", logFile.fd, logFile.fd],
    });
    child.unref();
    await logFile.close();
  }

  let relevantTargets = [];
  let pageState = { skipped: true, reason: "CGPT_ENABLE_CDP=0" };
  if (config.enableCdp) {
    if (config.attachOnly) {
      const cdpReady = await waitForCdpUp(config, 10_000);
      if (!cdpReady) {
        throw new Error(
          `No existing CDP browser found on http://${config.cdpAddress}:${config.cdpPort}. ` +
          `Start the browser manually, then rerun with CGPT_ATTACH_ONLY=1.`
        );
      }
    } else {
      const cdpReady = await waitForCdpUp(config, 30_000);
      if (!cdpReady) {
        throw new Error(`CDP did not become ready. Check ${config.logPath}`);
      }
    }
    const targets = await getTargets(config);
    relevantTargets = targets
      .map((target) => ({ type: target.type, title: target.title, url: target.url }))
      .filter(
        (target) => target.url.includes("chrome-extension://") || target.url.includes("chatgpt.com")
      );
    pageState = await inspectPage(config);
  }

  console.log(
    JSON.stringify(
      {
        closedExisting,
        pid: child.pid,
        cdpEnabled: config.enableCdp,
        cdpUrl: config.enableCdp ? `http://${config.cdpAddress}:${config.cdpPort}` : null,
        debugUrl: config.debugUrl,
        chromiumExecutable: config.chromiumExecutable,
        userDataDir: config.userDataDir,
        extensionPath: config.extensionPath,
        loadExtension: config.loadExtension,
        attachOnly: config.attachOnly,
        logPath: config.logPath,
        relevantTargets,
        pageState,
      },
      null,
      2
    )
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
