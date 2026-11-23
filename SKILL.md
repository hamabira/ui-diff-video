---
name: ui-diff-video
description: 今回のWeb UI変更を、実画面のBefore/After画像や色付きの短いPlaywright録画でレビュー用に報告する。「差分を動画で」「動作を録画して」「UI変更の証拠を見せて」などの依頼で使う。
---

# UI差分デモ

## 単体で使う

`ui-diff-video/` を `references/` ごと配置する。Codex はユーザーの `~/.agents/skills/ui-diff-video/` を読み、新しい会話で `$ui-diff-video` と呼び出す。Claude Code は `~/.claude/skills/ui-diff-video/` を読み、`/ui-diff-video` で呼び出す。両方で使う場合は同じ実体を参照してよい。既存の発見用リンクがあればそのリンク先を更新する。

録画例には Node.js、Playwright CLI（npm パッケージ `@playwright/cli`）、Chrome が必要。Mac で Node.js 26.12.1、CLI 0.1.25 を使用。導入する場合は `npm install -g @playwright/cli@0.1.25`、Chrome がなければ `playwright-cli install-browser chrome`。既存環境では `playwright-cli --version` で確認する。追加インストールが必要なら利用者に引き継ぐ。GitHub CLI は CLI からの PR 添付時だけ使う。[Playwright CLI](https://github.com/microsoft/playwright-cli)

## 初回の録画確認

以下は macOS の sh / zsh 用。ほかの環境でも、リポジトリ外の自分だけが読める永続フォルダに実行ごとの新規ディレクトリを作り、そこを作業ディレクトリにする。既定の親は `~/UI-Demos`（Windows ではユーザープロファイル直下の `UI-Demos`）。別の保存先の指定があれば優先する。既存データやリンクをたどる場所、同期・公開される場所は使わない。

```sh
(
  set -eu
  umask 077
  skill_dir="$HOME/.agents/skills/ui-diff-video"  # Claude 単独配置なら ~/.claude/skills/ui-diff-video
  if [ ! -r "$skill_dir/references/example.js" ]; then skill_dir="$HOME/.claude/skills/ui-diff-video"; fi
  test -r "$skill_dir/references/example.js"
  test ! -L "$HOME/UI-Demos" || { echo '保存先がリンクです。非公開の実ディレクトリを選んでください' >&2; exit 1; }
  mkdir -p "$HOME/UI-Demos"
  run_dir=$(mktemp -d "$HOME/UI-Demos/demo.XXXXXXXX")
  cd "$run_dir"
  echo "録画先 $run_dir"
  session="ui-${run_dir##*.}"
  playwright-cli -s="$session" open about:blank --browser=chrome
  trap 'playwright-cli -s="$session" close || echo "セッション終了を確認してください: $session" >&2' EXIT
  if playwright-cli -s="$session" run-code --filename="$skill_dir/references/example.js" > result.txt &&
     awk '/^### Result$/ { getline; if ($0 == "\"Saved: Hello\"") ok=1 } /^### Error$/ { err=1 } END { exit !(ok && !err) }' result.txt &&
     test -s candidate.webm; then
    echo 'Saved: Hello — candidate.webm を再生確認する'
  else
    cat result.txt >&2
    mkdir failed
    if test -f candidate.webm; then mv candidate.webm failed/; fi
    exit 1
  fi
)
```

[最小例](references/example.js) は架空画面を使う。`result.txt` の `### Result` に `"Saved: Hello"` が出て、表示した録画先に `candidate.webm` ができる。操作対象が青く表示され、Save を押した後、緑の結果を読めることを再生確認してから、同じディレクトリで `final.webm` に改名し、下記の形式で作成日時・ファイル名・「未添付」を `status.md` に記録する。エラー表示、結果の不一致、停止失敗、再生不能なら、残った候補は同じディレクトリ内の `failed/` に隔離し、元のエラーと実在するパスを報告する。失敗録画は PR 添付・最終版の保持対象から外す。診断が済み不要と確認できた失敗録画はゴミ箱に移せる。再試行は新規ディレクトリで行う。

## 実際の差分を記録する

1. 今回のdiffと既存E2Eを読み、変更された操作を1つと、確認する結果を1つ決める。見た目だけなら同条件のBefore/After画像、操作・状態遷移が変わるなら約20〜45秒の無音動画を目安にする（秒数に合わせて早回ししない。長ければ場面を分ける）。UIと無関係なら録らない。
2. BeforeとAfterは同じブラウザ・画面幅・架空データ・操作で比較する。Beforeは既存の基準ビルドまたは別の安全な作業環境から取る。現在の変更をcheckout/reset/stashしない。Beforeを安全に取得できなければAfterのみと明記する。
3. 既存のE2Eを流用できるなら優先。なければPlaywright CLI と[公式録画ガイド](https://playwright.dev/agent-cli/commands/video-recording)を使い、今回のシナリオだけを作業成果物用の場所に保存する。録画は専用の非永続ブラウザセッションで、実画面をスクリプトで操作する。
   - `page.screencast.start({ path })` → `showActions`／`showOverlay` → 操作と確認 → `stop()`。押す場所は青（#2563eb）、確認した結果は緑（#16a34a）。短い文言も添え、色だけに頼らない。色指定が未対応なら録画用overlayか標準の操作表示を使う。
   - 成功判定は既存のassertionか、結果の出現・再読み込み後の状態などで確認する。成功判定の待機は状態ベース。それと分けて、録画専用の間を取る。開始画面は1〜2秒、各操作は青い枠と短い説明を出してから約1.5秒待って操作し、青い操作表示も約1.2秒残す。確認済みの結果は緑の枠と説明で3〜4秒（読む量が多ければさらに長く）見せる。間はデモ専用スクリプトにだけ入れ、通常のE2E・アプリ本体・見た目の回帰テストに入れない。
4. 通常速度（1倍）で再生するか、時刻をずらしてフレームを確認する。操作の前に対象を見つけられ、結果が切り替わる前に読めることを確かめる。早すぎればその場面だけ長めの間で録り直す。実顧客データ、認証画面、シークレットを録らない。録画の共有先は下記のPRか、ユーザーが指定した非公開の場所のみ。外部の共有リンク作成、動画のGitへの追加、本番への副作用は自動で行わない。作ったブラウザセッションだけ閉じる。
5. 「何が変わったか」「何を確認したか」「未確認」を各1行で、動画または画像へのリンクとともに返す。使ったベース・変更側のリビジョンも分かる形で記録する。録れなければ理由と代替の証拠を示す。動画はテストの代用にしない。

## 保存先とPR本文への添付

- 実画面のシナリオごとに新規ディレクトリを1つ作り、候補を1本録る。停止・再生確認済みの最終版だけを残し、実際のパスを報告する。承認待ち・添付失敗の最終版は保持する。動画は Git にコミットしない。
- 対象 PR の作成・本文更新と、その宛先への動画共有が承認されている場合だけ、**動作確認** 節にシナリオ1行と動画を載せる。公開リポジトリの添付は未認証でも閲覧でき、private / internal の添付はそのリポジトリにアクセスできる人が閲覧できる。ブラウザではファイル選択・ドロップ時にアップロードされるため、その前に動画の内容・対象リポジトリ・共有範囲を確認する。判断できなければローカル保存で止める。
- GitHub CLI 2.99.0 で添付オプションを確認済み。既存 PR は現行本文を読み、Issue 参照などを保った本文を用意する。`gh pr create --help` または `gh pr edit --help` で `--attach` を確認。PR本文の **動作確認** 欄に `![](ローカルの動画パス)` を1段落に単独で置き、同じパスを `--body-file <本文> --attach <動画>` で渡せばGitHubのプレーヤーになる。動画は互換性を優先してMP4（H.264）を推奨し、GitHubプランが不明なら10 MB以内を目安にする。MP4変換が利用できなければ、再生を確認したWebMも可。CLI 非対応・部分成功・エラーなら、まず対象 PR を読み戻して二重添付を防ぐ。手動対応が必要なら、対象 PR、追記する節と文面、確認済みのローカルファイル、失敗理由を利用者に渡す。利用者は共有可否を確認したうえで PR 本文エディターの標準添付を使える。どちらも権限不足・失敗ならローカルパスと理由を報告し、別サービスに勝手にアップロードしない。
- 投稿後は対象PRの本文を読み戻し、動画が意図した節にあり、添付リンクが対象PRのものであることを確かめる。プレビューを確認できるならプレーヤーが表示されることも確認し、完了報告にはPRリンクを載せる。参考：[GitHub CLIで添付](https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli)／[対応形式と公開範囲](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files)。

## 動画の保持と片付け

- 適用対象は、このスキルが既定の `~/UI-Demos` 配下に作ったと確認できる動画だけ。今後の実行から適用し、既存の動画・手動保存の動画・他のフォルダには遡及しない。作成した日時と状態（未添付／作業中／保存指定／添付確認済み）を各実行の `status.md` に記録する。例：`ui-diff-video | 2026-11-23T12:00:00Z | final.webm | 未添付`。添付再生確認後は対象 PR も記す。旧保存先のフォルダや動画は移動・削除しない。所有元や状態が分からないもの、シンボリックリンク、既定の場所の外は掃除しない。
- PR本文の動画を再生し、添付がローカル最終版と同等で、対象PRの閲覧者が引き続きアクセスできると確認したら、ローカルコピーはその場でゴミ箱へ移してよい。添付URLがあるだけ、ダウンロード期限つきの一時成果物、または再生未確認なら削除せず、未添付扱いにする。
- 未添付／添付失敗の動画は、確認済みの最終版1本だけを作成から7日保つ。7日以降、次にこのスキルを実行する際に既知の対象だけを点検し、作業中（レビュー・添付待ちを含む）または保存指定のものを除き、Macではゴミ箱へ移す。試し撮り・撮り直し前の版も不要と分かったらゴミ箱へ移す。復元手段がない環境での完全削除、唯一のコピーの完全削除、ゴミ箱を空にする操作は本人に別途確認する。ゴミ箱へ移しただけではディスク容量は解放されない。
- ファイル名や更新日時だけで判断した一括削除はしない。保持・削除を見送ったときは必要なら理由を報告する。別の保存先や保存期間が明示されたらその指定を優先する。このスキルはバックグラウンドで定時削除をしない。
