const fs = require("fs/promises");
const path = require("path");
const { test, expect } = require("@playwright/test");

const repoRoot = path.join(__dirname, "..", "..");

async function readScript(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), "utf8");
}

function buildFixtureHtml() {
  const conversations = Array.from({ length: 12 }, (_, index) => {
    return `
      <li data-row="conversation-${index}">
        <a href="/c/bench-${index}" data-cgpt-conversation-title="Bench ${index}">
          Bench ${index}
        </a>
      </li>
    `;
  }).join("\n");

  const projects = Array.from({ length: 4 }, (_, index) => {
    return `
      <button
        type="button"
        data-cgpt-project="1"
        data-cgpt-project-name="Project ${index}"
      >
        Project ${index}
      </button>
    `;
  }).join("\n");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Runtime Mutation Benchmark</title>
      <style>
        body {
          margin: 0;
          font-family: sans-serif;
          display: grid;
          grid-template-columns: 320px 1fr;
          min-height: 100vh;
        }
        aside {
          border-right: 1px solid #d1d5db;
          padding: 16px;
        }
        main {
          padding: 16px;
        }
      </style>
    </head>
    <body>
      <aside data-cgpt-sidebar-root="1">
        <div data-cgpt-section-label="Recents">
          <ul id="conversation-list">
            ${conversations}
          </ul>
        </div>
        <div data-cgpt-section-label="Projects" data-cgpt-project-list="1">
          ${projects}
        </div>
      </aside>
      <main>
        <div id="noise-root"></div>
      </main>
    </body>
  </html>`;
}

test("@benchmark runtime mutation benchmark batches sidebar refresh work", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Benchmark is intended for Chromium.");

  const trackerScript = await readScript("extension/content/sidebarConversationTracker.js");

  await page.setContent(buildFixtureHtml(), { waitUntil: "domcontentloaded" });
  await page.addScriptTag({
    content: `
      window.__cgptPerfMetrics = {};
      window.cgptRenderSidebarBulkPanel = () => {};
      window.cgptClearSidebarApiDiagnostics = () => {};
      window.cgptSetSidebarApiDiagnostics = () => {};
      window.cgptGetSidebarApiDiagnostics = () => null;
      window.cgptFetchSidebarApiSnapshot = async () => ({
        ok: true,
        snapshot: {
          sidebarFound: true,
          conversations: Array.from(document.querySelectorAll("a[href*='/c/']")).map((anchor, index) => ({
            id: \`bench-\${index}\`,
            conversationId: (anchor.getAttribute("href") || "").split("/c/")[1] || \`bench-\${index}\`,
            title: anchor.textContent.trim(),
            isActive: false,
            isProjectItem: false,
            projectId: "",
            projectName: "",
          })),
          projects: Array.from(document.querySelectorAll("[data-cgpt-project='1']")).map((project, index) => ({
            id: \`project-\${index}\`,
            name: project.textContent.trim(),
            isCurrent: false,
          })),
          updatedAt: Date.now(),
          source: "internal_api",
          debugBuild: "benchmark",
          diagnostics: null,
          projectApiSweep: null,
          requestTrace: null,
          projectIframeSweep: null,
        },
      });
    `,
  });
  await page.addScriptTag({ content: trackerScript });

  const result = await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const snapshot = () => JSON.parse(JSON.stringify(window.__cgptPerfMetrics || {}));

    window.__cgptRouteKey = "/c/bench-initial";
    cgptGetSidebarConversationRouteKey = () => window.__cgptRouteKey;

    cgptStartSidebarConversationTracker(document);
    await delay(120);

    const baseline = snapshot();
    const noiseRoot = document.getElementById("noise-root");
    const conversationList = document.getElementById("conversation-list");

    const noiseStart = performance.now();
    for (let batch = 0; batch < 3; batch += 1) {
      for (let index = 0; index < 18; index += 1) {
        const node = document.createElement("span");
        node.textContent = `noise-${batch}-${index}`;
        noiseRoot.appendChild(node);
      }
      noiseRoot.textContent = `noise-batch-${batch}`;
      await delay(110);
    }
    const afterNoise = snapshot();

    const sidebarStart = performance.now();
    for (let batch = 0; batch < 3; batch += 1) {
      for (let index = 0; index < 8; index += 1) {
        const row = document.createElement("li");
        row.dataset.row = `dynamic-${batch}-${index}`;
        row.innerHTML = '<a href="/c/dynamic-bench" data-cgpt-conversation-title="Dynamic Bench">Dynamic Bench</a>';
        conversationList.appendChild(row);
      }
      const firstAnchor = conversationList.querySelector("a[href*='/c/']");
      if (firstAnchor) {
        firstAnchor.textContent = `Bench changed ${batch}`;
      }
      await delay(110);
    }
    const afterSidebar = snapshot();

    window.__cgptRouteKey = "/g/g-p-bench/project?view=runtime";
    window.dispatchEvent(new CustomEvent("cgpt-helper-sidebar-route-change"));
    await delay(110);
    const afterRoute = snapshot();

    return {
      baseline,
      afterNoise,
      afterSidebar,
      afterRoute,
      noiseDurationMs: performance.now() - noiseStart,
      sidebarDurationMs: performance.now() - sidebarStart,
    };
  });

  const sidebarMetrics = result.afterRoute.sidebar || {};
  expect((result.afterNoise.sidebar || {}).skippedMutationBatches > 0).toBe(true);
  expect((result.afterSidebar.sidebar || {}).mutationRefreshes > 0).toBe(true);
  expect((result.afterRoute.sidebar || {}).routeChanges > 0).toBe(true);
  expect(sidebarMetrics.refreshCalls > 0).toBe(true);
  expect(sidebarMetrics.mutationRefreshes).toBeLessThanOrEqual(6);
  expect(result.noiseDurationMs > 0).toBe(true);
  expect(result.sidebarDurationMs > 0).toBe(true);
});
