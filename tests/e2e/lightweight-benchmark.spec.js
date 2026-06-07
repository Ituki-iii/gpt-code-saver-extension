const fs = require("fs/promises");
const path = require("path");
const { test, expect } = require("@playwright/test");

const repoRoot = path.join(__dirname, "..", "..");
const artifactsRoot = path.join(__dirname, "..", "artifacts", "lightweight-benchmark");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readScript(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), "utf8");
}

function buildFixtureHtml() {
  const codeLines = Array.from({ length: 90 }, (_, lineIndex) => {
    const line = String(lineIndex + 1).padStart(3, "0");
    return `<span class="token keyword">const</span> value${line} = <span class="token string">"line-${line}"</span>;`;
  }).join("\n");

  const blocks = Array.from({ length: 24 }, (_, index) => {
    return `
      <section class="message-card" data-message-author-role="assistant" data-message-id="bench-${index}">
        <h2>Benchmark Block ${index + 1}</h2>
        <pre data-cgpt-view-mode="compact"><code>${codeLines}</code></pre>
      </section>
    `;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lightweight Mode Benchmark</title>
    <style>
      :root {
        color-scheme: dark;
      }
      body {
        margin: 0;
        font-family: sans-serif;
        background:
          radial-gradient(circle at top, rgba(56, 189, 248, 0.14), transparent 30%),
          linear-gradient(180deg, #0f172a 0%, #020617 100%);
        color: #e2e8f0;
      }
      main {
        max-width: 1100px;
        margin: 0 auto;
        padding: 32px 24px 80px;
      }
      .message-card {
        margin-bottom: 20px;
        padding: 18px;
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.78);
        backdrop-filter: blur(14px);
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.35);
      }
      pre {
        margin: 14px 0 0;
        padding: 16px 18px;
        overflow: auto;
        border-radius: 14px;
        background: rgba(15, 23, 42, 0.96);
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.3);
      }
      code {
        display: block;
        white-space: pre-wrap;
        line-height: 1.55;
        text-shadow: 0 1px 0 rgba(15, 23, 42, 0.65);
      }
      .token {
        transition: color 120ms ease, background-color 120ms ease;
      }
      .keyword {
        color: #7dd3fc;
      }
      .string {
        color: #86efac;
        background: rgba(34, 197, 94, 0.12);
      }
      #status {
        position: sticky;
        top: 16px;
        z-index: 1;
        margin-bottom: 20px;
        padding: 12px 14px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(15, 23, 42, 0.82);
        backdrop-filter: blur(16px);
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.32);
      }
    </style>
  </head>
  <body>
    <main>
      <div id="status">idle</div>
      <div id="generation-state"></div>
      ${blocks}
    </main>
  </body>
</html>`;
}

test("@benchmark lightweight mode benchmark captures comparative timings", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Benchmark is intended for Chromium.");

  const stateDir = path.join(artifactsRoot, "state");
  const screenshotDir = path.join(artifactsRoot, "screenshots");
  await Promise.all([ensureDir(stateDir), ensureDir(screenshotDir)]);

  const lightweightScript = await readScript("extension/content/lightweightMode.js");

  await page.setContent(buildFixtureHtml(), { waitUntil: "domcontentloaded" });
  await page.addScriptTag({
    content: `
      window.CGPT_LIGHTWEIGHT_MODES = {
        NORMAL: "normal",
        AUTO: "auto",
        LIGHT: "light",
      };
      window.CGPT_DEFAULT_LIGHTWEIGHT_MODE = window.CGPT_LIGHTWEIGHT_MODES.AUTO;
    `,
  });
  await page.addScriptTag({ content: lightweightScript });

  const result = await page.evaluate(async () => {
    const raf = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const preNodes = Array.from(document.querySelectorAll("pre"));
    const codeNodes = Array.from(document.querySelectorAll("pre code"));
    const tokenNodes = Array.from(document.querySelectorAll(".token"));
    const statusNode = document.getElementById("status");
    const generationStateNode = document.getElementById("generation-state");

    const setGenerating = (isGenerating) => {
      generationStateNode.textContent = isGenerating ? "generating" : "idle";
      let stopButton = generationStateNode.querySelector("button");
      if (isGenerating) {
        if (!stopButton) {
          stopButton = document.createElement("button");
          stopButton.type = "button";
          stopButton.setAttribute("aria-label", "Stop generating");
          generationStateNode.appendChild(stopButton);
        }
        return;
      }
      if (stopButton) {
        stopButton.remove();
      }
    };

    const runPass = async (mode, sampleIndex, options = {}) => {
      setGenerating(Boolean(options.generating));
      cgptApplyLightweightMode(mode);
      await raf();
      await raf();

      const start = performance.now();
      let layoutChecksum = 0;
      let styleChecksum = 0;

      for (let iteration = 0; iteration < 45; iteration += 1) {
        statusNode.textContent = `${mode}-${sampleIndex}-${iteration}`;

        for (let preIndex = 0; preIndex < preNodes.length; preIndex += 1) {
          const pre = preNodes[preIndex];
          pre.dataset.cgptViewMode = iteration % 3 === 0 ? "expanded" : "compact";
          layoutChecksum += pre.scrollHeight;
          layoutChecksum += Math.round(pre.getBoundingClientRect().height);
        }

        for (let codeIndex = 0; codeIndex < codeNodes.length; codeIndex += 1) {
          styleChecksum += getComputedStyle(codeNodes[codeIndex]).whiteSpace.length;
        }

        for (let tokenIndex = 0; tokenIndex < tokenNodes.length; tokenIndex += 31) {
          const styles = getComputedStyle(tokenNodes[tokenIndex]);
          styleChecksum += styles.color.length + styles.backgroundColor.length;
        }

        await raf();
      }

      return {
        mode,
        sampleIndex,
        generating: Boolean(options.generating),
        durationMs: performance.now() - start,
        layoutChecksum,
        styleChecksum,
        rootHasClass: document.documentElement.classList.contains("cgpt-lightweight"),
        bodyHasClass: document.body.classList.contains("cgpt-lightweight"),
        status: statusNode.textContent,
      };
    };

    await runPass("normal", "warmup");
    await runPass("auto", "warmup", { generating: true });
    await runPass("light", "warmup");

    const samples = [];
    for (let index = 0; index < 3; index += 1) {
      samples.push(await runPass("normal", index));
      samples.push(await runPass("auto", index, { generating: true }));
      samples.push(await runPass("light", index));
    }

    const summarize = (mode) => {
      const modeSamples = samples.filter((sample) => sample.mode === mode);
      const total = modeSamples.reduce((sum, sample) => sum + sample.durationMs, 0);
      return {
        sampleCount: modeSamples.length,
        averageDurationMs: total / modeSamples.length,
        minDurationMs: Math.min(...modeSamples.map((sample) => sample.durationMs)),
        maxDurationMs: Math.max(...modeSamples.map((sample) => sample.durationMs)),
      };
    };

    const summary = {
      normal: summarize("normal"),
      auto: summarize("auto"),
      light: summarize("light"),
    };

    cgptApplyLightweightMode("normal");
    setGenerating(false);

    return {
      samples,
      summary,
      ratios: {
        autoToNormal: summary.auto.averageDurationMs / summary.normal.averageDurationMs,
        lightToNormal: summary.light.averageDurationMs / summary.normal.averageDurationMs,
      },
    };
  });

  expect(result.summary.normal.sampleCount).toBe(3);
  expect(result.summary.auto.sampleCount).toBe(3);
  expect(result.summary.light.sampleCount).toBe(3);
  expect(result.samples.every((sample) => sample.durationMs > 0)).toBe(true);
  expect(result.samples.every((sample) => sample.layoutChecksum > 0)).toBe(true);
  expect(
    result.samples
      .filter((sample) => sample.mode === "auto")
      .every((sample) => sample.rootHasClass && sample.bodyHasClass && sample.generating)
  ).toBe(true);
  expect(
    result.samples
      .filter((sample) => sample.mode === "light")
      .every((sample) => sample.rootHasClass && sample.bodyHasClass)
  ).toBe(true);
  expect(
    result.samples
      .filter((sample) => sample.mode === "normal")
      .every((sample) => !sample.rootHasClass && !sample.bodyHasClass)
  ).toBe(true);
  expect(result.ratios.autoToNormal).toBeLessThan(1.6);
  expect(result.ratios.lightToNormal).toBeLessThan(1.6);

  await Promise.all([
    page.screenshot({
      path: path.join(screenshotDir, "lightweight-benchmark.png"),
      fullPage: true,
    }),
    fs.writeFile(
      path.join(stateDir, "lightweight-benchmark.json"),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8"
    ),
  ]);
});
