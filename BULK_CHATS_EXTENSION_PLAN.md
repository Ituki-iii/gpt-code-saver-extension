# Bulk Chats / Chat Metadata 拡張計画 v3

## Progress
- Status: planning documented, implementation not started.
- Recorded at: 2026-05-01
- Current repository progress:
  - Bulk Chats の既存実装位置を確認済み
  - Chat Log の timestamp / model label / badge 表示の既存実装位置を確認済み
  - `Load Chats`, `snapshotStatus`, `titleBatch`, `Pin Selected`, `Share Selected`, `Export Visible CSV` は未実装であることを確認済み
  - 共有アイコンは旧計画の `↗` から `🔗` に更新済み
- Confirmed target files:
  - `extension/content/sidebarBulkState.js`
  - `extension/content/sidebarBulkPanel.js`
  - `extension/content/sidebarBulkActions.js`
  - `extension/content/sidebarConversationTracker.js`
  - `extension/content/sidebarApiDataSource.js`
  - `extension/content/chatLogTracker.js`
  - `extension/content/chatLogModal.js`
  - `extension/content/assistantLabel.js`
  - `tests/unit/*`
  - `tests/e2e/sidebar-bulk-extension-offline.spec.js`
  - `tests/fixtures/chatgpt-sidebar-bulk-mock.html`
- Implementation progress by phase:
  - Phase 1: not started
  - Phase 2: not started
  - Phase 3: not started
  - Phase 4: not started
  - Phase 5: not started
  - Phase 6: not started
  - Phase 7: not started
  - Phase 8: not started
- Notes:
  - 現時点で repo tracked file の実装コード変更は未着手
  - 次の実装開始点は `sidebarBulkState.js` と `sidebarBulkActions.js` の state/action 拡張が最短
  - 実装前に `CGPT_INSPECT_TARGET=sidebar npm run inspect:chatgpt:profile` を実行し、実サイトの左ペイン row / menu / Project picker の DOM を確認してから fixture と selector を更新する

## Summary
- 既存の Bulk Chats は一覧取得・選択・一括 action の骨格はありますが、Project 配下会話の除外、初回自動読込、action 種別不足、一覧 row の情報配置の不揃いが制約です。
- 今回は前回計画に加えて、`Bulk Chat 一覧で ID 表示位置を揃える`、`Chat 実行時のモデルと時刻を拡張機能内に記録し、User アイコン横に表示する`、`共有リンク作成アイコンを鎖にする` を追加します。
- `pin` と `share` は単発・一括の両方を対象にし、各行タイトル後ろの単発 action は `✎ / 📌 / 🔗` に固定します。
- `投稿者` と `投稿日時` は CSV では未取得時に空欄を許容しますが、Chat Log 系 UI では別途メッセージ時刻を記録・表示する前提で進めます。

## Priority / Credit
| Phase | タスク | リスク | 相対クレジット | 累計目安 | 着手順 |
| --- | --- | --- | --- | --- | --- |
| 1 | Project 配下チャットを一覧・検索・選択・action 対象へ拡大 + ID 列整列 | 中 | 4-5 pt | 4-5 pt | 1 |
| 2 | Chat タイトル一括変更（prefix/suffix） | 低-中 | 2-3 pt | 6-8 pt | 2 |
| 3 | Chat 実行時のモデル/時刻を記録し User アイコン横に表示 | 中 | 4-5 pt | 10-13 pt | 3 |
| 4 | Chat 一覧 CSV エクスポート | 低 | 2 pt | 12-15 pt | 4 |
| 5 | 単発 + 一括ピン止め | 中-高 | 5-6 pt | 17-21 pt | 5 |
| 6 | 単発 + 一括共有 + URL 集約コピー | 高 | 7-9 pt | 24-30 pt | 6 |
| 7 | Bulk Chat フリーズ対策（手動初回読込 + キャッシュ） | 高 | 7-9 pt | 31-39 pt | 7 |
| 8 | 全体リファクタリング | 高 | 5-7 pt | 36-46 pt | 8 |

## Implementation Spec
0. Phase 1 着手前に live sidebar inspection を実施します。`tests/artifacts/live-chatgpt-inspect/` の `candidate-elements.json`, `open-containers.json`, `dom-summary.json` を確認し、ChatGPT 実サイトの role/text/data-testid/近傍構造を fixture 更新の根拠にします。
1. Phase 1 では `cgptFilterSidebarConversations` の Project 除外を外し、Project 配下チャットも一覧・検索・選択・各 action の対象に含めます。行 UI には `Project: <name>` のメタ表示を追加し、summary は `Visible / Filtered / Selected / Project` 件数に変更します。
2. Bulk row レイアウトは現状の緩い flex から 3 カラム構成に変更し、`checkbox | title/actions | id/meta` の表示位置を固定します。右端の ID/meta カラムは固定幅かつ右寄せにし、全 row で `conversationId / Current chat / Project label` の開始位置が揃うようにします。
3. action 実行ロジックは `conversation.isProjectItem` による全体 skip をやめ、action ごとに `supported / skipped / failed` を返す戦略に変更します。これにより Project 配下でも rename/pin/share/export は対象にし、ChatGPT 側 UI に項目が無い action だけ `skipped_*` に落とします。
4. Phase 2 では Bulk panel に `Prefix` 入力、`Suffix` 入力、`Apply Title Update` ボタンを追加します。対象は選択済みチャットのみで、`nextTitle = prefix + currentTitle + suffix` を順次適用し、変更結果を bulk result に集計します。
5. 各行タイトル後ろの単発 action は `✎`、`📌`、`🔗` の 3 ボタンを固定します。既存 rename と同じく row click で選択が切り替わらないよう `pointerdown/click stopPropagation` を入れ、`runningAction` 中はすべて disabled にします。
6. Phase 3 では Chat Log 系エントリに「送信時モデル」と「メッセージ時刻」を記録する仕組みを追加します。既存の timestamp cache を拡張し、`messageId / role / order / textHash / timestamp / modelLabel / capturedAt / updatedAt` を保持できるようにします。
7. `user` メッセージの `modelLabel` は、送信時点または初回捕捉時点でモデル切替 UI の表示名を取得し、`assistantLabel.js` の正規化関数を通した値を保存します。`assistant` メッセージは従来どおり `data-message-model-slug` などの DOM 属性から解決し、必要なら同じ保存形式に寄せます。
8. Chat Log fold header と Chat Log modal の両方で、User badge の右横に `モデル名 · 時刻` を muted inline meta として表示します。表示優先順位は `modelLabel + timestamp`、`modelLabel のみ`、`timestamp のみ` の順にし、どちらも無い場合は現在どおり badge だけを表示します。
9. 既存の timestamp-only storage は後方互換を保ちます。旧 entry を読み込んだ場合は `modelLabel: ""` を補完するだけにし、初回保存時に新フォーマットへ自然移行します。
10. Phase 4 では `Export Visible CSV` ボタンを追加し、現在の絞り込み結果を UTF-8 BOM 付き CSV として Blob download します。列は `project,title,author,postedAt,url` 固定、`author/postedAt` は未取得なら空欄、`url` は絶対 URL に正規化します。
11. Phase 5 では bulk action と row action の両方で `pin` を追加します。メニュー文言候補を `Pin / Unpin / ピン留め` 系で持ち、row action は対象 1 件の single-run wrapper、bulk action は既存シーケンス runner を使う形に揃えます。
12. pin は idempotent に扱い、すでに pinned 状態なら `skipped_already_pinned`、UI 上で pin/unpin 判定が曖昧な場合は `skipped_pin_state_unknown` を返します。判定材料は menu item 文言または row metadata が得られる場合の DOM state を優先します。
13. Phase 6 では bulk action と row action の両方で `share` を追加します。対象チャットで Share ダイアログを開き、`Create link` が必要なら生成後、share URL を `input/readOnly field` または clipboard から回収します。
14. row の共有アイコンは矢印ではなく鎖を表す `🔗` に固定します。成功時は対象 1 件の share URL を clipboard に書き込み、toast で完了通知します。bulk の `Share Selected` は各 URL を `title<TAB>url` の TSV としてまとめて clipboard に書き込みます。
15. share で URL を取得できなければ `failed_share_url_not_found`、Share UI 自体が見つからなければ `skipped_share_unavailable` として扱います。share の最終結果は bulk result に残し、失敗行を panel 下部 results に表示します。
16. Phase 7 では `cgptStartSidebarConversationTracker()` の eager fetch をやめ、panel 初回オープン時は `Load Chats` を表示するだけにします。ユーザー操作で初回 fetch を始め、成功後だけ一覧を描画します。
17. さらに in-memory cache に `snapshotStatus`, `loadedOnce`, `dirtySinceLastLoad`, `lastLoadedAt`, `domSignature` を持たせ、TTL 60 秒以内かつ dirty でなければ再取得を避けます。Project deep sweep も `domSignature` が同じなら再実行しません。
18. Phase 8 のリファクタリングでは `sidebarBulkActions.js` を `menu discovery helper / single action executor / bulk runner / share-pin helper` に分割し、`sidebarBulkPanel.js` は `toolbar / filter / title batch / action row / list row / result area` 単位に分割します。`chatLogTracker.js` は `timeline storage / message capture / fold rendering / metadata rendering` に責務分離します。

## Public APIs / Interfaces / Types
- `conversation snapshot` に `absoluteUrl`, `author`, `postedAt`, `projectId`, `projectName`, `isProjectItem`, `raw` を保持します。
- `cgptSidebarBulkState` に `titleBatchPrefix`, `titleBatchSuffix`, `snapshotStatus`, `loadedOnce`, `dirtySinceLastLoad`, `lastLoadedAt` を追加します。
- Chat metadata timeline entry を以下に拡張します。
  - `messageId: string`
  - `role: "user" | "assistant"`
  - `order: number`
  - `textHash: string`
  - `timestamp: string`
  - `modelLabel: string`
  - `capturedAt: string`
  - `updatedAt: string`
- bulk result status に `skipped_unchanged`, `skipped_same_project`, `skipped_already_pinned`, `skipped_pin_state_unknown`, `skipped_pin_unavailable`, `skipped_share_unavailable`, `failed_share_url_not_found` を追加します。
- UI action surface は以下で固定します。
  - panel action buttons: `Archive Selected`, `Delete Selected`, `Add to Project`, `Pin Selected`, `Share Selected`, `Export Visible CSV`
  - row action icons: `✎`, `📌`, `🔗`
- 追加権限は増やしません。CSV は Blob download、share 集約は clipboard API の既存パターンを使います。

## Tests
- Unit: `sidebarBulkState.test.js` を Project 含有フィルタ、新 summary、ID 列整列前提の state に合わせて更新します。
- Unit: `sidebarApiDataSource.test.js` に `absoluteUrl` 正規化と optional metadata 空欄許容を追加します。
- Unit: `assistantLabel.test.js` に user-send-time の modelLabel 正規化ケースを追加します。
- Unit: `chatLogTracker.test.js` に以下を追加します。
  - timestamp-only 旧 entry を新フォーマットで読める
  - `modelLabel` を含む timeline entry が保存・再利用される
  - message id 不在時も `role + order` または `role + textHash` で model/timestamp を復元できる
- Unit: `sidebarBulkActions` 用に `pin/share/single-run/title-batch` の結果集計テストを追加します。
- E2E: `tests/fixtures/chatgpt-sidebar-bulk-mock.html` を拡張し、row icon 3 種、pin menu、share dialog、share URL 回収、Project 配下 row、ID/meta 列整列を再現します。
- E2E: `sidebar-bulk-extension-offline.spec.js` に以下を追加します。
  - Project 配下チャットが一覧表示され選択できる
  - ID/meta 列の開始位置が row 間で揃う
  - `✎` が選択を変えず単発 rename できる
  - `📌` が単発 pin できる
  - `🔗` が単発 share して clipboard へ URL を置ける
  - `Pin Selected` と `Share Selected` が複数件で動く
  - `Apply Title Update` が prefix/suffix を全選択へ適用する
  - `Export Visible CSV` が現在の filter 結果だけを出力する
  - 初回表示では `Load Chats` が見え、押すまで API 読込しない
  - cache 有効時は reopen で即表示され、`Refresh` で強制再取得される
- E2E: Chat Log / shared-style fixture に対して、User badge 横に `モデル名 · 時刻` が表示されること、assistant 側は既存 label を維持することを確認します。
- Regression: 既存の rename 単体、Add to Project、Project 作成、API debug export、Chat Log の timestamp 表示が壊れていないことを維持します。

## Assumptions / Defaults
- クレジットは実課金ではなく相対見積りです。`pt` は「中規模変更 + 対象テスト更新 1 セット」相当です。
- CSV は「現在の絞り込み結果」を対象とし、`author/postedAt` は未取得時に空欄を許容します。
- 共有結果は clipboard 集約、フォーマットは `title<TAB>url` の TSV です。
- 単発 pin/share は row icon から、bulk pin/share は panel button から実行する二層構成に固定します。
- User アイコン横に出すメタ情報は、まず Chat Log fold header と Chat Log modal を対象にします。Bulk Chats 一覧そのものにはモデル/時刻を追加しません。
- user メッセージのモデル名は「送信時点で選択されていたモデル」を best effort で記録します。DOM から取得できないケースは空欄許容です。
- クレジット節約の推奨停止点は Phase 4、余裕があれば Phase 5、UI 変更耐性まで含めるなら Phase 7 までです。
