# ui-diff-video

Web UI の変更を Codex や Claude Code に頼んで、レビュー用の画像や短い動画にするスキルです。見た目の変更は同条件の Before / After 画像で、操作の変更は「どこを押したか」を青、「どう変わったか」を緑で示す録画で確認できます。

## ZIP をダウンロードして使う

1. [ZIP をダウンロード](https://github.com/hamabira/ui-diff-video/archive/refs/heads/main.zip)して展開します。
2. `SKILL.md` が直接入っているフォルダ（通常は `ui-diff-video-main`）を `ui-diff-video` に改名し、下表の場所にフォルダごと置きます。親の `skills` フォルダがなければ作成してください。`~` は自分のホームフォルダです。Mac の Finder では ⇧⌘G（フォルダへ移動）で配置先の親フォルダを開けます。
3. UI を確認したいプロジェクトで**新しい会話**を開き、下表の例を入力します。

| 使うツール | 配置後のファイル | 最初に試す依頼 |
| --- | --- | --- |
| Codex | `~/.agents/skills/ui-diff-video/SKILL.md` | `$ui-diff-video 同梱サンプルで録画を試して、動画の保存先を教えて` |
| Claude Code | `~/.claude/skills/ui-diff-video/SKILL.md` | `/ui-diff-video 同梱サンプルで録画を試して、動画の保存先を教えて` |

`SKILL.md` はエージェントが読む手順書です。`references/` は補助ファイルの置き場で、中の [example.js](references/example.js) が初回確認用の録画サンプルです。`references/` は `SKILL.md` の隣に残してください。

### Git で導入する場合

ZIP の代わりに、使うツールのコマンドを実行します（macOS / Linux、初回のみ）。

**Codex**

```sh
mkdir -p ~/.agents/skills
git clone https://github.com/hamabira/ui-diff-video.git ~/.agents/skills/ui-diff-video
```

**Claude Code**

```sh
mkdir -p ~/.claude/skills
git clone https://github.com/hamabira/ui-diff-video.git ~/.claude/skills/ui-diff-video
```

## 録画を試す

録画サンプルには Node.js、Playwright CLI、Chrome が必要です。Node.js と npm が使える環境で、CLI が未導入なら `npm install -g @playwright/cli@0.1.25`、Chrome がなければ `playwright-cli install-browser chrome` で準備できます。録画例は macOS で確認済みです。PR にコマンドで添付するときは、`--attach` に対応した GitHub CLI を使います（2.99.0 で確認）。

返ってきた動画を開き、架空の画面の Save ボタンを押した後に緑の枠で「Saved: Hello」と表示されれば成功です。録画は既定で `~/UI-Demos/` の実行別フォルダに保存します。未添付の最終版は7日間保持し、その後のスキル実行時に整理します。残したい動画は保存を指定してください。実際の変更では、たとえば次のように頼めます。

> 今回変更した保存ボタンを押して、完了メッセージが出るまでを録画して。今回はローカル保存まででいいよ。

録画の共有は、対象 PR と動画の共有先を承認した場合に行います。手動でサンプルを動かすコマンド、PR への添付方法、保存期間は [スキルの手順書](SKILL.md) にあります。
