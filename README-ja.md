# システム名をここに記載

## 1. システム概要

システムの概略をここに記載してください。

事前の変更点は以下のキーワードでファイル名、またはファイル内容を検索しアプリ名に置き換えてください。

ファイル名キーワード:

- develop_app
- develop-app

ファイル内容検索キーワード:

- develop_app
- develop-app
- develop app
- developapp
- dfapp
- システム名をここに記載

現在の概要に記載されている内容は`システムの概略をここに記載してください。`を残し削除してください。

詳細設計書に含めるもの:

- テーブル定義: Documents/テーブル定義.mdに作成してそれを指示してもよい。
- 用語定義: 関係する人の役割、各種用語などは全て定義しておくこと。これは日本語(English)の形式で必ず英語も用意しておく。

プロンプト依頼例:

```text
以下の詳細設計書を元に実装をしてください。
Electron用にプロジェクトの基本構造などは既に作成済みです。

README.mdを確認し、`開発者向けリファレンス`から開発方法などを読み解いてください。**`開発ルール`セクションを確認し遵守してください。**
すべての実装が完了したらREADME.mdのプロジェクトの概要部分を更新してください。
最終的な成果物として、テーブル定義.md、システム設計書.mdをDocumentsに配置してください。

サンプルとして以下の用語が利用されているので、これらは以下の対応リストに従い書き換えてください。

置き換え元 : 置き換え先 の形式で以下に箇条書きします。

- Default App : Default App
- defaultapp : defaultapp
- dfapp : dfapp

これ以降が詳細設計書です。
```

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
├── main/                  # Electron メイン: IPC/各種マネージャ
│   ├── index.ts           # 起動・ウィンドウ生成・サービス初期化
│   ├── ipc/               # IPCハンドラ
│   ├── services/          # 各種サービス
│   └── utils/             # 各種ユーティリティ
├── preload/               # renderer へ安全にAPIをブリッジ
├── renderer/              # React + MUI UI
├── shared/                # 型定義・定数(Default設定/保存パス)
└── public/                # アイコン等
```

### 使用技術

- **Electron**
- **React (MUI v7)**
- **TypeScript**
- **Zustand**
- **i18next**
- **Vite**

### Windows用アイコンの作成

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```
