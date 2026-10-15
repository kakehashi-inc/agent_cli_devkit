export default {
    nav: {
        mcp: 'OpenCode MCP 管理',
        assets: 'OpenCode Agent・Skill 管理',
        plugins: 'OpenCode プラグイン管理',
        settings: 'OpenCode 設定',
        cleanup: 'OpenCode クリーンアップ',
    },
    noEnvironment:
        'OpenCode 2 が見つかりません。この端末で OpenCode 2 を利用できることを確認してから、「再取得」を押してください。導入した直後に見つからない場合は、アプリの再起動が必要なことがあります。',
    dashboard: {
        mcpDesc: 'OpenCode のグローバル設定にある MCP サーバー（mcp.servers）を有効化/無効化/並べ替えします。',
        assetsDesc: 'OpenCode 自身のグローバル設定ディレクトリ配下だけでエージェントとスキルを管理します。',
        pluginsDesc:
            'npm・Git のパッケージプラグインと、ローカルの TypeScript・JavaScript プラグイン（ファイル・フォルダー）を管理します。',
        settingsDesc: 'JSONC コメントを保持して OpenCode のグローバル設定を編集します。',
        cleanupDesc:
            'OpenCode のキャッシュ、ログ、ツール出力、シェル出力、スナップショット、参照リポジトリ、入力履歴、セッション履歴を選択して削除します。',
    },
    mcp: {
        title: 'OpenCode MCP 管理',
        wslSection: 'WSL: {{distro}}',
        notFound:
            '~/.config/opencode/opencode.json と opencode.jsonc のどちらもありません。設定変更時に opencode.json を作成します。',
        configPath: '設定',
        disabledConfigPath: '無効',
        enabledServers: '有効なMCPサーバー',
        disabledServers: '無効なMCPサーバー',
        noServers: 'MCPサーバーはありません',
        dragToReorder: 'ドラッグして並べ替え',
        serverName: 'サーバー名',
        command: 'コマンド・URL',
        args: '引数',
        actions: '操作',
        enable: '有効化',
        disable: '無効化',
    },
    assets: {
        title: 'OpenCode Agent・Skill 管理',
        descriptionText:
            'OpenCode のカスタムエージェント・スキルを一覧表示し、選択したものを ZIP でまとめてダウンロード、または ZIP／md をアップロードして取り込みます。OpenCode 自身の ~/.config/opencode/agents/*.md と ~/.config/opencode/skills/<name>/SKILL.md だけを管理し、互換用ディレクトリ（~/.claude・~/.agents）は対象外です。',
        wslSection: 'WSL: {{distro}}',
        tabAgents: 'エージェント',
        tabSkills: 'スキル',
        col: {
            name: '名前',
            description: '説明',
            model: 'モデル',
        },
        columnFiles: 'ファイル数',
        columnLastModified: '最終更新日時',
        columnView: '参照',
        newBadge: 'NEW',
        relative: {
            today: '今日',
            yesterday: '昨日',
            daysAgo: '{{count}}日前',
            monthAgo: '1ヵ月前',
            monthsAgo: '{{count}}ヵ月前',
            yearAgo: '1年前',
            yearsAgo: '{{count}}年前',
        },
        download: 'ダウンロード',
        upload: 'アップロード',
        delete: '削除',
        viewHeader: 'ヘッダ',
        viewFull: '全体',
        viewTitle: 'ヘッダー: {{name}}',
        viewFullTitle: '全体: {{name}}',
        viewFullError: '内容の読み込みに失敗しました',
        close: '閉じる',
        cancel: 'キャンセル',
        overwrite: '上書き',
        deleteConfirmTitle: '選択した項目を削除しますか？',
        deleteConfirmBody: '選択した {{count}} 件を削除します。元に戻せません。よろしいですか？',
        deleteSuccess: '{{count}} 件を削除しました',
        deletePartial: '使用中のため一部を削除できませんでした',
        deleteError: '選択した項目の削除に失敗しました',
        noEntries: '対象のデータはありません',
        unavailable: 'この環境はアーカイブ操作にアクセスできません（WSL のパスに到達できません）。',
        downloadSuccess: 'アーカイブを保存しました',
        downloadError: 'アーカイブの作成に失敗しました',
        uploadSuccess: '{{count}} 件を取り込みました',
        uploadError: '取り込みに失敗しました',
        overwriteTitle: '同名の項目を上書きしますか？',
        overwriteBody: '次の {{count}} 件は既に存在します。削除して置き換えます: {{names}}。続行しますか？',
    },
    plugins: {
        title: 'OpenCode プラグイン管理',
        description:
            'opencode.json・opencode.jsonc の plugins 配列にあるパッケージ（npm・Git）とローカルパスの指定と、~/.config/opencode/plugins 直下の .ts・.js ファイルとプラグインフォルダーを管理します。有効化・無効化の指示（-ID・*・組み込み ID）は一覧に表示せず、そのまま保持します。ターミナル UI 専用のプラグイン（cli.json の plugins）は表示だけを行います。',
        sourceHelp:
            'npm パッケージ（@ でバージョン・タグ・範囲を指定可）または Git のパッケージ指定（github:owner/repo#ブランチ など）を opencode plugin add で導入し、plugins 設定へ追加します（ターミナル UI 専用のパッケージは cli.json へ追加されます）。ローカルの .ts / .js ファイルやプラグインフォルダー（package.json または index・server・tui の .ts / .js を含むもの）を絶対パスで指定すると plugins フォルダーへコピーします。',
        tuiNote: 'ターミナル UI 専用（cli.json）。この画面では有効化・無効化・削除できません。',
        disabledFileInvalid:
            '無効化したプラグインの退避ファイル（~/.config/opencode/opencode-disabled-plugins.json）の形式が正しくないため、無効化中のプラグインを表示できません。このファイルを修正するか削除するまで、plugins 設定のプラグインの有効化・無効化・削除とパッケージの導入は行えません。',
    },
    settings: {
        title: 'OpenCode 設定',
        description:
            '~/.config/opencode/opencode.json または opencode.jsonc（両方ある場合は OpenCode が値を優先する opencode.jsonc）のスカラー値を編集します。配列・マップ・オブジェクトと、モデル以外の複合型は直接編集のみで、変更値の外側にある JSONC コメントは保持します。ターミナル UI の設定（cli.json）とバックグラウンドサービスの設定（service.json）は対象外です。',
        wslSection: 'WSL: {{distro}}',
        item: '項目',
        value: '値',
        directEdit: '直接編集',
        directTitle: 'OpenCode の設定ファイルを直接編集',
        directDesc: '保存するとファイル全体を書き換えます。JSONC コメントと末尾カンマを使用できます。',
        directEditValue: 'ファイルを直接編集',
        unknownValue: '{{value}}（保存済みの値・現在の候補外）',
        save: '保存',
        cancel: 'キャンセル',
        unset: '未設定',
        unsetDefault: '未設定（既定: {{default}}）',
        enabled: '有効',
        disabled: '無効',
        saveSuccess: '設定を保存しました',
        saveError: '設定の保存に失敗しました',
        readError: '設定の読み込みに失敗しました',
        invalidJson: 'JSON・JSONC の構文が正しくありません',
        invalidExisting: '既存の JSON・JSONC が壊れています。先に直接編集で修正してください。',
        verifyFailed:
            '編集結果の検証に失敗したため保存を中止しました。ファイルは変更されていません。この項目は「直接編集」で変更してください。',
        unavailable: 'この環境の設定へアクセスできません。',
        notice: {
            modelObjectForm:
                'オブジェクト形式で設定されています。上の値は同じ内容を文字列表記（providerID/model#variant）で示したものです。値を変更して保存したときだけ文字列形式で上書きします。',
            modelUnsupported:
                'providerID・model・variant 以外のキーや想定外の値を含むため、表では編集できません（編集すると内容が失われます）。',
            jsonAlsoExists:
                'opencode.json と opencode.jsonc の両方があります。OpenCode は両方を読み込み、同じ設定は opencode.jsonc の値を優先するため、この画面と直接編集は opencode.jsonc を表示・変更します。opencode.json だけにある設定も OpenCode では有効ですが、この表には表示されません。',
        },
        group: {
            model: 'モデル・エージェント',
            behavior: '動作',
            permissions: '権限・ポリシー',
            mcp: 'MCP',
            media: 'メディア',
            toolOutput: 'ツール出力',
            compaction: '会話圧縮',
            extensions: '拡張',
            experimental: '実験設定',
        },
        field: {
            model: {
                label: 'モデル（model）',
                desc: 'セッションやエージェントでモデルを選んでいないときの既定モデルです。provider/model 形式で入力し、バリアントを指定するときは末尾に #variant を付けます（例: anthropic/claude-sonnet-4-5#high）。ファイルでは providerID・model・variant を持つオブジェクトでも指定できます。',
            },
            defaultAgent: {
                label: '既定エージェント（default_agent）',
                desc: 'セッションでエージェントを選んでいないときに使うプライマリエージェントです。存在しない・非表示・プライマリで使えない場合は build を使います。',
            },
            agents: {
                label: 'エージェント（agents）',
                desc: '組み込みエージェントの上書きと、独自エージェント（モデル・システムプロンプト・モード・権限など）を定義します。',
            },
            providers: {
                label: 'プロバイダー（providers）',
                desc: 'プロバイダーの設定と、モデルの追加・上書き（リクエスト設定・ヘッダー・バリアント）を指定します。',
            },
            shell: {
                label: 'シェル（shell）',
                desc: 'ターミナルとシェルツールで使う既定のシェルです。',
            },
            update: {
                label: '更新（update）',
                desc: '更新の扱いです。disable は確認しない、notify はインストール前に通知、auto は自動でインストールします（実行中のサーバーは再起動しません）。グローバル設定でのみ有効です。',
            },
            snapshots: {
                label: 'スナップショット（snapshots）',
                desc: '元に戻す・巻き戻しに使うファイルのスナップショットを記録します。',
            },
            worktreeDirectory: {
                label: 'ワークツリーの作成先（worktree.directory）',
                desc: '新しいワークツリーを作る親フォルダーです。相対パスはプロジェクトの元のチェックアウトから解決します。未設定時は OpenCode のデータフォルダー配下に作ります。',
            },
            websearch: {
                label: 'Web 検索（websearch）',
                desc: 'Web 検索のプロバイダー（provider。random で自動選択）を指定します。false で Web 検索ツールを外します。',
            },
            warming: {
                label: 'ウォーミング（warming）',
                desc: '直近に使ったセッションを定期的な一時リクエストで温めておきます。true で既定の間隔、オブジェクトで prompt・interval・duration を指定します。既定は無効です。',
            },
            formatter: {
                label: 'フォーマッター（formatter）',
                desc: 'write・edit・patch ツールで変更したファイルを整形します。true で使える組み込みフォーマッターを有効にし、オブジェクトでフォーマッターごとに設定します。',
            },
            watcherIgnore: {
                label: '監視の除外（watcher.ignore）',
                desc: 'ファイル変更の監視から除外するファイル・フォルダーのパターンです。',
            },
            permissions: {
                label: '権限ルール（permissions）',
                desc: 'エージェントがツールを使う前に許可・拒否・確認するルール（action・resource・effect）を順に並べます。最後に一致したルールが適用されます。',
            },
            policies: {
                label: 'ポリシー（policies）',
                desc: 'プロバイダー・ツール・連携の利用を許可・拒否するポリシーを順に並べます。',
            },
            mcpTimeoutStartup: {
                label: '起動タイムアウト（mcp.timeout.startup）',
                desc: 'MCP サーバーの接続と初期化を待つ時間（ミリ秒）です。サーバーごとの timeout で上書きできます。',
            },
            mcpTimeoutCatalog: {
                label: '一覧取得タイムアウト（mcp.timeout.catalog）',
                desc: 'ツール・プロンプト・リソースの一覧取得を待つ時間（ミリ秒）です。サーバーごとの timeout で上書きできます。',
            },
            mcpTimeoutExecution: {
                label: '実行タイムアウト（mcp.timeout.execution）',
                desc: 'ツール呼び出し・プロンプト取得・リソース読み取りを待つ時間（ミリ秒）です。サーバーごとの timeout で上書きできます。',
            },
            mcpServers: { label: 'MCP サーバー（mcp.servers）', desc: 'MCP 管理画面または直接編集で変更します。' },
            mediaImageAutoResize: {
                label: '画像自動リサイズ（media.image.auto_resize）',
                desc: '上限を超える画像を縮小します。無効にすると上限を超える画像を拒否します。',
            },
            mediaImageMaxWidth: {
                label: '画像最大幅（media.image.max_width）',
                desc: 'モデルへ送る画像の最大幅（ピクセル）です。',
            },
            mediaImageMaxHeight: {
                label: '画像最大高さ（media.image.max_height）',
                desc: 'モデルへ送る画像の最大高さ（ピクセル）です。',
            },
            mediaImageMaxBase64Bytes: {
                label: '画像 Base64 上限（media.image.max_base64_bytes）',
                desc: 'Base64 エンコード後の画像の最大バイト数です。',
            },
            toolOutputMaxLines: {
                label: 'ツール出力最大行数（tool_output.max_lines）',
                desc: 'ツール結果として残す最大行数です。超えた分は切り詰め、全文をファイルに保存します。',
            },
            toolOutputMaxBytes: {
                label: 'ツール出力最大バイト数（tool_output.max_bytes）',
                desc: 'ツール結果として残す最大バイト数です。超えた分は切り詰め、全文をファイルに保存します。',
            },
            compactionAuto: {
                label: '自動圧縮（compaction.auto）',
                desc: 'コンテキストが上限に近づいたとき会話を自動的に圧縮します。手動の圧縮は常に使えます。',
            },
            compactionKeepTokens: {
                label: '保持トークン数（compaction.keep.tokens）',
                desc: '圧縮時に要約と並べて残す直近の会話のおおよそのトークン数です。',
            },
            compactionBuffer: {
                label: '空きトークン数（compaction.buffer）',
                desc: 'モデルの上限より手前に空けておくトークン数です。大きいほど早く自動圧縮が始まります。未設定時は上限の 10% です。',
            },
            skills: {
                label: '追加スキルソース（skills）',
                desc: 'スキルを追加で探すフォルダーと HTTP カタログの URL です。',
            },
            commands: {
                label: 'コマンド（commands）',
                desc: '名前付きのスラッシュコマンド（プロンプトのテンプレート）を定義します。',
            },
            references: {
                label: '参照（references）',
                desc: '会話から名前で参照できるローカルフォルダーや Git リポジトリを登録します。',
            },
            plugins: { label: 'プラグイン（plugins）', desc: 'プラグイン管理画面または直接編集で変更します。' },
            experimentalPortableShellScanner: {
                label: 'ポータブルシェル解析（experimental.portable_shell_scanner）',
                desc: 'シェルコマンドの権限判定に、実験的なポータブル版の解析器を使います。',
            },
            experimentalSubagentDepth: {
                label: 'サブエージェント深度（experimental.subagent_depth）',
                desc: 'サブエージェントの最大ネスト深度です。既定の 1 ではサブエージェントからさらにサブエージェントを起動できません。',
            },
        },
    },
    cleanup: {
        title: 'OpenCode クリーンアップ',
        description:
            'OpenCode 公式の XDG ディレクトリから選択したデータを削除します。データベースファイルそのもの（資格情報・保存済みの権限・アカウントを含む）、設定、エージェント、スキル、プラグイン、ワークツリー、サービスの設定・登録は対象外です。',
        wslSection: 'WSL: {{distro}}',
        inUseNotice:
            'OpenCode とバックグラウンドサービス（opencode service stop で停止）を終了してから削除してください。使用中のファイルはスキップされる場合があります。',
        noCandidates: '削除候補はありません',
        name: '項目',
        descriptionColumn: '説明',
        files: 'ファイル数',
        size: 'サイズ',
        deleteSelected: '選択項目を削除',
        confirmTitle: 'クリーンアップの確認',
        confirmBody: '選択した {{count}} 件を削除します。この操作は元に戻せません。',
        cancel: 'キャンセル',
        deleteSuccess: 'クリーンアップが完了しました',
        deletePartial: '使用中の一部ファイルをスキップしました',
        deleteError: 'クリーンアップに失敗しました',
        item: {
            cache: {
                label: '~/.cache/opencode',
                desc: 'ripgrep などのツール、パッケージプラグインの導入先、リモートスキルのキャッシュ、更新に備えて保持される実行ファイルのリンク。必要時に再取得され、パッケージプラグインは次回起動時に自動で再導入されます。',
            },
            logs: { label: 'log', desc: 'OpenCode のログと、CPU プロファイル・ヒープスナップショット。' },
            'tool-output': {
                label: 'tool-output',
                desc: '切り詰められたツール結果の全文。7 日を過ぎたものは OpenCode も削除します。',
            },
            'shell-output': {
                label: 'shell',
                desc: 'シェルツールで実行したコマンドの出力（プロジェクト単位）。7 日を過ぎたものは OpenCode も削除します。',
            },
            snapshot: {
                label: 'snapshot',
                desc: '変更の取り消し・巻き戻しに使うファイルのスナップショット。プロジェクト単位で選択できます。削除すると過去の変更を巻き戻せなくなります。',
            },
            repos: {
                label: 'repos',
                desc: '参照（references）に登録した Git リポジトリのクローン。ホスト単位で選択できます。次に参照するときに再取得されます。',
            },
            'prompt-history': { label: 'prompt-history.jsonl', desc: 'ターミナル UI のプロンプト入力履歴。' },
            frecency: {
                label: 'frecency.jsonl',
                desc: 'ターミナル UI でファイルの候補を並べる順序に使う利用履歴。',
            },
            sessions: {
                label: 'sessions',
                desc: 'OpenCode のセッション履歴（会話）。セッション履歴のデータベースがある環境で、画面を開いたときに OpenCode の CLI で一覧を取得し、削除できるセッションがある場合だけ表示します。セッション単位またはすべてを選択できます。OpenCode の CLI（opencode session delete）で削除し、サブセッションも一緒に消えます。データベース内のサインイン情報・保存済みの権限・アカウント情報は消えません。本人かサブセッションが直近 5 分以内に更新されたセッションは使用中の可能性があるため対象外です。',
            },
        },
    },
};
