# Agent CLI DevKit

## 1. システム概要

Agent CLI DevKit は、AI エージェント CLI（Claude Code / Codex CLI / Grok CLI など）の開発環境を 1 つのアプリで管理する Electron 製デスクトップツールです。Claude Developer Tool と Codex Developer Tool の全機能を統合し、さらに Grok CLI（Grok Build）にも対応。エージェント（Claude / Codex / Grok）ごとにグループ化された UI で提供します。

### 提供機能

**Claude グループ**

- **Claude Desktop MCP 管理** — Claude Desktop の MCP サーバーを有効化/無効化/並べ替えします。
- **Claude Code MCP 管理** — Claude Code（CLI）のプロファイル MCP（~/.claude.json）を管理します。native と WSL distro の両方に対応します。
- **Claude Code Agent・Skill 管理** — Claude Code のエージェント・スキルを一覧表示し、ZIP でダウンロード／アップロードします。Anthropic 公式スキルのインポートにも対応します。
- **Claude Code 設定** — ~/.claude/settings.json の設定項目をテーブルで編集、または直接編集します。
- **Claude Code クリーンアップ** — ~/.claude 配下の履歴・キャッシュ・一時ファイル・ログを削除して容量を回収します。

**Codex グループ**

- **Codex MCP 管理** — Codex（CLI）の MCP サーバー（~/.codex/config.toml）を有効化/無効化/並べ替えします。native と WSL distro の両方に対応します。
- **Codex Agent・Skill 管理** — Codex のカスタムエージェント（~/.codex/agents）・スキル（~/.agents/skills）の管理と OpenAI 公式スキルのインポートを行います。
- **Codex 設定** — ~/.codex/config.toml の設定項目をテーブルで編集、または直接編集します。
- **Codex クリーンアップ** — ~/.codex 配下の履歴・キャッシュ・一時ファイル・ログ・セッションを削除して容量を回収します。

**Grok グループ**

- **Grok MCP 管理** — Grok（CLI）の MCP サーバー（~/.grok/config.toml）を有効化/無効化/並べ替えします。native と WSL distro の両方に対応します。
- **Grok Agent・Skill 管理** — Grok のカスタムエージェント（~/.grok/agents）・スキル（~/.grok/skills）の管理と xAI 公式スキルのインポートを行います。
- **Grok 設定** — ~/.grok/config.toml の設定項目をテーブルで編集、または直接編集します。
- **Grok クリーンアップ** — ~/.grok 配下の履歴・メモリ・ログと、更新で残った旧バージョンの実行ファイル（約130MB/個）を削除して容量を回収します。

ダッシュボードとタイトルバーのナビゲーションは Claude / Codex / Grok のグループ単位で全機能を表示します。内部構造もエージェント単位でファイル分割されており、新しい agent CLI を追加しやすい構成になっています（詳細は `Documents/システム仕様.md` を参照）。

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
│   │   └── grok/            #   Grok 系ハンドラ
│   ├── services/            # 各種サービス
│   │   ├── claude/          #   Claude 系マネージャ
│   │   ├── codex/           #   Codex 系マネージャ
│   │   ├── grok/            #   Grok 系マネージャ
│   │   └── common/          #   agent 非依存の共通実装 (WSL/git)
│   └── utils/               # 各種ユーティリティ
├── preload/                 # renderer へ安全にAPIをブリッジ
│   └── agents/              #   agent 別ブリッジ (claude.ts / codex.ts / grok.ts)
├── renderer/                # React + MUI UI
│   ├── agents/              #   agent 別画面 (claude/ codex/ grok/) と registry
│   ├── components/          #   共通コンポーネント (TitleBar/Dashboard 等)
│   └── i18n/locales/        #   ロケール (ja/ en/ × app/claude/codex/grok)
├── shared/                  # 型定義・定数
│   └── agents/              #   agent 共通型と agent 別定数/型 (claude/ codex/ grok/)
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
