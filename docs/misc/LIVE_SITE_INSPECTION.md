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
