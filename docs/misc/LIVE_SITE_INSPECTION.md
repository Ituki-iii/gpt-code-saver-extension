# Live Site Inspection

ChatGPT の DOM に依存する改修では、実装前に Playwright で実サイトを観察します。
成果物はすべて `tests/artifacts/live-chatgpt-inspect/` 配下に保存され、git には含めません。

## Anonymous Mode

ログイン不要の到達確認や一般 DOM の観察に使います。

```bash
npm run inspect:chatgpt:anonymous
```

既定値:

- `CGPT_DEBUG_URL=https://chatgpt.com/`
- `CGPT_INSPECT_TARGET=general`
- `CGPT_HEADLESS=1`
- `CGPT_CHROMIUM_USER_DATA_DIR`: anonymous Chromium profile を再利用したい場合に指定

## Edge Profile Mode

履歴、Project、Bulk Chats などログイン済み状態が必要な調査に使います。

```bash
CGPT_INSPECT_TARGET=sidebar npm run inspect:chatgpt:profile
```

使える環境変数:

- `CGPT_EDGE_EXECUTABLE`: Edge executable path
- `CGPT_EDGE_USER_DATA_DIR`: Edge user data directory
- `CGPT_EDGE_PROFILE`: profile directory name, default `Default`
- `CGPT_EDGE_COPY_PROFILE=1`: profile を一時ディレクトリへコピーしてから起動
- `CGPT_HEADLESS=0`: visible browser で起動

## CDP Extension Reload Mode

ログイン済み Chromium を CDP port 付きで使い、ローカルの unpacked extension を読み込んで Bulk Chats を実機確認する手順です。
ChatGPT ログインや Cloudflare challenge は自動化せず、既存 profile を使います。

既存 Chromium が `--load-extension` なしで起動している場合、`chrome://extensions` から CDP だけで unpacked extension を後読み込みできないことがあります。
その場合は同じ profile を `--load-extension` 付きで再起動します。

```bash
EXT=/home/codex/codex-work/chatgpt-code-saver/extension
CHROME=/home/codex/.cache/ms-playwright/chromium-1161/chrome-linux/chrome
PROFILE=/home/codex/.local/share/chatgpt-code-saver/chrome-profile
CHAT_URL=https://chatgpt.com/

# 既存 CDP Chromium を閉じる。必要なら現在 URL を控えてから実行する。
node - <<'NODE'
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const session = await browser.newBrowserCDPSession();
  await session.send("Browser.close");
})().catch(() => {});
NODE

for i in $(seq 1 20); do
  curl -sf http://127.0.0.1:9222/json/version >/dev/null || break
  sleep 0.5
done

setsid -f "$CHROME" \
  --user-data-dir="$PROFILE" \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --no-first-run \
  --no-default-browser-check \
  --ozone-platform=x11 \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port=9222 \
  --disable-extensions-except="$EXT" \
  --load-extension="$EXT" \
  "$CHAT_URL" \
  >/tmp/chatgpt-code-saver-chrome.log 2>&1

for i in $(seq 1 60); do
  curl -sf http://127.0.0.1:9222/json/version >/dev/null && break
  sleep 0.5
done
```

拡張が読み込まれたか確認します。

```bash
node - <<'NODE'
(async () => {
  const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
  console.log(JSON.stringify(
    targets
      .map((target) => ({ type: target.type, title: target.title, url: target.url }))
      .filter((target) => target.url.includes("chrome-extension://") || target.url.includes("chatgpt.com")),
    null,
    2
  ));
})();
NODE
```

期待値:

- `service_worker` target に `chrome-extension://.../background/index.js` が出る
- ChatGPT page target が出る

Bulk Chats の最小動作確認:

```bash
node - <<'NODE'
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  const page = context.pages().find((candidate) => /chatgpt\.com/.test(candidate.url())) || context.pages()[0];

  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(5_000);

  const before = await page.evaluate(() => ({
    hasBulkToggle: Boolean(document.getElementById("cgpt-helper-sidebar-bulk-toggle")),
    helperIds: Array.from(document.querySelectorAll("[id^='cgpt-helper']")).map((node) => node.id),
  }));
  console.log("before", JSON.stringify(before, null, 2));

  await page.locator("#cgpt-helper-sidebar-bulk-toggle").click({ timeout: 10_000 });
  await page.waitForTimeout(12_000);

  const after = await page.evaluate(() => {
    const panel = document.getElementById("cgpt-helper-sidebar-bulk-panel");
    const summary = document.getElementById("cgpt-helper-sidebar-bulk-summary");
    const select = document.getElementById("cgpt-helper-sidebar-bulk-project-select");
    const list = document.getElementById("cgpt-helper-sidebar-bulk-list");
    const results = document.getElementById("cgpt-helper-sidebar-bulk-results");
    return {
      panelVisible: Boolean(panel && getComputedStyle(panel).display !== "none"),
      summary: summary ? summary.textContent : "",
      projectSelectDisabled: select ? select.disabled : null,
      projectOptions: select ? Array.from(select.options).map((option) => option.textContent).slice(0, 20) : [],
      listChildCount: list ? list.children.length : null,
      listTextSample: list ? String(list.textContent || "").replace(/\s+/g, " ").trim().slice(0, 500) : "",
      resultsText: results ? String(results.textContent || "").replace(/\s+/g, " ").trim().slice(0, 500) : "",
    };
  });
  console.log("after", JSON.stringify(after, null, 2));

  await browser.close();
})();
NODE
```

期待値:

- `hasBulkToggle: true`
- `panelVisible: true`
- `projectSelectDisabled: false`
- `projectOptions` に実 Project 名が入る
- `listChildCount` が 1 以上

`resultsText` に `conversations_fetch / 429` が出ても、Project API が成功していれば Project select は表示されるべきです。

## Feature Targets

`CGPT_INSPECT_TARGET` で重点収集する DOM を切り替えます。

```bash
CGPT_INSPECT_TARGET=sidebar npm run inspect:chatgpt:feature
CGPT_INSPECT_TARGET=chatlog npm run inspect:chatgpt:feature
CGPT_INSPECT_TARGET=codeblocks npm run inspect:chatgpt:feature
CGPT_INSPECT_TARGET=share npm run inspect:chatgpt:profile
CGPT_INSPECT_TARGET=project-move npm run inspect:chatgpt:profile
```

Targets:

- `general`: textbox, helper panel, anchors, menu/dialog/listbox counts
- `sidebar`: left nav, conversation anchors, row buttons, open menus
- `chatlog`: message nodes, message ids, model/time-like attributes, rich markdown
- `codeblocks`: `pre/code`, copy/save buttons, language/test id candidates
- `share`: share dialog, create link controls, URL fields
- `project-move`: row menu, Project picker, option roles/text

## Artifacts

Each run writes a directory named `<target>-<mode>-<timestamp>`.

- `page.png`: full page screenshot
- `page-state.json`: url/title/readyState/textbox/helper panel/challenge state
- `dom-summary.json`: selector counts and feature-level counts
- `candidate-elements.json`: tag/role/href/aria label/title/test id/text/html samples
- `open-containers.json`: menu/dialog/listbox/popover samples
- `feature-samples.json`: larger sidebar/message/code HTML samples for local inspection

Use `dom-summary.json` first, then inspect `candidate-elements.json` for stable role/text/data-testid/nearby structure.
Avoid implementing against volatile generated class names unless no stable alternative exists.

## Login Or Challenge States

If `page-state.json` has `challengeState: true`, rerun with a visible profile browser:

```bash
CGPT_HEADLESS=0 CGPT_INSPECT_TARGET=general npm run inspect:chatgpt:profile
```

Complete the browser challenge or login manually, then rerun the target inspection.
For WSL Japanese input or visible browser setup, see [WSL_PLAYWRIGHT_JA_SETUP.md](WSL_PLAYWRIGHT_JA_SETUP.md).

## Fixture Updates

Do not commit raw live-site artifacts.
When updating fixtures, copy only the smallest DOM fragment needed to reproduce the behavior under test.
