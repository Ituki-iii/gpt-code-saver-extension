const fs = require("fs/promises");
const path = require("path");
const { test, expect } = require("@playwright/test");

const repoRoot = path.join(__dirname, "..", "..");
const artifactsRoot = path.join(__dirname, "..", "artifacts", "compact-code-header");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readScript(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), "utf8");
}

function buildFixtureHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Compact Header Fixture</title>
    <style>
      :root {
        color-scheme: light;
        --cgpt-page-bg: rgb(255, 255, 255);
        --cgpt-surface-elevated: rgb(249, 249, 249);
        --cgpt-border-light: rgba(13, 13, 13, 0.05);
        --cgpt-text-primary: rgb(13, 13, 13);
        --cgpt-text-secondary: rgb(84, 84, 84);
        --cgpt-button-hover: rgba(0, 0, 0, 0.05);
      }
      html.dark {
        color-scheme: dark;
        --cgpt-page-bg: rgb(33, 33, 33);
        --cgpt-surface-elevated: rgb(24, 24, 24);
        --cgpt-border-light: rgba(255, 255, 255, 0.05);
        --cgpt-text-primary: rgb(255, 255, 255);
        --cgpt-text-secondary: rgb(171, 171, 171);
        --cgpt-button-hover: rgba(255, 255, 255, 0.1);
      }
      body {
        margin: 0;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--cgpt-page-bg);
        color: var(--cgpt-text-primary);
      }
      main {
        max-width: 920px;
        margin: 0 auto;
        padding: 32px 24px 120px;
      }
      [data-message-author-role] {
        margin-bottom: 24px;
        padding: 20px 0;
      }
      pre {
        position: relative;
        overflow: visible;
        padding: 0;
        margin: 16px 0;
        background: transparent;
      }
      .cgpt-mock-code-shell {
        border: 1px solid var(--cgpt-border-light);
        border-radius: 24px;
        background: var(--cgpt-surface-elevated);
        overflow: hidden;
      }
      .cgpt-mock-code-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px 7px 16px;
        background: var(--cgpt-surface-elevated);
        color: var(--cgpt-text-primary);
        font-size: 14px;
        font-weight: 600;
        border-bottom: 1px solid var(--cgpt-border-light);
      }
      .cgpt-mock-code-label {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .cgpt-mock-code-label-summary {
        color: var(--cgpt-text-secondary);
        font-weight: 500;
      }
      .cgpt-mock-code-actions {
        display: flex;
        gap: 4px;
      }
      .cgpt-mock-code-actions button {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 999px;
        background: transparent;
      }
      .cgpt-mock-code-actions button:hover {
        background: var(--cgpt-button-hover);
      }
      .cgpt-mock-code-body {
        padding: 0;
        color: var(--cgpt-text-primary);
        background: var(--cgpt-surface-elevated);
      }
      .cm-scroller,
      .cm-content {
        background: var(--cgpt-surface-elevated);
      }
      .cm-content,
      code {
        display: block;
        white-space: pre-wrap;
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
        line-height: 1.5;
        color: var(--cgpt-text-primary);
      }
      .cm-content {
        padding: 0 20px 18px;
      }
      .cgpt-mock-code-body > code {
        padding: 0 20px 18px;
        background: var(--cgpt-surface-elevated);
      }
      .cgpt-mock-code-token-comment {
        color: var(--cgpt-text-secondary);
        font-style: italic;
      }
      .cgpt-mock-code-token-keyword {
        color: rgb(139, 92, 246);
      }
      .cgpt-mock-code-token-string {
        color: rgb(5, 150, 105);
      }
      .cgpt-mock-code-token-function {
        color: rgb(37, 99, 235);
      }
      .cgpt-mock-code-token-number {
        color: rgb(217, 119, 6);
      }
      html.dark .cgpt-mock-code-token-keyword {
        color: rgb(196, 181, 253);
      }
      html.dark .cgpt-mock-code-token-string {
        color: rgb(74, 222, 128);
      }
      html.dark .cgpt-mock-code-token-function {
        color: rgb(96, 165, 250);
      }
      html.dark .cgpt-mock-code-token-number {
        color: rgb(251, 191, 36);
      }
    </style>
  </head>
  <body>
    <main>
      <div data-message-author-role="assistant" data-message-id="assistant-compact-1">
        <p>Compact preview should keep native code labels and append file paths.</p>
        <p>PATH: src/demo.py</p>
        <pre>
          <div class="cgpt-mock-code-shell">
            <div class="cgpt-mock-code-header">
              <div class="cgpt-mock-code-label">
                <span>Python</span>
              </div>
              <div class="cgpt-mock-code-actions">
                <button aria-label="Copy"></button>
              </div>
            </div>
            <div class="cgpt-mock-code-body">
              <div class="cm-scroller">
                <div class="cm-content"><span class="cgpt-mock-code-token-keyword">def</span> hello():
    print(<span class="cgpt-mock-code-token-string">"hello"</span>)
    return 1
</div>
              </div>
            </div>
          </div>
        </pre>
        <p>PATH: scripts/run.sh</p>
        <pre>
          <div class="cgpt-mock-code-shell">
            <div class="cgpt-mock-code-header">
              <div class="cgpt-mock-code-label">
                <span>Code</span>
              </div>
              <div class="cgpt-mock-code-actions">
                <button aria-label="Copy"></button>
              </div>
            </div>
            <div class="cgpt-mock-code-body">
              <code><span class="cgpt-mock-code-token-function">echo</span> <span class="cgpt-mock-code-token-string">"hello"</span>
<span class="cgpt-mock-code-token-function">echo</span> <span class="cgpt-mock-code-token-string">"world"</span>
</code>
            </div>
          </div>
        </pre>
        <p>PATH: src/middleware/errorHandler.js</p>
        <pre>
          <div class="cgpt-mock-code-shell">
            <div class="cgpt-mock-code-header">
              <div class="cgpt-mock-code-label">
                <div class="cgpt-mock-code-label-main">
                  <span data-lang-label="1">JavaScript</span>
                </div>
                <div class="cgpt-mock-code-label-summary">export function errorHandler(err, req, res, next) {</div>
              </div>
              <div class="cgpt-mock-code-actions">
                <button aria-label="Copy"></button>
              </div>
            </div>
            <div class="cgpt-mock-code-body">
              <code><span class="cgpt-mock-code-token-keyword">export function</span> <span class="cgpt-mock-code-token-function">errorHandler</span>(err, req, res, next) {
  return err;
}
</code>
            </div>
          </div>
        </pre>
      </div>
      <textarea data-testid="chat-input"></textarea>
    </main>
  </body>
</html>`;
}

test("expanded mode keeps native labels and appends file paths by default", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "This DOM-level verification targets Chromium behavior.");

  const screenshotDir = path.join(artifactsRoot, "screenshots");
  const stateDir = path.join(artifactsRoot, "state");
  await Promise.all([ensureDir(screenshotDir), ensureDir(stateDir)]);

  const scripts = await Promise.all([
    readScript("extension/shared/uiStyles.js"),
    readScript("extension/content/pathMetadata.js"),
    readScript("extension/content/codeBlockMetadata.js"),
    readScript("extension/content/codeBlockState.js"),
    readScript("extension/content/codeBlockViewMode.js"),
    readScript("extension/content/codeBlockButtons.js"),
    readScript("extension/content/codeBlocks.js"),
  ]);

  await page.setContent(buildFixtureHtml(), { waitUntil: "domcontentloaded" });
  for (const script of scripts) {
    await page.addScriptTag({ content: script });
  }

  const expected = [
    {
      headerText: "Python src/demo.py",
      pathText: "src/demo.py",
      langText: "",
      sourcePathHidden: true,
      pathFontSize: "inherit",
      pathBackgroundColor: "rgba(59, 130, 246, 0.18)",
      pathBorderRadius: "8px",
      actionsPlacement: "native-header",
      actionWrap: "nowrap",
      hasToggle: true,
      toggleExpanded: "true",
      toggleCount: 1,
      standaloneHeaderCount: 0,
      compactFirstLine: "def hello():",
      hostDisplay: "",
    },
    {
      headerText: "Code scripts/run.sh",
      pathText: "scripts/run.sh",
      langText: "",
      sourcePathHidden: true,
      pathFontSize: "inherit",
      pathBackgroundColor: "rgba(59, 130, 246, 0.18)",
      pathBorderRadius: "8px",
      actionsPlacement: "native-header",
      actionWrap: "nowrap",
      hasToggle: true,
      toggleExpanded: "true",
      toggleCount: 1,
      standaloneHeaderCount: 0,
      compactFirstLine: 'echo "hello"',
      hostDisplay: "",
    },
    {
      headerText: "JavaScript export function errorHandler(err, req, res, next) { src/middleware/errorHandler.js",
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      sourcePathHidden: true,
      pathFontSize: "inherit",
      pathBackgroundColor: "rgba(59, 130, 246, 0.18)",
      pathBorderRadius: "8px",
      actionsPlacement: "native-header",
      actionWrap: "nowrap",
      hasToggle: true,
      toggleExpanded: "true",
      toggleCount: 1,
      standaloneHeaderCount: 0,
      compactFirstLine: "export function errorHandler(err, req, res, next) {",
      hostDisplay: "",
    },
  ];
  const result = await page.waitForFunction(() => {
    if (typeof decorateCodeBlocks === "function") {
      decorateCodeBlocks(document);
    }
    const pres = Array.from(document.querySelectorAll("pre[data-cgpt-code-helper-applied='1']"));
    if (pres.length !== 3) {
      return null;
    }
    return pres.map((pre) => {
      const pathEl = pre.querySelector("[data-cgpt-code-file-path='1']");
      const labelNode = pathEl ? pathEl.parentElement : null;
      const explicitLangNode = pre.querySelector("[data-lang-label='1']");
      const toggles = Array.from(pre.querySelectorAll("[data-cgpt-code-toggle='1']"));
      const toggle = toggles[0] || null;
      const saveButton = pre.querySelector("button[data-cgpt-button-role='save']");
      const actionsNode = saveButton ? saveButton.closest("[data-cgpt-code-actions='1']") : null;
      const wrapper = pre.parentElement && pre.parentElement.dataset.cgptCodeWrapper === "1"
        ? pre.parentElement
        : null;
      const sourcePathNode = wrapper ? wrapper.previousElementSibling : pre.previousElementSibling;
      const host = typeof cgptGetCompactContentHost === "function"
        ? cgptGetCompactContentHost(pre)
        : pre;
      const code = typeof cgptGetDecoratableCodeContent === "function"
        ? cgptGetDecoratableCodeContent(pre)
        : pre.querySelector("code, .cm-content");
      const rawLines = (code?.textContent || "")
        .replace(/\r\n/g, "\n")
        .replace(/\n+$/, "")
        .split("\n");
      return {
        headerText: labelNode ? labelNode.textContent.replace(/\s+/g, " ").trim() : "",
        pathText: pathEl ? pathEl.textContent.trim() : "",
        langText: explicitLangNode ? explicitLangNode.textContent.replace(/\s+/g, " ").trim() : "",
        sourcePathHidden: Boolean(
          sourcePathNode &&
          sourcePathNode.textContent.includes("PATH:") &&
          sourcePathNode.style &&
          sourcePathNode.style.display === "none"
        ),
        pathFontSize: pathEl && pathEl.style ? pathEl.style.fontSize : "",
        pathBackgroundColor: pathEl && pathEl.style ? pathEl.style.backgroundColor : "",
        pathBorderRadius: pathEl && pathEl.style ? pathEl.style.borderRadius : "",
        actionsPlacement: actionsNode ? actionsNode.dataset.cgptCodeActionsPlacement || "" : "",
        actionWrap: actionsNode && actionsNode.style ? actionsNode.style.flexWrap : "",
        hasToggle: Boolean(toggle),
        toggleExpanded: toggle ? toggle.getAttribute("aria-expanded") : "",
        toggleCount: toggles.length,
        standaloneHeaderCount: wrapper
          ? wrapper.querySelectorAll(":scope > [data-cgpt-code-header='1']").length
          : 0,
        compactFirstLine: rawLines[0] || "",
        hostDisplay: host && host.style ? host.style.display : "",
      };
    });
  }, null, { timeout: 10_000 }).then((handle) => handle.jsonValue());
  expect(result).toEqual(expected);

  await Promise.all([
    page.screenshot({
      path: path.join(screenshotDir, "compact-header-mock.png"),
      fullPage: true,
    }),
    fs.writeFile(
      path.join(stateDir, "compact-header-result.json"),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8"
    ),
  ]);
});

test("compact and expand can be repeated without breaking the header path", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "This DOM-level verification targets Chromium behavior.");

  const scripts = await Promise.all([
    readScript("extension/shared/uiStyles.js"),
    readScript("extension/content/pathMetadata.js"),
    readScript("extension/content/codeBlockMetadata.js"),
    readScript("extension/content/codeBlockState.js"),
    readScript("extension/content/codeBlockViewMode.js"),
    readScript("extension/content/codeBlockButtons.js"),
    readScript("extension/content/codeBlocks.js"),
  ]);

  await page.setContent(buildFixtureHtml(), { waitUntil: "domcontentloaded" });
  for (const script of scripts) {
    await page.addScriptTag({ content: script });
  }

  const result = await page.evaluate(() => {
    decorateCodeBlocks(document);
    const targetPre = document.querySelectorAll("pre[data-cgpt-code-helper-applied='1']")[2];
    const snapshot = () => {
      const pathNodes = Array.from(targetPre.querySelectorAll("[data-cgpt-code-file-path='1']"));
      const langNode = targetPre.querySelector("[data-lang-label='1']");
      const summaryNode = targetPre.querySelector(".cgpt-mock-code-label-summary");
      const toggleNodes = Array.from(targetPre.querySelectorAll("[data-cgpt-code-toggle='1']"));
      const toggleNode = toggleNodes[0] || null;
      return {
        pathCount: pathNodes.length,
        pathText: pathNodes.map((node) => node.textContent.trim()).join(" | "),
        langText: langNode ? langNode.textContent.replace(/\s+/g, " ").trim() : "",
        summaryText: summaryNode ? summaryNode.textContent.replace(/\s+/g, " ").trim() : "",
        toggleExpanded: toggleNode ? toggleNode.getAttribute("aria-expanded") : "",
        toggleCount: toggleNodes.length,
      };
    };

    const states = [snapshot()];
    for (let i = 0; i < 3; i += 1) {
      cgptSetPreViewMode(targetPre, CGPT_VIEW_MODE.EXPANDED);
      states.push(snapshot());
      cgptSetPreViewMode(targetPre, CGPT_VIEW_MODE.COMPACT);
      states.push(snapshot());
    }
    return states;
  });

  expect(result).toEqual([
    {
      pathCount: 1,
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "true",
      toggleCount: 1,
    },
    {
      pathCount: 1,
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "true",
      toggleCount: 1,
    },
    {
      pathCount: 1,
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "false",
      toggleCount: 1,
    },
    {
      pathCount: 1,
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "true",
      toggleCount: 1,
    },
    {
      pathCount: 1,
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "false",
      toggleCount: 1,
    },
    {
      pathCount: 1,
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "true",
      toggleCount: 1,
    },
    {
      pathCount: 1,
      pathText: "src/middleware/errorHandler.js",
      langText: "JavaScript",
      summaryText: "export function errorHandler(err, req, res, next) {",
      toggleExpanded: "false",
      toggleCount: 1,
    },
  ]);
});

test("native header stays stable after the native copy button disappears", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "This DOM-level verification targets Chromium behavior.");

  const scripts = await Promise.all([
    readScript("extension/shared/uiStyles.js"),
    readScript("extension/content/pathMetadata.js"),
    readScript("extension/content/codeBlockMetadata.js"),
    readScript("extension/content/codeBlockState.js"),
    readScript("extension/content/codeBlockViewMode.js"),
    readScript("extension/content/codeBlockButtons.js"),
    readScript("extension/content/codeBlocks.js"),
  ]);

  await page.setContent(buildFixtureHtml(), { waitUntil: "domcontentloaded" });
  for (const script of scripts) {
    await page.addScriptTag({ content: script });
  }

  const result = await page.evaluate(() => {
    decorateCodeBlocks(document);
    const targetPre = document.querySelectorAll("pre[data-cgpt-code-helper-applied='1']")[0];
    targetPre.querySelector(".cgpt-mock-code-actions button[aria-label='Copy']")?.remove();
    cgptSetPreViewMode(targetPre, CGPT_VIEW_MODE.COMPACT);
    cgptSetPreViewMode(targetPre, CGPT_VIEW_MODE.EXPANDED);

    const wrapper =
      targetPre.parentElement && targetPre.parentElement.dataset.cgptCodeWrapper === "1"
        ? targetPre.parentElement
        : null;
    const toggle = targetPre.querySelector("[data-cgpt-code-toggle='1']");
    return {
      standaloneHeaderCount: wrapper
        ? wrapper.querySelectorAll(":scope > [data-cgpt-code-header='1']").length
        : 0,
      toggleInPre: Boolean(toggle),
      toggleParentInPre: Boolean(toggle && targetPre.contains(toggle.parentElement)),
      pathNodesInPre: Array.from(
        targetPre.querySelectorAll("[data-cgpt-code-file-path='1']")
      ).map((node) => node.textContent.trim()),
      pathNodesOutsidePre: wrapper
        ? Array.from(wrapper.querySelectorAll("[data-cgpt-code-file-path='1']"))
            .filter((node) => !targetPre.contains(node))
            .map((node) => node.textContent.trim())
        : [],
      actionPlacement:
        targetPre.querySelector("[data-cgpt-code-actions='1']")?.dataset
          ?.cgptCodeActionsPlacement || "",
    };
  });

  expect(result).toEqual({
    standaloneHeaderCount: 0,
    toggleInPre: true,
    toggleParentInPre: true,
    pathNodesInPre: ["src/demo.py"],
    pathNodesOutsidePre: [],
    actionPlacement: "native-header",
  });
});

test("user messages are excluded from code block decoration", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "This DOM-level verification targets Chromium behavior.");

  const scripts = await Promise.all([
    readScript("extension/shared/uiStyles.js"),
    readScript("extension/content/pathMetadata.js"),
    readScript("extension/content/codeBlockMetadata.js"),
    readScript("extension/content/codeBlockState.js"),
    readScript("extension/content/codeBlockViewMode.js"),
    readScript("extension/content/codeBlockButtons.js"),
    readScript("extension/content/codeBlocks.js"),
  ]);

  await page.setContent(`<!doctype html>
<html lang="en">
  <body>
    <main>
      <div data-message-author-role="user" data-message-id="user-1">
        <p>PATH: src/user-note.ts</p>
        <pre>
          <div class="cgpt-mock-code-shell">
            <div class="cgpt-mock-code-header">
              <div class="cgpt-mock-code-label"><span>TypeScript</span></div>
              <div class="cgpt-mock-code-actions"><button aria-label="Copy"></button></div>
            </div>
            <div class="cgpt-mock-code-body">
              <code>console.log("user");</code>
            </div>
          </div>
        </pre>
      </div>
    </main>
  </body>
</html>`, { waitUntil: "domcontentloaded" });
  for (const script of scripts) {
    await page.addScriptTag({ content: script });
  }

  const result = await page.evaluate(() => {
    decorateCodeBlocks(document);
    const decoratedPre = document.querySelector("pre[data-cgpt-code-helper-applied='1']");
    const pre = document.querySelector("pre");
    const sourcePathNode = pre ? pre.previousElementSibling : null;
    return {
      hasDecoratedPre: Boolean(decoratedPre),
      sourcePathDisplay: sourcePathNode && sourcePathNode.style ? sourcePathNode.style.display || "" : "",
      sourcePathHiddenFlag: sourcePathNode && sourcePathNode.dataset
        ? sourcePathNode.dataset.cgptPathMetadataHidden || ""
        : "",
      pathInHeader: pre
        ? Array.from(pre.querySelectorAll("[data-cgpt-code-file-path='1']"))
            .map((node) => node.textContent.trim())
            .join(" | ")
        : "",
    };
  });

  expect(result).toEqual({
    hasDecoratedPre: false,
    sourcePathDisplay: "",
    sourcePathHiddenFlag: "",
    pathInHeader: "",
  });
});

test("header toggle switches compact mode from the left edge control", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "This DOM-level verification targets Chromium behavior.");

  const scripts = await Promise.all([
    readScript("extension/shared/uiStyles.js"),
    readScript("extension/content/pathMetadata.js"),
    readScript("extension/content/codeBlockMetadata.js"),
    readScript("extension/content/codeBlockState.js"),
    readScript("extension/content/codeBlockViewMode.js"),
    readScript("extension/content/codeBlockButtons.js"),
    readScript("extension/content/codeBlocks.js"),
  ]);

  await page.setContent(buildFixtureHtml(), { waitUntil: "domcontentloaded" });
  for (const script of scripts) {
    await page.addScriptTag({ content: script });
  }

  const result = await page.evaluate(() => {
    decorateCodeBlocks(document);
    const targetPre = document.querySelectorAll("pre[data-cgpt-code-helper-applied='1']")[0];
    const host = typeof cgptGetCompactContentHost === "function"
      ? cgptGetCompactContentHost(targetPre)
      : targetPre;
    const snapshot = () => {
      const toggle = targetPre.querySelector("[data-cgpt-code-toggle='1']");
      return {
        viewMode: targetPre.dataset.cgptViewMode || "",
        toggleExpanded: toggle ? toggle.getAttribute("aria-expanded") : "",
        toggleCount: targetPre.querySelectorAll("[data-cgpt-code-toggle='1']").length,
        hostDisplay: host && host.style ? host.style.display : "",
        hostMaxHeight: host && host.style ? host.style.maxHeight : "",
        hostOverflow: host && host.style ? host.style.overflow : "",
      };
    };

    const states = [snapshot()];
    targetPre.querySelector("[data-cgpt-code-toggle='1']")?.click();
    states.push(snapshot());
    targetPre.querySelector("[data-cgpt-code-toggle='1']")?.click();
    states.push(snapshot());
    return states;
  });

  expect(result).toHaveLength(3);
  expect(result[0]).toEqual({
    viewMode: "expanded",
    toggleExpanded: "true",
    toggleCount: 1,
    hostDisplay: "",
    hostMaxHeight: "",
    hostOverflow: "",
  });
  expect(result[1]).toEqual({
    viewMode: "compact",
    toggleExpanded: "false",
    toggleCount: 1,
    hostDisplay: "",
    hostMaxHeight: expect.any(String),
    hostOverflow: "hidden",
  });
  expect(result[1].hostMaxHeight).not.toBe("");
  expect(result[2]).toEqual({
    viewMode: "expanded",
    toggleExpanded: "true",
    toggleCount: 1,
    hostDisplay: "",
    hostMaxHeight: "",
    hostOverflow: "",
  });
});
