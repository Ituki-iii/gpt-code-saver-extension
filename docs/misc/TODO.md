# TODO

進行中の改善項目を整理するためのメモです。完了した項目は履歴として残し、未完了の項目は次の作業候補として管理します。

## Status

- `pending`: 未着手
- `in_progress`: 作業中
- `done`: 完了
- `deferred`: 保留

## Work Items

| Order | Status | Theme | Task | Notes |
| --- | --- | --- | --- | --- |
| 1 | done | Code Save UI | コードブロックの保存導線を改善する | 2026-03-03: 保存導線を画面上で扱いやすい構成に調整し、表示位置やレイアウトも見直した。 |
| 2 | done | Save Path UX | `file:` メタデータの扱いを改善する | 2026-03-03: `// file:` / `# file:` をコードブロック先頭に置く運用を維持しつつ、保存時の解釈を安定させた。 |
| 3 | deferred | Code View | コードブロックの compact 表示を見直す | 現状は compact 表示のメリットより読みにくさが目立つため保留。必要なら別案で再検討する。 |
| 4 | done | Chat Tools | チャット系 UI の表示整理を行う | 2026-03-03: Chat Log は `User` / `GPT 5.2 Thinking` 表示へ整理し、チャットウィンドウ本体でもタグの見え方を調整した。 |
| 5 | done | Heading Fold | 見出し fold の挙動を改善する | 2026-03-03: 階層に応じた fold 表示を整理し、視認性と操作性を調整した。 |
| 6 | done | Panel UX | 常設フローティングパネルの視認性を改善する | 2026-03-03: FAB から常設パネルへ変更し、操作箇所を集約した。 |
| 7 | done | Save Flow | Chat Log 保存と Code Save の保存系を整理する | 2026-03-03: `Save` は project folder 保存、`Save As` は保存先選択、`Save All` / `Save As All` は一括保存として整理した。Chat text の保存先を `chat-logs/<conversationKey>/...` に統一し、保存ログとトーストの `source` 表示も揃えた。一括保存は最初の失敗で停止する。unit test 追加後、WSL の `node --test tests/unit/*.test.js` で 39 件 PASS を確認。 |
| 8 | done | Settings | 設定項目の整理を進める | 2026-03-03: lightweight mode の CSS 適用範囲を修正し、`scroll-behavior` 無効化が実際に効くよう更新。`normal / auto / light` と生成中追従の unit test を追加。`Display` に `Lightweight Mode` と `Preview lines` をまとめ、`View Controls` にコードブロックと heading の一括操作を分離した。`viewSettings` unit test も追加し、WSL の `node --test tests/unit/*.test.js` で 39 件 PASS。 |
| 9 | done | Layout | レイアウト調整を行う | 2026-03-03: `main` の `margin-right` / `padding-bottom` を調整し、パネルと本文の干渉を減らした。 |
| 10 | done | Scope | Save UI の適用範囲を見直す | 2026-03-03: Save UI はすべてのコードブロックを対象にする方針で確定。`Save` は metadata ありで有効、`Save As` / `Copy` / view controls は全コードブロックで利用できる現行実装を維持する。 |

## Recommended Order

1. Code Save UI
2. Save Path UX
3. Layout
4. Panel UX
5. Chat Tools
6. Heading Fold
7. Settings
8. Save Flow
9. Code View
10. Scope

## Update Rules

- 作業を始めたら `Status` を `in_progress` に更新する。
- 完了したら `done` に更新し、`Notes` に日付と内容を追記する。
- 保留にした項目は `deferred` にし、理由を `Notes` に残す。

## Save Flow Summary

- `done`: 保存ルートの整理
  - `Save` は既存の project folder を優先して保存する。
  - `Save As` は単一ファイルの保存先選択として扱う。
  - `Save All` / `Save As All` は一括保存として区別する。
- `done`: UI 表現の整理
  - Code Save / Chat Log / Chat Log modal でボタン意味とトースト文言を揃えた。
  - 一括保存系は `All` 付きラベルで区別する。
- `done`: Code Save 側のフロー整理
  - `file:` あり保存と `Save As` の分岐を明確にした。
  - metadata なしコードブロックでも `Save As` / `Copy` / view controls を使える。
- `done`: Chat Log 単体保存の整理
  - 本文保存の命名規則を `chat-logs/<conversationKey>/<role>-<timestamp>.txt` に統一した。
  - entry role と conversation key を保存ログに残すようにした。
- `done`: Chat Log 一括保存の整理
  - `Save` / `Save As` / `Save All` / `Save As All` の役割を整理した。
  - 一括保存は最初の失敗で停止する。
- `done`: フォルダ選択フローの整理
  - `overrideFolderPath` は一括保存などの一時上書き用途に限定した。
  - キャンセル時の扱いを保存導線ごとに揃えた。
- `done`: ログと通知の整理
  - 保存ログの粒度とトースト文言を統一した。
  - `source` ごとの差異が分かる表示にした。
- `done`: テストとドキュメント更新
  - README / DEVELOPERS.md / TODO.md の記述を同期した。
  - unit test を追加し、WSL 上の `node --test tests/unit/*.test.js` で 39 件 PASS を確認した。

## 2026-03-03 UI Update

- Done: shared button/chip rendering を `extension/shared/uiStyles.js` に寄せて統一した。
- Done: メインのツールパネルを簡素化し、横方向のはみ出しを抑えて `Logs` を下部に置きやすくした。
- Done: テンプレート管理をメインパネルから分離し、`Templates` を独立した入口に移した。
- Done: 現状 UI の証跡キャプチャを追加した。
  - `tests/artifacts/panel-readability/screenshots/panel-only.png`
  - `tests/artifacts/template-panel-readability/screenshots/template-panel-only.png`
  - `tests/artifacts/template-panel-readability/screenshots/template-panel-context.png`
- Done: `tests/e2e/readme-behavior.spec.js` を新しい `Templates` 導線に合わせて更新した。

## 2026-03-03 UI Checks

- Done: 主要 UI の目視確認を実施した。
  - Main Panel
  - Templates Panel
  - Download Log Modal
  - Chat Log Modal
- Done: 変更確認用の単純な画面テストを追加した。
  - `tests/e2e/ui-screens.spec.js`
  - 既存の `tests/e2e/readme-behavior.spec.js` は README 導線確認として継続利用する。
- Done: Playwright で画面確認テストを実行した。
  - Windows の `node.exe` から `playwright` を実行し、`ui-screens.spec.js` は 4 件 PASS、`readme-behavior.spec.js` は 1 件 PASS を確認した。
- Done: 画面キャプチャを保存した。
  - `tests/artifacts/ui-screen-checks/main-panel/screenshots/main-panel.png`
  - `tests/artifacts/ui-screen-checks/templates-panel/screenshots/templates-panel.png`
  - `tests/artifacts/ui-screen-checks/download-log-modal/screenshots/download-log-modal.png`
  - `tests/artifacts/ui-screen-checks/chat-log-modal/screenshots/chat-log-modal.png`
  - `tests/artifacts/readme-behavior/screenshots/readme-workflow.png`

## Remaining UI Checks

- 現時点の UI 確認は一通り完了。
- 新たな UI 調整が入った場合は `tests/e2e/ui-screens.spec.js` と証跡スクリーンショットを更新する。
## 2026-03-04 Notes

- `done`: Chat Log code block extraction now includes plain fenced code blocks without `file:` metadata.
- `done`: Plain fenced code blocks receive generated save paths under `chat-code-blocks/` so Chat Log `Save` and `Save As` stay enabled.
- `done`: Shared-page-style regression is pinned by `tests/fixtures/chatgpt-share-code-blocks.html` and `tests/e2e/chatgpt-share-code-blocks-offline.spec.js`.

## 2026-06-19 UI Inventory Notes

- `done`: UI 整理時の再発防止ルールを追加した。
- `done`: 実装済み操作の棚卸しと、提案上の追加操作を明確に分離する方針を `AGENTS.md` と `DEVELOPERS.md` に記録した。
- `done`: 今後の UI ツリー表示では、現状 UI と整理後 UI を混在させない。

## 2026-06-22 Docs Refresh

- `done`: README を現行 UI に合わせて更新した。
- `done`: `Quick Settings` / `Templates` / `Chat Log` / `Bulk Chats` の独立入口を README に反映した。
- `done`: `docs/images/readme/` のキャプチャを `npm run capture:readme-screens:x11` で再生成した。
- `done`: `DEVELOPERS.md` と `PLAYWRIGHT_VERIFICATION.md` に README 画像更新手順を追記した。
