const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");
const { getBrowserLaunchEnv } = require("../helpers/browserLaunchEnv");
const {
  buildDomSummary,
  createInspectionRunName,
  getArtifactsRoot,
  getDefaultEdgeOptions,
  getFeatureSelectors,
  looksLikeChallengeState,
  sanitizeInspectionTarget,
} = require("../helpers/liveChatgptInspection");

const repoRoot = path.join(__dirname, "..", "..");
const target = sanitizeInspectionTarget(process.env.CGPT_INSPECT_TARGET || "general");
const mode = String(process.env.CGPT_INSPECT_MODE || "anonymous").trim().toLowerCase() === "profile"
  ? "profile"
  : "anonymous";
const debugUrl = process.env.CGPT_DEBUG_URL || "https://chatgpt.com/";
const headless = String(process.env.CGPT_HEADLESS || (mode === "profile" ? "0" : "1")) !== "0";
const artifactsRoot = getArtifactsRoot(repoRoot);
const runName = process.env.CGPT_INSPECT_RUN_NAME || createInspectionRunName({ target, mode });
const outputDir = path.join(artifactsRoot, runName);

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(fileName, payload) {
  await fs.writeFile(
    path.join(outputDir, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8"
  );
}

async function copyEdgeProfileIfNeeded(edgeOptions) {
  if (!edgeOptions.copyProfile) {
    return edgeOptions.userDataDir;
  }
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cgpt-edge-inspect-"));
  const copiedUserDataDir = path.join(tempRoot, "User Data");
  await ensureDir(copiedUserDataDir);

  await fs.copyFile(
    path.join(edgeOptions.userDataDir, "Local State"),
    path.join(copiedUserDataDir, "Local State")
  );
  await fs.cp(
    path.join(edgeOptions.userDataDir, edgeOptions.profileDirectory),
    path.join(copiedUserDataDir, edgeOptions.profileDirectory),
    {
      recursive: true,
      force: true,
    }
  );
  return copiedUserDataDir;
}

async function launchContext() {
  if (mode === "profile") {
    const edgeOptions = getDefaultEdgeOptions(process.env);
    const userDataDir = await copyEdgeProfileIfNeeded(edgeOptions);
    const context = await chromium.launchPersistentContext(userDataDir, {
      executablePath: edgeOptions.executablePath,
      headless,
      viewport: { width: 1440, height: 1100 },
      args: [
        `--profile-directory=${edgeOptions.profileDirectory}`,
        "--no-first-run",
        "--no-default-browser-check",
      ],
    });
    return {
      context,
      launchInfo: {
        mode,
        executablePath: edgeOptions.executablePath,
        sourceUserDataDir: edgeOptions.userDataDir,
        userDataDir,
        profileDirectory: edgeOptions.profileDirectory,
        copiedProfile: edgeOptions.copyProfile,
      },
    };
  }

  const userDataDir =
    process.env.CGPT_CHROMIUM_USER_DATA_DIR ||
    (await fs.mkdtemp(path.join(os.tmpdir(), "cgpt-live-inspect-")));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless,
    env: getBrowserLaunchEnv(),
    viewport: { width: 1440, height: 1100 },
  });
  return {
    context,
    launchInfo: {
      mode,
      channel: "chromium",
      userDataDir,
    },
  };
}

async function captureInspection(page, inspectionTarget) {
  const selectors = getFeatureSelectors(inspectionTarget);
  return page.evaluate(({ selectors, inspectionTarget }) => {
    const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const sample = (value, limit = 1000) => normalize(value).slice(0, limit);
    const attr = (node, name) => node.getAttribute(name) || "";
    const textbox =
      document.querySelector("div[contenteditable='true'][data-testid='textbox']") ||
      document.querySelector("div[contenteditable='true'][role='textbox']") ||
      document.querySelector("textarea[data-testid='chat-input']") ||
      document.querySelector("textarea");
    const bodyText = document.body ? document.body.innerText || "" : "";
    const challengeState =
      document.title.includes("Just a moment") ||
      bodyText.includes("Enable JavaScript and cookies to continue") ||
      bodyText.includes("検証に成功しました。chatgpt.com の応答を待っています");

    const nodeToCandidate = (node, index) => {
      const row = node.closest("li, [role='listitem'], [data-testid*='conversation' i], div");
      const buttons = row
        ? Array.from(row.querySelectorAll("button, [role='button']")).slice(0, 8)
        : [];
      const modelAttrs = {};
      for (const attribute of Array.from(node.attributes || [])) {
        const name = attribute.name || "";
        if (/model|message|testid|aria|role|href|title/i.test(name)) {
          modelAttrs[name] = attribute.value;
        }
      }
      return {
        index,
        tag: node.tagName,
        role: attr(node, "role"),
        href: attr(node, "href"),
        ariaLabel: attr(node, "aria-label"),
        title: attr(node, "title"),
        testId: attr(node, "data-testid"),
        classSample: sample(attr(node, "class"), 240),
        text: sample(node.textContent || "", 500),
        attributes: modelAttrs,
        rowText: row && row !== node ? sample(row.textContent || "", 500) : "",
        rowButtonLabels: buttons.map((button) =>
          sample(button.getAttribute("aria-label") || button.textContent || "", 160)
        ),
        outerHtmlSample: sample(node.outerHTML || "", 2000),
      };
    };

    const selectedNodes = [];
    const seen = new Set();
    for (const selector of selectors) {
      for (const node of Array.from(document.querySelectorAll(selector))) {
        if (!seen.has(node)) {
          seen.add(node);
          selectedNodes.push(node);
        }
      }
    }

    const openContainers = Array.from(
      document.querySelectorAll(
        "[role='menu'], [role='dialog'], [role='listbox'], [role='menuitem'], [role='option'], [data-state='open'], [popover]"
      )
    ).map((node, index) => nodeToCandidate(node, index));

    const sidebar =
      document.querySelector("nav") ||
      document.querySelector("aside") ||
      document.querySelector("[data-testid='history-sidebar']") ||
      document.querySelector("[aria-label*='chat' i]");

    const featureSamples = {
      target: inspectionTarget,
      sidebarHtmlSample: sidebar ? sample(sidebar.outerHTML || "", 12000) : "",
      messageHtmlSamples: Array.from(document.querySelectorAll("[data-message-author-role]"))
        .slice(0, 10)
        .map((node) => sample(node.outerHTML || "", 4000)),
      codeBlockHtmlSamples: Array.from(document.querySelectorAll("pre"))
        .slice(0, 10)
        .map((node) => sample(node.outerHTML || "", 4000)),
    };

    const pageState = {
      url: window.location.href,
      title: document.title,
      readyState: document.readyState,
      hasTextbox: Boolean(textbox),
      helperPanel: Boolean(document.getElementById("cgpt-code-helper-panel")),
      challengeState,
      bodySample: bodyText.slice(0, 2000),
      anchorCount: document.querySelectorAll("a[href]").length,
      conversationAnchorCount: document.querySelectorAll("a[href*='/c/']").length,
      messageCount: document.querySelectorAll("[data-message-author-role]").length,
      codeBlockCount: document.querySelectorAll("pre").length,
      dialogCount: document.querySelectorAll("[role='dialog']").length,
      menuCount: document.querySelectorAll("[role='menu']").length,
      listboxCount: document.querySelectorAll("[role='listbox']").length,
    };

    return {
      pageState,
      candidateElements: selectedNodes.slice(0, 800).map((node, index) => nodeToCandidate(node, index)),
      openContainers,
      featureSamples,
    };
  }, { selectors, inspectionTarget });
}

async function waitForStableUsefulState(page) {
  const startedAt = Date.now();
  let lastInspection = null;
  while (Date.now() - startedAt < 30_000) {
    lastInspection = await captureInspection(page, target);
    if (lastInspection.pageState.readyState === "complete") {
      return lastInspection;
    }
    await page.waitForTimeout(500);
  }
  return lastInspection;
}

async function main() {
  await ensureDir(outputDir);
  const { context, launchInfo } = await launchContext();
  let response = null;
  try {
    const page = context.pages()[0] || (await context.newPage());
    response = await page.goto(debugUrl, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });

    let inspection = await waitForStableUsefulState(page);
    if (inspection && looksLikeChallengeState(inspection.pageState) && !headless) {
      await writeJson("challenge-state.json", inspection.pageState);
      const startedAt = Date.now();
      while (Date.now() - startedAt < 180_000) {
        await page.waitForTimeout(1000);
        inspection = await captureInspection(page, target);
        if (!looksLikeChallengeState(inspection.pageState)) {
          break;
        }
      }
    }

    await page.screenshot({
      path: path.join(outputDir, "page.png"),
      fullPage: true,
    });

    const pageState = {
      ok: true,
      capturedAt: new Date().toISOString(),
      responseStatus: response ? response.status() : null,
      debugUrl,
      target,
      launch: launchInfo,
      ...inspection.pageState,
    };
    const domSummary = buildDomSummary({
      pageState,
      candidateElements: inspection.candidateElements,
      openContainers: inspection.openContainers,
      target,
    });

    await Promise.all([
      writeJson("page-state.json", pageState),
      writeJson("candidate-elements.json", inspection.candidateElements),
      writeJson("open-containers.json", inspection.openContainers),
      writeJson("dom-summary.json", domSummary),
      writeJson("feature-samples.json", inspection.featureSamples),
    ]);

    console.log(outputDir);
  } finally {
    await context.close().catch(() => {});
  }
}

main().catch(async (error) => {
  await ensureDir(outputDir);
  await writeJson("page-state.json", {
    ok: false,
    capturedAt: new Date().toISOString(),
    debugUrl,
    target,
    mode,
    error: error && error.stack ? error.stack : String(error),
  });
  console.error(error);
  process.exitCode = 1;
});
