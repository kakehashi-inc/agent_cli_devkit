# Agent CLI DevKit

## 1. システム概要

Agent CLI DevKit は、AI エージェント CLI（Claude Code / Codex CLI / Antigravity CLI / Grok CLI / OpenCode 2）の開発環境を 1 つのアプリで管理する Electron 製デスクトップツールです。各CLIの機能を Claude / Codex / Agy / Grok / OpenCode の固定順で表示します。

### 提供機能

**Claude グループ**

- **Claude Desktop MCP 管理** — Claude Desktop の MCP サーバーを有効化・無効化・並べ替えします。
- **Claude Code MCP 管理** — Claude Code の MCP サーバーを管理します。
- **Claude Code Agent・Skill 管理** — エージェント、スキル、コマンドを管理します。ZIP でのダウンロードとアップロード、Anthropic 公式スキルのインポートもできます。
- **Claude Code プラグイン管理** — プラグインとマーケットプレイスを管理します。
- **Claude Code 設定** — 設定、フック、ステータスライン、外部コマンド、権限、指示ファイル、出力スタイル、ルール、ワークフローを編集します。
- **Claude Code クリーンアップ** — 履歴、キャッシュ、一時ファイル、ログ、プロジェクトごとのデータを削除します。

**Codex グループ**

- **Codex MCP 管理** — Codex の MCP サーバーを有効化・無効化・並べ替えします。
- **Codex Agent・Skill 管理** — カスタムエージェントとスキルを管理します。OpenAI 公式スキルのインポートもできます。
- **Codex プラグイン管理** — プラグインとマーケットプレイスを管理します。
- **Codex 設定** — 設定、フック、ステータスライン、外部コマンド、権限、指示ファイルを編集します。
- **Codex クリーンアップ** — 履歴、キャッシュ、一時ファイル、ログ、セッション、旧バージョンの本体を削除します。セッションは日付単位かプロジェクト単位で選べます。

**Agy グループ（Antigravity CLI のみ）**

- **Agy CLI MCP 管理** — グローバルの MCP サーバーを有効化・無効化・並べ替えします。
- **Agy CLI Agent・Skill 管理** — カスタムエージェントとスキルを管理します。
- **Agy CLI プラグイン管理** — プラグインを導入、削除、有効化、無効化します。
- **Agy CLI 設定** — 設定、フック、ステータスライン、外部コマンド、権限、指示ファイル、ルールを編集します。
- **Agy CLI クリーンアップ** — キャッシュ、ログ、履歴、会話データ、プロジェクトごとのデータ、旧バージョンの実行ファイルを削除します。

**Grok グループ**

- **Grok MCP 管理** — Grok の MCP サーバーを有効化・無効化・並べ替えします。
- **Grok Agent・Skill 管理** — カスタムエージェント、スキル、コマンドを管理します。
- **Grok プラグイン管理** — プラグインとマーケットプレイスのソースを管理します。
- **Grok 設定** — 設定、フック、ステータスライン、外部コマンド、権限、指示ファイル、ルール、ワークフローを編集します。
- **Grok クリーンアップ** — 履歴、メモリ、ログ、キャッシュ、一時ファイル、プロジェクトごとのデータ、旧バージョンの実行ファイルを削除します。

**OpenCode グループ（OpenCode 2）**

- **OpenCode MCP 管理** — OpenCode の MCP サーバーを有効化・無効化・並べ替えします。
- **OpenCode Agent・Skill 管理** — カスタムエージェント、スキル、コマンドを管理します。
- **OpenCode プラグイン管理** — プラグインを導入、削除、有効化、無効化します。
- **OpenCode 設定** — 設定、外部コマンド、権限、指示ファイルを編集します。
- **OpenCode クリーンアップ** — キャッシュ、ログ、スナップショット、入力履歴、セッション履歴、プロジェクトごとのデータを削除します。

各機能は native と WSL distro の両方で使えます。WSL で CLI のデータベースを使うクリーンアップには、distro の sqlite3（3.33 以上）が必要です。

詳しい動作は `Documents/システム仕様.md` を参照してください。

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
│   │   └── common/          #   agent 非依存の共通実装 (WSL / CLI 実行 / クリーンアップ / 資産 / プロファイルのタブ / ファイル / JSON / TOML / SQLite / git)
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
