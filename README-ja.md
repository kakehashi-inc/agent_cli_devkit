# Agent CLI DevKit

## 1. システム概要

Agent CLI DevKit は、AI エージェント CLI（Claude Code / Codex CLI / Antigravity CLI / Grok CLI / OpenCode 2）の開発環境を 1 つのアプリで管理する Electron 製デスクトップツールです。各CLIの機能を Claude / Codex / Agy / Grok / OpenCode の固定順で表示します。

### 提供機能

**Claude グループ**

- **Claude Desktop MCP 管理** — Claude Desktop の MCP サーバーを有効化/無効化/並べ替えします。
- **Claude Code MCP 管理** — Claude Code（CLI）のプロファイル MCP（`~/.claude.json`）を管理します。native と WSL distro の両方に対応します。
- **Claude Code Agent・Skill 管理** — Claude Code のエージェント・スキルを一覧表示し、ZIP でダウンロード／アップロードします。Anthropic 公式スキルのインポートにも対応します。
- **Claude Code プラグイン管理** — `claude plugin` を使って、プラグインの導入・削除・有効化・無効化とマーケットプレイスの管理を行います。
- **Claude Code 設定** — `~/.claude/settings.json` の設定項目をテーブルで編集、または直接編集します。
- **Claude Code クリーンアップ** — `~/.claude` 配下の履歴・キャッシュ・一時ファイル・ログを削除して容量を回収します。プロジェクトを削除すると、そのプロジェクトの自動メモリと、OS の一時フォルダなどに残った一時ファイル・MCP ログも削除します。実行中のセッションがあるプロジェクトは、自動メモリと、そのセッションの会話記録・一時ファイルを残します。

**Codex グループ**

- **Codex MCP 管理** — Codex（CLI）の MCP サーバー（`~/.codex/config.toml`）を有効化/無効化/並べ替えします。native と WSL distro の両方に対応します。
- **Codex Agent・Skill 管理** — Codex のカスタムエージェント（`~/.codex/agents`）・スキル（`~/.agents/skills`）の管理と OpenAI 公式スキルのインポートを行います。
- **Codex プラグイン管理** — `codex plugin` を使って、プラグインの導入・削除・有効化・無効化とマーケットプレイスの管理を行います。
- **Codex 設定** — `~/.codex/config.toml` の設定項目をテーブルで編集、または直接編集します。
- **Codex クリーンアップ** — `~/.codex` 配下の履歴・キャッシュ・一時ファイル・ログ・セッションと、使用中でない一時ファイル（Windows のサンドボックスのログを含む）、更新で残った旧バージョンの Codex 本体を削除して容量を回収します。

**Agy グループ（Antigravity CLI のみ）**

- **Agy CLI MCP 管理** — Gemini CLI と共通の `~/.gemini/config/mcp_config.json` にあるグローバル MCP 設定を有効化/無効化/並べ替えします。
- **Agy CLI Agent・Skill 管理** — 共通のカスタムエージェント（`~/.gemini/config/agents/<name>/agent.md`）と、Agy CLI で唯一対象にするスキル（`~/.gemini/antigravity-cli/skills/<name>/SKILL.md`）を管理します。別製品の Agy・Antigravity IDE 専用領域は対象外です。
- **Agy CLI プラグイン管理** — `agy plugin` を使って、Gemini 共通の `~/.gemini/config/plugins` にあるプラグインを導入（プラグイン名・GitHub URL・ローカルフォルダから）・削除・有効化・無効化します。
- **Agy CLI 設定** — `~/.gemini/antigravity-cli/settings.json` のスカラー設定を編集し、配列・オブジェクトは JSON の直接編集で扱います。
- **Agy CLI クリーンアップ** — 設定、スキル、現行の実行ファイル、Gemini 共通設定を残し、キャッシュ、ログ、クラッシュ、履歴、会話データ、エージェントの作業フォルダ、更新で残った旧実行ファイルを選択して削除します。

**Grok グループ**

- **Grok MCP 管理** — Grok（CLI）の MCP サーバー（`~/.grok/config.toml`）を有効化/無効化/並べ替えします。native と WSL distro の両方に対応します。
- **Grok Agent・Skill 管理** — Grok のカスタムエージェント（`~/.grok/agents`）・スキル（`~/.grok/skills`）を管理します。
- **Grok プラグイン管理** — `grok plugin` を使って、プラグインの導入・削除・有効化・無効化とマーケットプレイスソースの管理を行います。
- **Grok 設定** — `~/.grok/config.toml` の設定項目をテーブルで編集、または直接編集します。
- **Grok クリーンアップ** — `~/.grok` 配下の履歴・メモリ・ログ・診断データ・キャッシュと、OS の一時フォルダに残った使用中でない一時ファイル、更新で残った旧バージョンの実行ファイル（約130MB/個）を削除して容量を回収します。

**OpenCode グループ（OpenCode 2）**

OpenCode の各画面は、`opencode2` コマンドが見つかった native と WSL distro を対象に表示します。コマンドの確認では OpenCode を実行せず、OpenCode を実行するのはプラグインのパッケージ導入と、セッション履歴の一覧・削除のときだけです。

- **OpenCode MCP 管理** — グローバル設定ファイル（`~/.config/opencode/opencode.json` または `opencode.jsonc` のうち先に見つかったもの）の MCP サーバー（`mcp.servers`）を、ほかの設定やコメントを保持したまま有効化/無効化/並べ替えします。
- **OpenCode Agent・Skill 管理** — `~/.config/opencode/agents/**/*.md` と `~/.config/opencode/skills/<name>/SKILL.md` を管理します。Claude 互換・agents 互換ディレクトリは明示的に対象外です。
- **OpenCode プラグイン管理** — `opencode2 plugin add` によるパッケージ（npm・Git）の導入、ローカルの .ts・.js プラグインとプラグインフォルダーの `~/.config/opencode/plugins` へのコピー、有効化・無効化・削除を行います。無効化したプラグインを有効化すると、`plugins` の並びの元の位置へ戻します。
- **OpenCode 設定** — スカラー設定とモデルをテーブルで編集するか、JSONC ファイル（両方あれば `opencode.jsonc`）を直接編集します。配列・マップ・オブジェクトは直接編集のみで、TUI キーバインドは対象外です。
- **OpenCode クリーンアップ** — 設定、資産、認証情報を残し、公式の XDG ディレクトリからキャッシュ・ログ・ツール出力・スナップショット・プロンプト履歴・セッション履歴を選択して削除します。セッション履歴は OpenCode を通じてセッション単位で削除し、削除できるセッションがある場合だけ一覧に表示します。直近 5 分以内に更新されたセッション（サブエージェントのセッションが更新されたものを含む）は残します。

Agent・Skill 管理は、各項目のモデル・推論レベル・主要な設定を一覧に表示し、アップロードはすべて展開し終えてから反映するため、失敗しても既存のエージェント・スキルは変わりません。クリーンアップ画面は使用中の可能性がある項目を選択できない状態で表示し、削除ではシンボリックリンク・ジャンクションを辿りません。

ダッシュボードは Claude / Codex / Agy / Grok / OpenCode のグループ単位のアコーディオン表示（排他展開・最後の展開状態を次回起動時に復元）で、タイトルバーとバーガーメニュー（エージェントごとの 2 階層メニュー）から全機能へ移動できます。テーマ（ライト/ダーク）と言語（日本語/英語）はアプリ設定画面で変更し、「保存」を押した時点で反映・永続化されます（未保存時は OS 設定を引き継ぎ）。内部構造は agent 別ファイルと agent 非依存の共通マネージャに分割されています（詳細は `Documents/システム仕様.md` を参照）。

### 名称・配布情報

- プロジェクト名: `agent_cli_devkit`
- 設定ファイルディレクトリ: `~/.agent_cli_devkit`
- 実行ファイル: `agent_cli_devkit`
- 配布ファイル名: `agent-cli-devkit-<version>-<os>-<arch>`

## 2. 対応OS

- Windows 10/11
- macOS 10.15+
- Linux (Debian系/RHEL系)

注記: 本プロジェクトは Windows ではコード署名を行っていません。SmartScreen が警告を表示する場合は「詳細情報」→「実行」を選択してください。

## 3. 開発者向けリファレンス

### 必要要件

- Node.js 22.x以上
- yarn 4
- Git

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd <repository-name>

# 依存関係のインストール
yarn install

# 開発起動
yarn dev
```

開発時のDevTools:

- DevTools はデタッチ表示で自動的に開きます
- F12 または Ctrl+Shift+I（macOSは Cmd+Option+I）でトグル可能

### ビルド/配布

- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

開発時は BrowserRouter で `<http://localhost:3001>` を、配布ビルドでは HashRouter で `dist/renderer/index.html` を読み込みます。

### GitHub への直接リリース (自動アップデート用)

`electron-builder.yml` の `publish:` に設定した GitHub リポジトリに、ビルド成果物と `latest*.yml` (自動アップデート用メタデータ) を直接アップロードするコマンドです。`releaseType: draft` 設定のため、各コマンドは GitHub 上の **同一バージョンのドラフトリリースに集約** されます。全プラットフォーム揃ってから GitHub UI で「Publish release」を押すとユーザーへ配信されます。

- Windows: `yarn release:win`
- macOS: `yarn release:mac`
- Linux: `yarn release:linux`

実行前に GitHub Personal Access Token (`public_repo` スコープ) を環境変数 `GH_TOKEN` に設定してください。

```bash
export GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

複数台で各プラットフォームをビルドする場合は、`package.json` の `version` を全マシンで一致させた上で、各マシンで該当する `release:*` を順に実行してください。

### macOS 事前準備: 署名・公証用の環境変数

macOS 向けに署名・公証付きビルドを行う場合は、`yarn dist:mac` の実行前に以下の環境変数を設定してください。

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### Windows 事前準備: 開発者モード

Windows で署名なしのローカルビルド/配布物を実行・テストする場合は、OSの開発者モードを有効にしてください。

1. 設定 → プライバシーとセキュリティ → 開発者向け
2. 「開発者モード」をオンにする
3. OSを再起動

### プロジェクト構造 (抜粋)

```text
src/
├── main/                    # Electron メイン: IPC/各種マネージャ
│   ├── index.ts             # 起動・ウィンドウ生成・サービス初期化
│   ├── ipc/                 # IPCハンドラ
│   │   ├── claude/          #   Claude 系ハンドラ
│   │   ├── codex/           #   Codex 系ハンドラ
│   │   ├── agy/             #   Antigravity CLI 系ハンドラ
│   │   ├── grok/            #   Grok 系ハンドラ
│   │   └── opencode/        #   OpenCode 系ハンドラ
│   ├── services/            # 各種サービス
│   │   ├── claude/          #   Claude 系マネージャ
│   │   ├── codex/           #   Codex 系マネージャ
│   │   ├── agy/             #   Antigravity CLI 系マネージャ
│   │   ├── grok/            #   Grok 系マネージャ
│   │   ├── opencode/        #   OpenCode 系マネージャ
│   │   └── common/          #   agent 非依存の共通実装 (WSL / CLI 実行 / クリーンアップ / 資産 / JSON / git)
│   └── utils/               # 各種ユーティリティ
├── preload/                 # renderer へ安全にAPIをブリッジ
│   └── agents/              #   agent 別ブリッジ
├── renderer/                # React + MUI UI
│   ├── agents/              #   agent 別画面と registry
│   ├── components/          #   共通コンポーネント (TitleBar/Dashboard/AppSettings と agent 非依存の共通画面)
│   └── i18n/locales/        #   ロケール (ja/ en/ × app・各agent)
├── shared/                  # 型定義・定数
│   └── agents/              #   agent 共通型と agent 別定数/型 (claude/ codex/ agy/ grok/ opencode/)
└── public/                  # アイコン等
```

新しい agent CLI の追加手順は `Documents/システム仕様.md` の「agent 追加ガイド」を参照してください。

### 使用技術

- **Electron**
- **React (MUI v9)**
- **TypeScript**
- **Zustand**
- **i18next**
- **Vite**

### Windows用アイコンの作成

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```
