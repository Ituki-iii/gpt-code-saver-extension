# DEVELOPERS

このドキュメントでは ChatGPT Code Saver の構成、メッセージフロー、開発時の注意点をまとめます。
ユーザー向けの概要、導入手順、通常の使い方は [README.md](README.md) を参照してください。

## 目的

この拡張は 1 つの MV3 パッケージとして、主に次の 2 系統の機能を提供します。

- コードブロック保存
- チャット補助機能
  - Templates
  - Chat Log
  - Download Log
  - Sidebar Bulk Chats
  - Heading / code block view controls

## ディレクトリ構成

```text
extension/
  manifest.json
  background/
    index.js
    applyCode.js
    logStore.js
    messageHandlers.js
    projectFolderSelector.js
    reloadState.js
    templateStore.js
  content/
    init.js
    state.js
    defaultTemplate.js
    templateStore.js
    templateEditor.js
    panel*.js
    codeSaverFeature.js
    codeBlocks.js
    codeBlockObserver.js
    codeBlockButtons.js
    codeBlockMetadata.js
    codeBlockState.js
    codeBlockViewMode.js
    saveFlow.js
    chatToolsFeature.js
    sidebarBulkFeature.js
    sidebarBulkState.js
    sidebarApiDiagnostics.js
    sidebarApiDataSource.js
    sidebarConversationTracker.js
    sidebarBulkActions.js
    sidebarBulkPanel.js
    chatLogTracker.js
    chatLogObserver.js
    chatLogModal*.js
    chatHeadingFold.js
    chatLogFold.js
    lightweightMode*.js
    reloadNotifier.js
    extensionToggle.js
    toast.js
    assistantLabel.js
    chatInput.js
  shared/
    filePathValidation.js
    projectFolderSettings.js
    uiStyles.js

tests/
  e2e/
  unit/
  fixtures/
  helpers/
  tools/
  config/
```

## 初期化フロー

エントリポイントは `extension/content/init.js` です。

1. `checkAndNotifyReloaded()` で再読み込み通知状態を確認
2. `cgptLoadExtensionEnabled()` で拡張有効状態を読む
3. `loadTemplatesFromStorage()` でテンプレートを初期化
4. 各種 panel state を読み込む
   - view settings
   - panel visibility
   - lightweight mode
   - save options
5. UI を生成し、機能ごとの初期化を呼ぶ
   - `cgptInitCodeSaverFeature(document)`
   - `cgptInitChatToolsFeature(document)`
   - `cgptInitSidebarBulkFeature(document)`

## ランタイムメッセージ

Background 側のハンドラは `extension/background/messageHandlers.js` で集約しています。

主な message type:

- `applyCodeBlock`
  - コード保存本体
- `pickDownloadFolder`
  - フォルダ選択 UI
- `getTemplates` / `setTemplates`
  - テンプレートの取得と保存
- `getLogs` / `clearLogs`
  - Download Log の取得と削除
- `openDownloadedFile`
  - 保存済みファイルを OS 側で開く

## 保存フロー

共通の保存処理は `extension/content/saveFlow.js` の `cgptRunSaveAction()` に寄せています。

ルール:

- `Save` は既定の project folder を基準に保存します。
- `Save As` は保存先を都度選びます。
- `Save All` / `Save As All` は複数コードブロックをまとめて処理します。
- `file:` メタデータがある場合は、その相対パスを優先します。
- `Remove the first "file:" line when saving` が有効なら、保存時に先頭メタデータ行を除去します。
- `overrideFolderPath` は一括保存や別フォルダ保存時に使います。

### Chat Log 由来のコード保存

Chat Log モーダルは、`file:` 行ありのコードブロックと、通常の fenced code block の両方を扱います。

- `file:` 行あり
  - その相対パスを利用
- `file:` 行なし
  - `chat-code-blocks/` 配下に生成パスを割り当て
  - 例: `<language>-block-<n>.<ext>`
  - 言語不明時は `code-block-<n>.txt`

この生成パスは `Save` / `Save As` / `Save All` / `Save As All` でそのまま使える前提です。

## 機能ごとの責務

### Background

- `applyCode.js`
  - `chrome.downloads.download` を使った保存処理
- `logStore.js`
  - Download Log の永続化
- `templateStore.js`
  - template の永続化
- `projectFolderSelector.js`
  - フォルダ選択 UI の橋渡し
- `reloadState.js`
  - 拡張再読み込み状態の管理

### Content

- `codeSaverFeature.js`
  - コード保存機能の初期化
- `codeBlocks.js`
  - コードブロック装飾
- `codeBlockObserver.js`
  - コードブロック監視
- `chatToolsFeature.js`
  - chat tool 系機能の初期化
- `sidebarBulkFeature.js`
  - Bulk Chats 機能の初期化
- `sidebarBulkState.js`
  - 検索文字列、選択 Set、実行状態の保持
- `sidebarApiDiagnostics.js`
  - internal API 失敗時の phase / endpoint / status と debug export
- `sidebarApiDataSource.js`
  - ChatGPT internal API から会話一覧と Project 一覧を取得
- `sidebarConversationTracker.js`
  - API snapshot の保持と refresh orchestration
- `sidebarBulkActions.js`
  - 左ペイン会話メニューを順に操作して archive / delete / project move を実行
- `sidebarBulkPanel.js`
  - Bulk Chats のトグルボタンと独立パネル UI
- `chatLogTracker.js`
  - 発話、見出し、コード、リンクの収集
- `chatLogObserver.js`
  - Chat Log 用の監視と route watch
- `templateStore.js` / `templateEditor.js`
  - template の content-side state と editor UI
- `panel*.js`
  - 右下パネルの構築
- `lightweightMode*.js`
  - 軽量表示と preview lines 制御

### Shared

- `filePathValidation.js`
  - 保存パスの検証
- `projectFolderSettings.js`
  - project folder state
- `uiStyles.js`
  - ボタン、surface、text tone などの共通 UI token

## UI 実装ルール

- 新しいボタンは `extension/shared/uiStyles.js` の共通 API を使う
- Bulk Chats の検索選択 state は DOM 表示状態に持たせず、会話 id ベースで保持する
- Bulk Chats の一覧取得は internal API を優先し、取得失敗時は DOM fallback せず hard fail とする
- internal API で取得できても、実操作は UI ベースのため DOM に row が無い会話は `skipped_missing_dom` になる
- content 側で色、角丸、余白、フォントサイズを直書きしすぎない
- variant は既存の `primary`, `secondary`, `ghost`, `danger` を優先する
- disabled 状態は `button.disabled = true` を基本にし、見た目だけで表現しない
- フォーカス、hover、compact 状態の検証が必要なら既存 E2E を追加・更新する

## UI 棚卸しルール

UI 整理の相談、ボタン一覧、ツリー表示、導線見直しを行うときは、実装済み要素と提案要素を混ぜないこと。

- 現状 UI の棚卸しでは、repo 上で確認できる操作要素だけを列挙する。
- 追加予定のボタンや入力がある場合は、`提案` と明記する。
- 現状ツリーと整理後ツリーは分けて書く。
- ユーザーが「知らないボタンがある」と指摘した場合は、提案の正しさではなく棚卸しの正確さに問題がある前提で再確認する。
- `Chat Log`, `Templates`, `Bulk Chats`, `Quick Settings` のような独立入口を扱うときは、入口とパネル内操作を分けて整理する。

## テスト

主要なテスト群:

- unit
  - `tests/unit/*.test.js`
- regression e2e
  - `tests/e2e/*.spec.js`
- UI evidence
  - `tests/e2e/ui-screens.spec.js`
- README workflow regression
  - `tests/e2e/readme-behavior.spec.js`
- Playwright 実行手順と skip / fail の切り分け
  - `docs/misc/PLAYWRIGHT_VERIFICATION.md`

よく使うコマンド:

```bash
npm test
npm run test:unit
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:live
```

Playwright の実行順、`skipped` の切り分け、live / CDP 前提の確認手順は [docs/misc/PLAYWRIGHT_VERIFICATION.md](docs/misc/PLAYWRIGHT_VERIFICATION.md) を参照してください。

## 開発補助ツール

### ChatGPT 実サイトを先に参照する

ChatGPT の DOM に依存する改修では、fixture や実装を直す前に実サイトの状態を Playwright で確認します。
特に Sidebar Bulk Chats、Chat Log、code block、share dialog、Project move は UI 変更の影響を受けやすいため、該当 feature の成果物 JSON を見てから selector や fixture を更新してください。

#### Chat Log 回帰対応の再発防止

Chat Log の欠落や role 誤判定を直す場合は、表示密度、余白、プレビュー行数などの見た目から触らず、まず発話抽出の単位と role 判定を確認します。

- 実機確認では、バッジ数や領域数だけで判断しない。
- 問題になっている本文が、ChatGPT 画面上で `user` / `assistant` のどちらの発話として存在するかを本文ベースで確認する。
- Chat Log 側でも、同じ本文が同じ role の entry として出ているかを確認する。
- `section[data-testid^="conversation-turn-"]` のような turn host と、その内側の `[data-message-author-role]` の関係を先に調べる。
- プレビュー行数、カード余白、密度調整は、抽出と role 判定が正しいと確認できた後にだけ変更する。
- 既存の Chat Log 機能、特に保存、fold、timestamp、コードブロック抽出の流れを置き換えない。必要な変更は発話 host の解決と role 判定に限定する。

```bash
npm run inspect:chatgpt:anonymous
CGPT_INSPECT_TARGET=sidebar npm run inspect:chatgpt:feature
CGPT_INSPECT_TARGET=chatlog npm run inspect:chatgpt:profile
```

主な出力先:

- `tests/artifacts/live-chatgpt-inspect/<target-mode-timestamp>/page.png`
- `tests/artifacts/live-chatgpt-inspect/<target-mode-timestamp>/page-state.json`
- `tests/artifacts/live-chatgpt-inspect/<target-mode-timestamp>/dom-summary.json`
- `tests/artifacts/live-chatgpt-inspect/<target-mode-timestamp>/candidate-elements.json`
- `tests/artifacts/live-chatgpt-inspect/<target-mode-timestamp>/open-containers.json`

実サイト由来の HTML やスクリーンショットは `tests/artifacts/` に留め、コミットしません。
fixture に反映する場合は、テストに必要な最小 DOM だけを取り込みます。
詳しい運用は [LIVE_SITE_INSPECTION.md](docs/misc/LIVE_SITE_INSPECTION.md) を参照してください。

### ChatGPT Share URL から素材を取得する

共有 URL から HTML、スクリーンショット、CSS、先頭コードブロックなどを保存できます。
README の利用者向け導線ではなく、fixture 作成、UI 調査、回帰確認向けの補助ツールとして扱います。

```bash
npm run fetch:share-assets -- https://chatgpt.com/share/your-share-id
```

主な出力先:

- `tests/artifacts/chatgpt-share-assets/<share-id>/page.html`
- `tests/artifacts/chatgpt-share-assets/<share-id>/page.png`
- `tests/artifacts/chatgpt-share-assets/<share-id>/first-code-block.html`
- `tests/artifacts/chatgpt-share-assets/<share-id>/metadata.json`
- `tests/artifacts/chatgpt-share-assets/<share-id>/styles/*.css`

## ドキュメント更新ルール

- ユーザー向けの導線変更
  - README を更新
- アーキテクチャ、責務分割、メッセージ追加
  - DEVELOPERS を更新
- 権限追加や削除
  - `extension/manifest.json` と README の両方を確認
- README 画像を更新した場合
  - まず `npm run capture:readme-screens:x11` で `docs/images/readme/` を更新する
  - `docs/images/readme/` を差し替える
  - 必要なら `tests/e2e/readme-behavior.spec.js` と `tests/e2e/ui-screens.spec.js` の期待を見直す

## 現在の注意点

- `package.json` と `extension/manifest.json` の version はどちらも `0.6.14`。
  - version を上げるときは片方だけ更新しない。
- 環境によっては Playwright の persistent context で content script 注入確認が skip になることがあります。
  - README 画像更新時は `tests/e2e/*.spec.js` だけに依存せず、`npm run capture:readme-screens:x11` を使う。
- Bulk Chats は ChatGPT 左ペイン DOM に依存するため、UI 変更時は `tests/fixtures/chatgpt-sidebar-bulk-mock.html` と関連 e2e を先に確認する。
