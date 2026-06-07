const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");

const repoRoot = path.join(__dirname, "..", "..");
const artifactsRoot = path.join(repoRoot, "tests", "artifacts", "live-project-move-debug");
const extensionPath = path.join(repoRoot, "extension");

const executablePath =
  process.env.CGPT_EDGE_EXECUTABLE ||
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const sourceUserDataDir =
  process.env.CGPT_EDGE_USER_DATA_DIR ||
  "C:\\Users\\ituki\\AppData\\Local\\Microsoft\\Edge\\User Data";
const profileDirectory = process.env.CGPT_EDGE_PROFILE || "Default";
const debugUrl = process.env.CGPT_DEBUG_URL || "https://chatgpt.com/";
const shouldCopyProfile = String(process.env.CGPT_EDGE_COPY_PROFILE || "") === "1";
const shouldLoadExtension = String(process.env.CGPT_EDGE_LOAD_EXTENSION || "1") !== "0";
const debugAction = String(process.env.CGPT_DEBUG_ACTION || "").trim().toLowerCase();
const chatTitle = process.env.CGPT_CHAT_TITLE || "※ミャンマーお土産ガイド";
const targetProject = process.env.CGPT_TARGET_PROJECT || "PC管理";

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function dumpArtifactJson(fileName, payload) {
  await fs.writeFile(
    path.join(artifactsRoot, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8"
  );
}

function cgptLooksLikeChallengeState(snapshot = {}) {
  const bodySample = String(snapshot.bodySample || "");
  return (
    bodySample.includes("Enable JavaScript and cookies to continue") ||
    bodySample.includes("検証に成功しました。chatgpt.com の応答を待っています")
  );
}

async function capturePageState(page) {
  return page.evaluate(() => {
    const textbox =
      document.querySelector("div[contenteditable='true'][data-testid='textbox']") ||
      document.querySelector("div[contenteditable='true'][role='textbox']") ||
      document.querySelector("textarea[data-testid='chat-input']") ||
      document.querySelector("textarea");
    return {
      url: window.location.href,
      title: document.title,
      helperPanel: Boolean(document.getElementById("cgpt-code-helper-panel")),
      hasTextbox: Boolean(textbox),
      bodySample: document.body ? document.body.innerText.slice(0, 1500) : "",
    };
  });
}

async function waitForLiveChatGptReady(page) {
  const startedAt = Date.now();
  let lastState = null;
  while (Date.now() - startedAt <= 180_000) {
    await page.waitForTimeout(1_000);
    lastState = await capturePageState(page);
    if (lastState.hasTextbox && !cgptLooksLikeChallengeState(lastState)) {
      return lastState;
    }
  }
  throw new Error(
    `live_chatgpt_not_ready_after_manual_wait: ${JSON.stringify(lastState || {}, null, 2)}`
  );
}

async function prepareUserDataDir() {
  if (!shouldCopyProfile) {
    return sourceUserDataDir;
  }
  const os = require("os");
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cgpt-edge-copy-"));
  const copiedUserDataDir = path.join(tempRoot, "User Data");
  await ensureDir(copiedUserDataDir);
  await fs.copyFile(
    path.join(sourceUserDataDir, "Local State"),
    path.join(copiedUserDataDir, "Local State")
  );
  await fs.cp(
    path.join(sourceUserDataDir, profileDirectory),
    path.join(copiedUserDataDir, profileDirectory),
    {
      recursive: true,
      force: true,
    }
  );
  return copiedUserDataDir;
}

async function main() {
  await ensureDir(artifactsRoot);
  const screenshotPath = path.join(artifactsRoot, "page.png");
  const jsonPath = path.join(artifactsRoot, "result.json");
  const userDataDir = await prepareUserDataDir();

  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath,
    headless: false,
    viewport: { width: 1440, height: 1100 },
    args: [
      `--profile-directory=${profileDirectory}`,
      "--no-first-run",
      "--no-default-browser-check",
    ].concat(
      shouldLoadExtension
        ? [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
          ]
        : []
    ),
  });

    try {
      const page = context.pages()[0] || (await context.newPage());
      const response = await page.goto(debugUrl, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
      await page.waitForTimeout(6_000);
      let initialState = await capturePageState(page);
      if (cgptLooksLikeChallengeState(initialState)) {
        await dumpArtifactJson("challenge-state.json", initialState);
        initialState = await waitForLiveChatGptReady(page);
      }

      if (debugAction === "inspect_project_move") {
        const sidebarProbe = await page.evaluate(() => {
          const sidebar =
            document.querySelector("nav") ||
            document.querySelector("aside") ||
            document.querySelector("[data-testid='history-sidebar']") ||
            document.body;
          const candidates = Array.from(
            sidebar.querySelectorAll("a, button, [role='button'], [role='link'], [role='listitem'], li, div")
          )
            .map((node) => ({
              tag: node.tagName,
              role: node.getAttribute("role") || "",
              href: node.getAttribute("href") || "",
              ariaLabel: node.getAttribute("aria-label") || "",
              text: String(node.textContent || "").replace(/\s+/g, " ").trim(),
            }))
            .filter((item) => item.text || item.href || item.ariaLabel)
            .slice(0, 400);
          return {
            sidebarHtml: sidebar.outerHTML.slice(0, 30000),
            candidates,
          };
        });
        await dumpArtifactJson("inspect-00-sidebar-probe.json", sidebarProbe);

        const rowInfo = await page.evaluate((requestedTitle) => {
          const wanted = String(requestedTitle || "").trim();
          const anchors = Array.from(document.querySelectorAll("a[href*='/c/']"));
          return anchors.map((anchor) => {
            const row = anchor.closest("li, [role='listitem'], div");
            const text = String(anchor.textContent || row && row.textContent || "").replace(/\s+/g, " ").trim();
            const buttons = row ? Array.from(row.querySelectorAll("button")) : [];
            return {
              title: text,
              href: anchor.getAttribute("href") || "",
              matches: text.includes(wanted),
              buttonCount: buttons.length,
              buttonLabels: buttons.map((button) =>
                String(button.getAttribute("aria-label") || button.textContent || "").replace(/\s+/g, " ").trim()
              ),
            };
          });
        }, chatTitle);
        await dumpArtifactJson("inspect-01-rows.json", rowInfo);

        if (!Array.isArray(rowInfo) || !rowInfo.some((row) => row && row.matches)) {
          throw new Error("conversation_anchor_not_found_in_live_sidebar");
        }

        const row = page.locator("a[href*='/c/']").filter({ hasText: chatTitle }).first();
        await row.waitFor({ state: "visible", timeout: 15_000 });
        await row.hover();
        await page.waitForTimeout(500);

        const rowContainer = row.locator("xpath=ancestor::*[self::li or @role='listitem' or self::div][1]");
        const rowButtons = rowContainer.locator("button");
        const buttonCount = await rowButtons.count();
        if (!buttonCount) {
          throw new Error("no_row_buttons_found");
        }

        let menuButton = null;
        for (let index = 0; index < buttonCount; index += 1) {
          const candidate = rowButtons.nth(index);
          const label = normalize(
            (await candidate.getAttribute("aria-label")) ||
            (await candidate.textContent())
          ).toLowerCase();
          if (label.includes("more") || label.includes("その他") || label.includes("menu") || label.includes("オプション")) {
            menuButton = candidate;
            break;
          }
        }
        if (!menuButton) {
          menuButton = rowButtons.nth(buttonCount - 1);
        }
        await menuButton.click();
        await page.waitForTimeout(1_000);
        await page.screenshot({ path: path.join(artifactsRoot, "inspect-02-menu-open.png"), fullPage: true });

        const menuSnapshot = await page.evaluate(() => {
          const containers = Array.from(
            document.querySelectorAll("[role='menu'], [role='dialog'], [role='listbox'], [data-state='open']")
          );
          return containers.map((container, index) => ({
            index,
            role: container.getAttribute("role") || "",
            text: String(container.textContent || "").replace(/\s+/g, " ").trim().slice(0, 1000),
            html: container.outerHTML.slice(0, 10000),
          }));
        });
        await dumpArtifactJson("inspect-02-menu-snapshot.json", menuSnapshot);

        const moveItem = page
          .locator("[role='menuitem'], [role='option'], button, a, div")
          .filter({ hasText: /Add to project|Move to project|プロジェクトに追加|プロジェクトに移動/ })
          .first();
        await moveItem.click();
        await page.waitForTimeout(1_500);
        await page.screenshot({ path: path.join(artifactsRoot, "inspect-03-project-picker.png"), fullPage: true });

        const pickerSnapshot = await page.evaluate((requestedProject) => {
          const wanted = String(requestedProject || "").trim();
          const containers = Array.from(
            document.querySelectorAll("[role='dialog'], [role='listbox'], [role='menu'], [data-state='open']")
          );
          return containers.map((container, index) => {
            const items = Array.from(
              container.querySelectorAll("[role='option'], [role='menuitem'], [role='button'], button, a, li, [tabindex]")
            ).map((node) => ({
              tag: node.tagName,
              role: node.getAttribute("role") || "",
              ariaLabel: node.getAttribute("aria-label") || "",
              title: node.getAttribute("title") || "",
              text: String(node.textContent || "").replace(/\s+/g, " ").trim(),
              tabindex: node.getAttribute("tabindex") || "",
              matches: String(node.textContent || "").replace(/\s+/g, " ").trim().includes(wanted),
            }));
            const inputs = Array.from(container.querySelectorAll("input")).map((input) => ({
              type: input.getAttribute("type") || "",
              placeholder: input.getAttribute("placeholder") || "",
              ariaLabel: input.getAttribute("aria-label") || "",
              value: input.value || "",
            }));
            return {
              index,
              role: container.getAttribute("role") || "",
              text: String(container.textContent || "").replace(/\s+/g, " ").trim().slice(0, 1000),
              html: container.outerHTML.slice(0, 10000),
              items,
              inputs,
            };
          });
        }, targetProject);
        await dumpArtifactJson("inspect-03-picker-snapshot.json", pickerSnapshot);

        const projectOption = page
          .locator("[role='option'], [role='menuitem'], [role='button'], button, a, li, [tabindex]")
          .filter({ hasText: targetProject })
          .first();
        await projectOption.click();
        await page.waitForTimeout(1_500);
        await page.screenshot({ path: path.join(artifactsRoot, "inspect-04-after-project-click.png"), fullPage: true });

        const afterClickSnapshot = await page.evaluate(() => {
          const containers = Array.from(
            document.querySelectorAll("[role='dialog'], [role='listbox'], [role='menu'], [data-state='open']")
          );
          return containers.map((container, index) => ({
            index,
            role: container.getAttribute("role") || "",
            text: String(container.textContent || "").replace(/\s+/g, " ").trim().slice(0, 1000),
            html: container.outerHTML.slice(0, 10000),
          }));
        });
        await dumpArtifactJson("inspect-04-after-project-click.json", afterClickSnapshot);
      }

      const state = await capturePageState(page);

    await Promise.all([
      page.screenshot({ path: screenshotPath, fullPage: true }),
      fs.writeFile(
        jsonPath,
        `${JSON.stringify(
          {
            ok: true,
            responseStatus: response ? response.status() : null,
            executablePath,
            sourceUserDataDir,
            userDataDir,
            profileDirectory,
            shouldCopyProfile,
            shouldLoadExtension,
            debugAction,
            chatTitle,
            targetProject,
            debugUrl,
            state,
          },
          null,
          2
        )}\n`,
        "utf8"
      ),
    ]);

    console.log(jsonPath);
  } finally {
    await context.close();
  }
}

main().catch(async (error) => {
  const jsonPath = path.join(artifactsRoot, "result.json");
  await ensureDir(artifactsRoot);
  await fs.writeFile(
    jsonPath,
    `${JSON.stringify(
      {
        ok: false,
        executablePath,
        sourceUserDataDir,
        profileDirectory,
        shouldCopyProfile,
        shouldLoadExtension,
        debugAction,
        chatTitle,
        targetProject,
        debugUrl,
        error: error && error.stack ? error.stack : String(error),
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  console.error(error);
  process.exitCode = 1;
});
