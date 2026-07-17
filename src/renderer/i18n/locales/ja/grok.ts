export default {
    grokMcp: {
        title: 'Grok MCP 管理',
        wslSection: 'WSL: {{distro}}',
        notFound: 'この環境には ~/.grok/config.toml が見つかりません',
        configPath: '設定',
        disabledConfigPath: '無効',
        enabledServers: '有効なMCPサーバー',
        disabledServers: '無効なMCPサーバー',
        noServers: 'MCPサーバーが登録されていません',
        serverName: 'サーバー名',
        command: 'コマンド',
        args: '引数',
        actions: '操作',
        enable: '有効化',
        disable: '無効化',
        dragToReorder: 'ドラッグして並べ替え',
    },
    cleanup: {
        title: 'Grok クリーンアップ',
        description:
            '~/.grok 配下の履歴・メモリ・ログ・プラン・旧バージョンの実行ファイルを削除します。ディスク容量の回収に加え、動作速度の改善にも役立ちます。設定ファイル・認証情報・エージェント・スキル・プラグイン・フックは対象外です。',
        wslSection: 'WSL: {{distro}}',
        deleteSelected: '選択済みを削除',
        cancel: 'キャンセル',
        confirmTitle: 'クリーンアップの確認',
        confirmBody: '選択した {{count}} 件を削除します。元に戻せません。よろしいですか？',
        reclaimable: '{{count}} 件選択中、回収可能 {{size}}',
        noCandidates: 'クリーンアップ対象が見つかりません',
        inUseWarning:
            '実行中の Grok セッションがあると一部ディレクトリの削除に失敗することがあります。削除前にセッションを終了してください。',
        deleteSuccess: 'クリーンアップが完了しました',
        deletePartial: '使用中のファイルがあったため、一部をスキップしました',
        deleteError: '一部の項目の削除に失敗しました',
        columnName: '項目',
        columnDescription: '説明',
        columnFiles: 'ファイル数',
        columnSize: 'サイズ',
        dir: {
            sessions: 'sessions',
            memory: 'memory',
            debug: 'debug',
            plans: 'plans',
            docs: 'docs',
            sandboxEvents: 'sandbox-events.jsonl',
            binOldVersions: 'bin（旧バージョン）',
        },
        desc: {
            sessions: '過去セッションの記録（会話ログ）。展開して個別削除できます。',
            memory: 'クロスセッションメモリのデータ。',
            debug: 'デバッグログ。',
            plans: 'プランモードで作成したプランファイル。',
            docs: '内蔵ユーザーガイドのキャッシュ（必要時に再生成されます）。',
            sandboxEvents: 'サンドボックスのイベントログ。',
            binOldVersions:
                '更新で残った旧バージョンの実行ファイル（1個あたり約130MB）。現行バージョンと起動用ファイルは保護されます。',
        },
        other: {
            sectionTitle: 'その他のツール',
            registered: '{{count}} 件登録',
            columnMetric: '状態',
            label: {
                serenaProjects: 'Serena 登録プロジェクト',
                serenaLogs: 'Serena ログ',
            },
            desc: {
                serenaProjects: 'Serena に登録されたプロジェクト一覧を空にします（設定・コメントは保持）。',
                serenaLogs: 'Serena が出力したログを削除します。',
            },
        },
    },
    assetManager: {
        title: 'Grok Agent・Skill 管理',
        description:
            'Grok のカスタムエージェント・スキルを一覧表示し、選択したものを ZIP でまとめてダウンロード、または ZIP／md をアップロードして取り込みます。',
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
        uploadSuccess: '{{count}} 件を展開しました',
        uploadError: 'アーカイブの展開に失敗しました',
        overwriteConfirmTitle: '同名の項目を上書きしますか？',
        overwriteConfirmBody:
            '次の {{count}} 件は既に存在します。ディレクトリごと削除して置き換えます: {{names}}。続行しますか？',
        importOfficial: '公式スキルインポート',
        importOfficialTitle: '公式スキルをインポート',
        importOfficialDesc:
            'xAI 公式リポジトリ（xai-org/plugin-marketplace）のスキルです。取り込むスキルを選択してください。同名の既存スキルは置き換えられます。',
        import: 'インポート',
        gitRequired: 'この機能には git のインストールが必要です',
        officialImportSuccess: '{{count}} 件の公式スキルをインポートしました',
        officialImportError: '公式スキルのインポートに失敗しました',
        officialListError: '公式スキルの取得に失敗しました',
        repoUpdating: '公式リポジトリを更新しています…',
        mdNoName: 'SKILL.md の name が取得できませんでした',
        kindWarnTitle: '種別が一致しない可能性があります',
        kindWarnContinue: 'このまま取り込む',
        kindWarn: {
            'agent-md-into-skill':
                'このファイルはエージェント（tools / model を持つ）の可能性があります。スキルとして取り込みますか？',
            'skill-no-skillmd':
                'このアーカイブは SKILL.md を含んでおらず、正しいスキルでない可能性があります。スキルとして取り込みますか？',
            'skillmd-into-agent':
                'このファイルは SKILL.md（スキル）の可能性があります。エージェントとして取り込みますか？',
        },
        kindBlock: {
            'agent-nested-dirs':
                'この ZIP はサブディレクトリ内に .md を含んでいます。Grok はエージェント定義を agents 直下の .md しか認識しないため、フォルダ階層のない ZIP を使用してください。',
            'agent-into-skill':
                'このアーカイブはエージェント（.md ファイル）のようです。スキルタブには取り込めません。エージェントタブを使用してください。',
            'skill-into-agent':
                'このアーカイブはスキル（SKILL.md を含むフォルダ）のようです。エージェントタブには取り込めません。スキルタブを使用してください。',
            'no-md': 'このアーカイブには .md ファイルが含まれておらず、エージェントとして取り込めません。',
        },
    },
    settings: {
        title: 'Grok 設定',
        description: '~/.grok/config.toml の設定項目をテーブルで編集、または直接編集します。',
        wslSection: 'WSL: {{distro}}',
        colItem: '項目',
        colValue: '値',
        directEdit: '直接編集',
        directEditTitle: 'config.toml を直接編集',
        directEditDesc:
            'config.toml の内容をそのまま編集します。保存するとファイル全体がこの内容で上書きされます。TOML として正しい内容にしてください。',
        save: '保存',
        cancel: 'キャンセル',
        unset: '未設定',
        unsetWithDefault: '未設定（既定: {{default}}）',
        enabled: '有効',
        disabled: '無効',
        unknownValue: '{{value}}（保存済みの値・現在の候補外）',
        directEditValue: 'ファイルを直接編集',
        saveSuccess: '設定を保存しました',
        saveError: '設定の保存に失敗しました',
        readError: '設定の読み込みに失敗しました',
        invalidToml: 'TOML の構文が正しくありません',
        invalidExisting: '既存の config.toml が壊れているため保存できません。直接編集で修正してください。',
        unavailable: 'この環境の設定にはアクセスできません。',
        group: {
            model: 'モデル',
            security: 'セキュリティ・動作',
            cli: '表示・CLI',
            features: '機能',
        },
        field: {
            modelsDefault: {
                label: '既定モデル（models.default）',
                desc: '新規セッションで使用するモデル ID。現在の候補とカスタムモデル ID の両方を入力できます。',
            },
            modelsWebSearch: {
                label: 'Web検索モデル（models.web_search）',
                desc: 'web_search ツールが使用するモデル。空欄で未設定。',
            },
            modelsDefaultReasoningEffort: {
                label: '推論の労力（models.default_reasoning_effort）',
                desc: '既定モデルの推論レベル。対応モデルでは none から xhigh まで指定できます。',
            },
            modelsSessionSummary: {
                label: 'セッション要約モデル（models.session_summary）',
                desc: 'セッション要約に使用するモデル。空欄で未設定。',
            },
            modelsTemperature: {
                label: 'temperature（models.temperature）',
                desc: '全モデル共通のサンプリング既定値（0〜2）。空欄で未設定。',
            },
            modelsTopP: {
                label: 'top_p（models.top_p）',
                desc: '全モデル共通のサンプリング既定値（0〜1）。空欄で未設定。',
            },
            modelsMaxCompletionTokens: {
                label: '最大出力トークン（models.max_completion_tokens）',
                desc: '全モデル共通の最大出力トークン数。空欄で未設定。',
            },
            sandboxProfile: {
                label: 'サンドボックス（sandbox.profile）',
                desc: 'ファイルシステムサンドボックスのプロファイル（off / workspace / devbox / read-only / strict / カスタム名）。',
            },
            sandboxAutoAllowBash: {
                label: 'bash 自動許可（sandbox.auto_allow_bash）',
                desc: 'サンドボックス有効時に bash の権限プロンプトをスキップします。',
            },
            toolsRespectGitignore: {
                label: 'gitignore 尊重（tools.respect_gitignore）',
                desc: 'ファイル探索ツールが .gitignore を尊重します。',
            },
            sessionAutoCompactThreshold: {
                label: '自動コンパクト閾値（session.auto_compact_threshold_percent）',
                desc: 'コンテキスト使用率がこの割合を超えると自動で要約圧縮します（0〜100、既定 85）。',
            },
            sessionLoadEnvrc: {
                label: '.envrc 読み込み（session.load_envrc）',
                desc: 'セッション開始時に .envrc の環境変数を注入します。',
            },
            memoryEnabled: {
                label: 'クロスセッションメモリ（memory.enabled）',
                desc: 'セッションをまたぐメモリ機能を有効にします。',
            },
            subagentsEnabled: {
                label: 'サブエージェント（subagents.enabled）',
                desc: 'サブエージェント機能のマスタースイッチ。',
            },
            cliAutoUpdate: {
                label: '自動更新（cli.auto_update）',
                desc: 'CLI の更新確認を有効にします。',
            },
            cliChannel: {
                label: '更新チャンネル（cli.channel）',
                desc: 'リリースチャネル。stable は安定版、alpha は先行版。',
            },
            cliShowTips: {
                label: '起動時 Tips（cli.show_tips）',
                desc: '起動時のヒント表示を有効にします。',
            },
            hintsNewSessionWorktreeMode: {
                label: '/new ワークツリー提案（hints.new_session_worktree_mode）',
                desc: '/new 実行時に git ワークツリーの利用を提案するか。',
            },
            hintsForkWorktreeMode: {
                label: '/fork ワークツリー提案（hints.fork_worktree_mode）',
                desc: '/fork 実行時に git ワークツリーの利用を提案するか。',
            },
            featuresWebFetch: {
                label: 'web_fetch（features.web_fetch）',
                desc: 'web_fetch ツールを有効にします。',
            },
            featuresLspTools: {
                label: 'LSP ツール（features.lsp_tools）',
                desc: 'LSP ベースのコードツールをモデルへ公開します。',
            },
            featuresWriteFile: {
                label: 'write ツール（features.write_file）',
                desc: 'ファイル書き込みツールを有効にします。',
            },
            featuresToolSearch: {
                label: 'MCP ツール検索（features.tool_search）',
                desc: 'MCP ツールの検索（オンデマンド読み込み）を有効にします。',
            },
            modelsImageDescription: {
                label: '画像説明モデル（models.image_description）',
                desc: '画像の内容を説明するときに使用するモデル ID です。現在の候補とカスタムモデル ID の両方を入力できます。',
            },
            modelsMaxRetries: {
                label: '推論の再試行回数（models.max_retries）',
                desc: 'モデル推論が失敗した場合に行う全モデル共通の最大再試行回数です。',
            },
            modelsStreamToolCalls: {
                label: 'ツール呼出しをストリーム（models.stream_tool_calls）',
                desc: 'モデル要求でツール呼び出しをストリーミング形式にします。対応しない BYOK エンドポイントでは無効にします。',
            },
            toolsetFileToolset: {
                label: 'ファイル編集方式（toolset.file_toolset）',
                desc: 'standard は通常のファイル編集、hashline は行ハッシュを使う編集ツール方式です。既定は standard です。',
            },
            toolsetBashTimeoutSecs: {
                label: 'bash実行時間（toolset.bash.timeout_secs）',
                desc: 'フォアグラウンド bash コマンドの既定タイムアウト秒数です。既定は 120 秒です。',
            },
            toolsetBashOutputByteLimit: {
                label: 'bash出力上限（toolset.bash.output_byte_limit）',
                desc: 'bash コマンドから取得する出力の最大バイト数です。既定は 20000 バイトです。',
            },
            toolsetBashMaxTimeoutSecs: {
                label: 'bash最大実行時間（toolset.bash.max_timeout_secs）',
                desc: 'モデルが要求できるフォアグラウンド bash タイムアウトの上限秒数です。既定は 36000 秒です。',
            },
            toolsetBashAutoBackground: {
                label: 'タイムアウト時にバックグラウンド化（toolset.bash.auto_background_on_timeout）',
                desc: 'bash コマンドがタイムアウトしたとき終了せずバックグラウンド実行へ移します。既定は有効です。',
            },
            toolsetWebFetchProxyEndpoint: {
                label: 'WebFetchプロキシ（toolset.web_fetch.proxy_endpoint）',
                desc: 'web_fetch の外向き通信に使用するプロキシ URL を指定します。',
            },
            uiCompactMode: {
                label: 'コンパクト表示（ui.compact_mode）',
                desc: 'TUI の余白や装飾を減らして、狭い端末に多くの内容を表示します。20行以下では自動的に使われます。',
            },
            uiScreenMode: {
                label: '画面モード（ui.screen_mode）',
                desc: 'fullscreen は標準の全画面TUI、minimal は確定済み出力を端末の通常スクロールバックへ残します。',
            },
            uiShowTimestamps: {
                label: '時刻を表示（ui.show_timestamps）',
                desc: '会話やツールイベントに時刻を表示します。既定は有効です。',
            },
            uiShowTimeline: {
                label: 'タイムラインを表示（ui.show_timeline）',
                desc: 'セッション内の進行を時系列のタイムラインとして表示します。',
            },
            uiSimpleMode: {
                label: 'シンプル入力モード（ui.simple_mode）',
                desc: 'Vim 入力モードを使わない簡素な入力操作にします。既定は有効です。',
            },
            uiTheme: {
                label: 'TUIテーマ（ui.theme）',
                desc: 'auto または組み込みの Grok Build カラーテーマを選びます。候補外の保存済みテーマも保持できます。',
            },
            uiRenderMermaid: {
                label: 'Mermaid描画（ui.render_mermaid）',
                desc: 'Mermaid 図の端末描画を自動判定、常時有効、無効から選びます。',
            },
            uiRememberToolApprovals: {
                label: 'ツール承認を記憶（ui.remember_tool_approvals）',
                desc: 'セッション中に許可したツール操作を記憶し、同じ承認確認の繰り返しを減らします。',
            },
            uiShowThinkingBlocks: {
                label: '思考ブロックを表示（ui.show_thinking_blocks）',
                desc: 'モデルの推論・思考ブロックを TUI に表示します。環境変数 GROK_SHOW_THINKING_BLOCKS と同じ機能です。',
            },
            uiPromptSuggestions: {
                label: 'プロンプト候補（ui.prompt_suggestions）',
                desc: '入力欄に状況に応じたプロンプト候補を表示します。',
            },
            uiGroupToolVerbs: {
                label: 'ツール動作をまとめる（ui.group_tool_verbs）',
                desc: '連続した類似ツール操作を一つの動作グループとして表示します。既定は有効です。',
            },
            uiCollapsedEditBlocks: {
                label: '編集ブロックを折りたたむ（ui.collapsed_edit_blocks）',
                desc: 'ファイル編集結果を既定で折りたたんで表示します。既定は無効です。',
            },
            uiScrollSpeed: {
                label: 'スクロール速度（ui.scroll_speed）',
                desc: 'TUI のスクロール速度を 1～100 で調整します。',
            },
            uiScrollMode: {
                label: 'スクロール入力方式（ui.scroll_mode）',
                desc: '入力機器を自動判定するか、ホイールまたはトラックパッド向けの挙動へ固定します。',
            },
            uiScrollLines: {
                label: '1回のスクロール行数（ui.scroll_lines）',
                desc: 'ホイール入力1回で移動する行数を 1～10 で指定します。',
            },
            uiInvertScroll: {
                label: 'スクロール方向を反転（ui.invert_scroll）',
                desc: 'マウスやトラックパッドによるTUIスクロールの方向を反転します。',
            },
            uiKeepTextSelection: {
                label: 'テキスト選択の保持（ui.keep_text_selection）',
                desc: '選択範囲を短く点滅、保持、単語選択向けの動作から選びます。候補外の保存済み値も保持できます。',
            },
            featuresRemoteFetch: {
                label: 'リモート設定取得（features.remote_fetch）',
                desc: 'xAI バックエンドからモデルカタログとリモート設定を取得します。無効時は同梱のモデル情報だけを使います。既定は有効です。',
            },
            featuresImageGen: {
                label: '画像生成（features.image_gen）',
                desc: 'Grok Build の画像生成ツールを有効にします。',
            },
            featuresImageEdit: {
                label: '画像編集（features.image_edit）',
                desc: 'Grok Build の画像編集ツールを有効にします。',
            },
            featuresVideoGen: {
                label: '動画生成（features.video_gen）',
                desc: 'Grok Build の動画生成ツールを有効にします。',
            },
            telemetryTraceUpload: {
                label: 'トレース送信（telemetry.trace_upload）',
                desc: '診断用のセッショントレースを xAI へアップロードできるようにします。',
            },
            cliUseLeader: {
                label: 'リーダープロセスを使用（cli.use_leader）',
                desc: '複数の Grok Build セッションを調整するリーダープロセスを利用します。',
            },
            cliMinimumVersion: {
                label: 'CLI最低バージョン（cli.minimum_version）',
                desc: '管理された設定などが要求する Grok Build CLI の最低バージョンを指定します。',
            },
            harnessDisableCodebaseUpload: {
                label: 'コードベース送信を無効化（harness.disable_codebase_upload）',
                desc: 'Grok Build のホスト機能によるコードベースのアップロードを禁止します。',
            },
            managedMcpsEnabled: {
                label: '管理MCPを有効化（managed_mcps.enabled）',
                desc: '組織またはリモート設定から配布される管理対象 MCP サーバーを有効にします。',
            },
            compatCursorSkills: {
                label: 'Cursorスキルを検出（compat.cursor.skills）',
                desc: 'Cursor のスキルディレクトリを検索し、Grok Build から利用できるようにします。既定は有効です。',
            },
            compatCursorRules: {
                label: 'Cursorルールを検出（compat.cursor.rules）',
                desc: '.cursor/rules のルールを検索し、Grok Build の指示として読み込みます。既定は有効です。',
            },
            compatCursorAgents: {
                label: 'Cursorエージェントを検出（compat.cursor.agents）',
                desc: 'Cursor のエージェント定義を検索し、Grok Build から利用できるようにします。既定は有効です。',
            },
            compatCursorMcps: {
                label: 'Cursor MCPを検出（compat.cursor.mcps）',
                desc: 'Cursor の mcp.json 設定を検索し、MCP サーバーを取り込みます。既定は有効です。',
            },
            compatCursorHooks: {
                label: 'Cursorフックを検出（compat.cursor.hooks）',
                desc: 'Cursor のフック設定を検索し、互換フックとして読み込みます。既定は有効です。',
            },
            compatClaudeSkills: {
                label: 'Claudeスキルを検出（compat.claude.skills）',
                desc: 'Claude Code のスキルディレクトリを検索し、Grok Build から利用できるようにします。既定は有効です。',
            },
            compatClaudeRules: {
                label: 'Claudeルールを検出（compat.claude.rules）',
                desc: 'Claude 互換のルールを検索し、Grok Build の指示として読み込みます。既定は有効です。',
            },
            compatClaudeAgents: {
                label: 'Claudeエージェントを検出（compat.claude.agents）',
                desc: 'Claude のエージェント定義と CLAUDE.md / CLAUDE.local.md を検索します。既定は有効です。',
            },
            compatClaudeMcps: {
                label: 'Claude MCPを検出（compat.claude.mcps）',
                desc: 'Claude Code の MCP 設定を検索し、MCP サーバーを取り込みます。既定は有効です。',
            },
            compatClaudeHooks: {
                label: 'Claudeフックを検出（compat.claude.hooks）',
                desc: 'Claude Code のフック設定を検索し、互換フックとして読み込みます。既定は有効です。',
            },
            modelsExtraHeaders: {
                label: 'モデル共通ヘッダー（models.extra_headers）',
                desc: 'すべてのモデル要求へ追加する HTTP ヘッダーのマップです。モデル個別の設定が優先します。',
            },
            modelsAllowedModels: {
                label: 'モデル許可リスト（models.allowed_models）',
                desc: 'モデル選択画面、既定モデル、-m で選べるモデルを glob パターンで制限する配列です。',
            },
            modelsHiddenModels: {
                label: '非表示モデル（models.hidden_models）',
                desc: 'モデル選択画面から隠すモデル ID の配列です。-m では引き続き指定できます。',
            },
            modelsDisabledModels: {
                label: '無効モデル（models.disabled_models）',
                desc: 'モデルカタログから完全に除外するモデル ID の配列です。非表示設定より優先します。',
            },
            customModels: {
                label: 'カスタムモデル定義（model.<id>）',
                desc: 'BYOK モデルごとの API 接続、認証、サンプリング、コンテキスト、再試行設定を定義します。',
            },
            toolsetWebFetchAllowedDomains: {
                label: 'Web取得許可ドメイン（toolset.web_fetch.allowed_domains）',
                desc: 'web_fetch がアクセスできるドメインを上書きする文字列配列です。',
            },
            mcpServers: {
                label: 'MCPサーバー定義（mcp_servers.<name>）',
                desc: 'MCP サーバーごとの stdio または HTTP 接続、環境変数、ヘッダー、タイムアウトを定義します。',
            },
            permission: {
                label: '権限規則（permission）',
                desc: 'ツール利用の allow、deny、ask 配列と、action・tool・pattern を持つ詳細規則を定義します。',
            },
            subagentsToggle: {
                label: 'サブエージェント個別状態（subagents.toggle）',
                desc: 'サブエージェントの種類ごとに有効・無効を指定するマップです。',
            },
            subagentsModels: {
                label: 'サブエージェントモデル（subagents.models）',
                desc: 'サブエージェントの種類ごとに使用するモデル ID を指定するマップです。',
            },
            skillsPaths: {
                label: '追加スキルパス（skills.paths）',
                desc: 'Grok Build が追加で検索するスキルディレクトリの配列です。',
            },
            skillsDisabled: {
                label: '無効スキル（skills.disabled）',
                desc: '検出はするものの有効化しないスキル名の配列です。',
            },
            pluginsPaths: {
                label: '追加プラグインパス（plugins.paths）',
                desc: 'Grok Build が追加で検索するプラグインディレクトリの配列です。',
            },
            pluginsDisabled: {
                label: '無効プラグイン（plugins.disabled）',
                desc: '検出はするものの有効化しないプラグイン名の配列です。',
            },
            pluginsEnabled: {
                label: '有効プラグイン（plugins.enabled）',
                desc: '明示的に有効化するプラグイン名の配列です。プロジェクトプラグインが既定で無効な場合に使用します。',
            },
        },
    },
    pluginManager: {
        title: 'Grok プラグイン管理',
        description:
            'Grok のプラグインを一覧・追加・削除し、マーケットプレイスを管理します。操作には grok コマンドを使用します。',
    },
    nav: {
        grokMcp: 'Grok MCP 管理',
        grokAgentSkill: 'Grok Agent・Skill 管理',
        pluginManager: 'Grok プラグイン管理',
        grokCleanup: 'Grok クリーンアップ',
        grokSettings: 'Grok 設定',
    },
    dashboard: {
        grokMcpDesc: 'Grok（CLI）の MCP サーバーを有効化/無効化/並べ替えします。',
        grokAgentSkillDesc: 'Grok のエージェント・スキルを管理します。',
        pluginManagerDesc: 'Grok のプラグインとマーケットプレイスを管理します。',
        grokCleanupDesc: '~/.grok 配下のディレクトリと旧バージョンの実行ファイルをクリーンアップします。',
        grokSettingsDesc: '~/.grok/config.toml の設定項目を編集します。',
    },
};
