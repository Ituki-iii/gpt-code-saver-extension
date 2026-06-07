const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");

const repoRoot = path.join(__dirname, "..", "..");
const artifactsRoot = path.join(repoRoot, "tests", "artifacts", "live-project-move-inspect");

const executablePath =
  process.env.CGPT_EDGE_EXECUTABLE ||
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const userDataDir =
  process.env.CGPT_EDGE_USER_DATA_DIR ||
  "C:\\Users\\ituki\\AppData\\Local\\Microsoft\\Edge\\User Data";
const profileDirectory = process.env.CGPT_EDGE_PROFILE || "Default";
const chatTitle = process.env.CGPT_CHAT_TITLE || "※ミャンマーお土産ガイド";
const targetProject = process.env.CGPT_TARGET_PROJECT || "PC管理";
const runHeadless = String(process.env.CGPT_HEADLESS || "1") !== "0";

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function dumpJson(name, payload) {
  await fs.writeFile(path.join(artifactsRoot, name), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function captureStage(page, name) {
  await page.screenshot({
    path: path.join(artifactsRoot, `${name}.png`),
    fullPage: true,
  });
}

async function main() {
  await ensureDir(artifactsRoot);

  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath,
    headless: runHeadless,
    viewport: { width: 1440, height: 1100 },
    args: [
      `--profile-directory=${profileDirectory}`,
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  try {
    const page = context.pages()[0] || (await context.newPage());
    await page.goto("https://chatgpt.com/", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.waitForTimeout(4_000);
    await captureStage(page, "01-home");

    const rowInfo = await page.evaluate((requestedTitle) => {
      const wanted = String(requestedTitle || "").trim();
      const anchors = Array.from(document.querySelectorAll("a[href*='/c/']"));
      const rows = anchors.map((anchor) => {
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
      return {
        wanted,
        rows,
      };
    }, chatTitle);
    await dumpJson("01-rows.json", rowInfo);

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
      if (
        label.includes("more") ||
        label.includes("その他") ||
        label.includes("menu") ||
        label.includes("オプション")
      ) {
        menuButton = candidate;
        break;
      }
    }
    if (!menuButton) {
      menuButton = rowButtons.nth(buttonCount - 1);
    }
    await menuButton.click();
    await page.waitForTimeout(1_000);
    await captureStage(page, "02-menu-open");

    const menuSnapshot = await page.evaluate(() => {
      const containers = Array.from(
        document.querySelectorAll("[role='menu'], [role='dialog'], [role='listbox'], [data-state='open']")
      );
      return containers.map((container, index) => ({
        index,
        role: container.getAttribute("role") || "",
        text: normalize(container.textContent || "").slice(0, 1000),
        html: container.outerHTML.slice(0, 5000),
      }));
    });
    await dumpJson("02-menu-snapshot.json", menuSnapshot);

    const moveItem = page
      .locator("[role='menuitem'], [role='option'], button, a, div")
      .filter({ hasText: /Add to project|Move to project|プロジェクトに追加|プロジェクトに移動/ })
      .first();
    await moveItem.click();
    await page.waitForTimeout(1_500);
    await captureStage(page, "03-project-picker");

    const pickerSnapshot = await page.evaluate((requestedProject) => {
      const wanted = String(requestedProject || "").trim();
      const containers = Array.from(
        document.querySelectorAll("[role='dialog'], [role='listbox'], [role='menu'], [data-state='open']")
      );
      const snapshots = containers.map((container, index) => {
        const items = Array.from(
          container.querySelectorAll("[role='option'], [role='menuitem'], [role='button'], button, a, li, [tabindex]")
        ).map((node) => ({
          tag: node.tagName,
          role: node.getAttribute("role") || "",
          ariaLabel: node.getAttribute("aria-label") || "",
          title: node.getAttribute("title") || "",
          text: normalize(node.textContent || ""),
          tabindex: node.getAttribute("tabindex") || "",
          matches: normalize(node.textContent || "").includes(wanted),
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
          text: normalize(container.textContent || "").slice(0, 1000),
          html: container.outerHTML.slice(0, 10000),
          items,
          inputs,
        };
      });
      return { wanted, snapshots };
    }, targetProject);
    await dumpJson("03-picker-snapshot.json", pickerSnapshot);

    const projectOption = page
      .locator("[role='option'], [role='menuitem'], [role='button'], button, a, li, [tabindex]")
      .filter({ hasText: targetProject })
      .first();
    await projectOption.click();
    await page.waitForTimeout(1_500);
    await captureStage(page, "04-after-project-click");

    const afterClickSnapshot = await page.evaluate(() => {
      const containers = Array.from(
        document.querySelectorAll("[role='dialog'], [role='listbox'], [role='menu'], [data-state='open']")
      );
      return containers.map((container, index) => ({
        index,
        role: container.getAttribute("role") || "",
        text: normalize(container.textContent || "").slice(0, 1000),
        html: container.outerHTML.slice(0, 10000),
      }));
    });
    await dumpJson("04-after-project-click.json", afterClickSnapshot);
  } finally {
    await context.close();
  }
}

main().catch(async (error) => {
  await ensureDir(artifactsRoot);
  await dumpJson("error.json", {
    error: error && error.stack ? error.stack : String(error),
    chatTitle,
    targetProject,
  });
  console.error(error);
  process.exitCode = 1;
});
