# Playwright Verification Procedure

2026-06-22 時点の、この repo での動作確認手順です。  
目的は次の 3 つです。

- 変更後に unit と Playwright のどこまで通るかを再現できること
- `failed` と `skipped` の意味を切り分けられること
- live / CDP 前提のテストを別扱いで確認できること

## 1. Unit Test

まず unit を実行します。

```bash
npm test
```

期待:

- `tests/unit/*.test.js` がすべて pass する

## 2. Playwright Full

最初に full suite を 1 回流し、pass / skip / fail の全体像を取ります。

```bash
node tests/tools/run-playwright.js test --config tests/playwright.full.config.js
```

確認ポイント:

- `passed`
  - DOM-only の fixture test
  - benchmark
  - service worker / manifest 確認
- `skipped`
  - extension persistent context を使う probe 系
  - fixture 未収集前提の replay 系
- `failed`
  - live 接続や CDP 前提で本当に壊れているもの

2026-06-21 の実行結果:

- `17 passed`
- `39 skipped`
- `1 failed`

失敗したのは次です。

- `tests/e2e/chatgpt-live-chat-log-cdp.spec.js`
  - `chromium.connectOverCDP("http://127.0.0.1:9222")` が 30 秒 timeout

## 3. 主要コマンド

カテゴリ別に切って確認したい場合は次を使います。

Regression:

```bash
node tests/tools/run-playwright.js test --config tests/playwright.regression.config.js
```

UI evidence:

```bash
node tests/tools/run-playwright.js test --config tests/playwright.ui.config.js
```

README screenshot refresh:

```bash
npm run capture:readme-screens:x11
```

Benchmark:

```bash
node tests/tools/run-playwright.js test --config tests/playwright.benchmark.config.js
```

Live:

```bash
node tests/tools/run-playwright.js test --config tests/playwright.live.config.js
```

## 4. PATH Save Flow 変更後の重点確認

`PATH:` ベースの保存先解決を触ったときは、最低でも次を確認します。

```bash
npm test
node tests/tools/run-playwright.js test --config tests/playwright.regression.config.js tests/e2e/compact-code-header.spec.js
node tests/tools/run-playwright.js test --config tests/playwright.benchmark.config.js tests/e2e/code-block-responsiveness.spec.js
```

期待:

- `compact-code-header.spec.js`
  - code block header に path が出る
  - compact / expand を繰り返しても path が壊れない
- `code-block-responsiveness.spec.js`
  - repeated mutation 後も wrapper 数と path 数が崩れない

## 5. Skipped Test の切り分け

`-` 表示の test は、すぐに回帰と判断しないこと。  
次の 2 系統があります。

### A. probeExtensionContext 系

対象例:

- `readme-behavior.spec.js`
- `ui-screens.spec.js`
- `chatgpt-chat-log-turn-host-offline.spec.js`
- `chatgpt-rich-markdown-extension-offline.spec.js`
- `sidebar-bulk-extension-offline.spec.js`

これらは `tests/helpers/e2eEnvironment.js` の `probeExtensionContext()` が成功しないと skip されます。

切り分け用コマンド:

```bash
node -e 'const path=require("path"); const fs=require("fs/promises"); const { chromium } = require("@playwright/test"); const { probeExtensionContext } = require("./tests/helpers/e2eEnvironment"); (async()=>{ const profileBaseDir=path.join(process.cwd(),"tests","artifacts","probe-debug","profiles"); await fs.mkdir(profileBaseDir,{recursive:true}); const profileDir=await fs.mkdtemp(path.join(profileBaseDir,"run-")); const extensionPath=path.join(process.cwd(),"extension"); const result=await probeExtensionContext({ chromium, profileDir, extensionPath }); console.log(JSON.stringify(result.ok ? { ok: true } : result, null, 2)); if (result.context) await result.context.close().catch(()=>{}); })();'
```

2026-06-21 の確認結果:

- `ok: false`
- reason: `Extension content scripts did not inject into the probe page.`

このときは panel や code block UI は挿入されていても、probe が待っている `.cgpt-helper-message-body` / `.cgpt-helper-fold` が生成されていない可能性があります。

README 画像だけ更新したい場合は、この系統の skip を解消しようとせず `npm run capture:readme-screens:x11` を優先してよいです。

### B. fixture 未収集 / 条件未充足系

対象例:

- `heading-variations-offline.spec.js`
- `chatgpt-ui-patterns-extension-offline.spec.js`

これらは fixture manifest や前提 artifact が無いと skip されることがあります。  
失敗ではなく、前提データ未準備として扱います。

## 6. Live / CDP 系の確認

### live smoke

```bash
node tests/tools/run-playwright.js test --config tests/playwright.live.config.js tests/e2e/chatgpt-live-smoke.spec.js
```

期待:

- ChatGPT 到達性
- extension injection

### live chat log cdp

```bash
node tests/tools/run-playwright.js test --config tests/playwright.live.config.js tests/e2e/chatgpt-live-chat-log-cdp.spec.js
```

前提:

- `http://127.0.0.1:9222` で既存 Chromium の CDP が待ち受けていること
- 必要なら `CGPT_CDP_URL` を指定すること

例:

```bash
CGPT_CDP_URL=http://127.0.0.1:9333 \
node tests/tools/run-playwright.js test --config tests/playwright.live.config.js tests/e2e/chatgpt-live-chat-log-cdp.spec.js
```

CDP browser の準備手順は [LIVE_SITE_INSPECTION.md](./LIVE_SITE_INSPECTION.md) を参照します。

## 7. レポート確認

full 実行後の HTML report:

```bash
npx playwright show-report tests/playwright-report-full
```

標準の report:

```bash
npx playwright show-report tests/playwright-report
```

## 8. 現在の扱い

2026-06-21 時点では、Playwright の評価は次のように扱います。

- `passed`
  - 変更の直接影響範囲で回帰なし
- `skipped`
  - probe / fixture / environment 条件を再確認してから判断
- `failed`
  - 原則として要調査

特に `PATH:` 保存フローの変更では、まず DOM-only の spec と unit を通し、その後に probe 系と live 系を切り分けて確認すること。
