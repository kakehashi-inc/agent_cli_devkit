export default {
    codexMcp: {
        title: 'Codex MCP 管理',
        wslSection: 'WSL: {{distro}}',
        notFound: 'この環境には ~/.codex/config.toml が見つかりません',
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
        title: 'Codex クリーンアップ',
        description:
            '~/.codex 配下の履歴・キャッシュ・一時ファイル・ログ・セッションを削除します。ディスク容量の回収に加え、動作速度の改善や、一時的な内容が残って挙動が不可解になった状態の解消にも役立ちます。設定ファイル・認証情報・エージェント・スキル・状態DB(sqlite)は対象外です。',
        wslSection: 'WSL: {{distro}}',
        deleteSelected: '選択済みを削除',
        cancel: 'キャンセル',
        confirmTitle: 'クリーンアップの確認',
        confirmBody: '選択した {{count}} 件を削除します。元に戻せません。よろしいですか？',
        reclaimable: '{{count}} 件選択中、回収可能 {{size}}',
        noCandidates: 'クリーンアップ対象が見つかりません',
        inUseWarning:
            '実行中の Codex セッションがあると一部ディレクトリの削除に失敗することがあります。削除前にセッションを終了してください。',
        deleteSuccess: 'クリーンアップが完了しました',
        deletePartial: '使用中のファイルがあったため、一部をスキップしました',
        deleteError: '一部の項目の削除に失敗しました',
        columnName: '項目',
        columnDescription: '説明',
        columnFiles: 'ファイル数',
        columnSize: 'サイズ',
        dir: {
            sessions: 'sessions',
            cache: 'cache',
            generatedImages: 'generated_images',
            tmp: 'tmp',
            log: 'log',
            modelsCache: 'models_cache.json',
            sessionIndex: 'session_index.jsonl',
        },
        desc: {
            sessions: '過去セッションの記録（会話ログ・ロールアウト）。年ごとに展開して個別削除できます。',
            cache: 'ダウンロードや各種データの一時キャッシュ。',
            generatedImages: 'Codex が生成した画像の保存領域。',
            tmp: '一時作業ファイル。',
            log: 'ログ出力ディレクトリ。',
            modelsCache: '利用可能なモデル情報のキャッシュ。',
            sessionIndex: 'セッション一覧のインデックス。',
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
        title: 'Codex Agent・Skill 管理',
        description:
            'Codex のカスタムエージェント・スキルを一覧表示し、選択したものを ZIP でまとめてダウンロード、または ZIP／ファイルをアップロードして取り込みます。',
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
        uploadError: 'アップロードに失敗しました',
        overwriteConfirmTitle: '同名の項目を上書きしますか？',
        overwriteConfirmBody: '次の {{count}} 件は既に存在します。削除して置き換えます: {{names}}。続行しますか？',
        importOfficial: '公式スキルインポート',
        importOfficialTitle: '公式スキルをインポート',
        importOfficialDesc:
            'OpenAI 公式リポジトリ（openai/skills）のスキルです。取り込むスキルを選択してください。同名の既存スキルは置き換えられます。',
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
            'agent-toml-into-skill':
                'このファイルはエージェント（.toml）の可能性があります。スキルとして取り込みますか？',
            'skill-no-skillmd':
                'このアーカイブは SKILL.md を含んでおらず、正しいスキルでない可能性があります。スキルとして取り込みますか？',
            'skillmd-into-agent':
                'このファイルは SKILL.md（スキル）の可能性があります。エージェントとして取り込みますか？',
        },
        kindBlock: {
            'agent-into-skill':
                'このアーカイブはエージェント（.toml ファイル）のようです。スキルタブには取り込めません。エージェントタブを使用してください。',
            'skill-into-agent':
                'このアーカイブはスキル（SKILL.md を含むフォルダ）のようです。エージェントタブには取り込めません。スキルタブを使用してください。',
            'no-toml': 'このアーカイブには .toml ファイルが含まれておらず、エージェントとして取り込めません。',
        },
    },
    settings: {
        title: 'Codex 設定',
        description: '~/.codex/config.toml の設定項目をテーブルで編集、または直接編集します。',
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
            display: '表示',
            data: 'データ',
            features: 'エージェント・機能',
        },
        field: {
            model: {
                label: 'モデル（model）',
                desc: '既定のモデル ID。候補は現在のカタログに従い、カスタムプロバイダのモデル ID も入力できます。',
            },
            modelProvider: {
                label: 'モデルプロバイダ（model_provider）',
                desc: '使用するモデルプロバイダ ID（[model_providers] で定義した任意 ID も可）。既定は openai。',
            },
            modelReasoningEffort: {
                label: '推論の労力（model_reasoning_effort）',
                desc: 'none から ultra までのモデル依存の推論レベル。高いほど深く推論し、時間とトークンも増えます。',
            },
            modelReasoningSummary: {
                label: '推論サマリ（model_reasoning_summary）',
                desc: '推論サマリの詳細度。none で無効。',
            },
            modelVerbosity: {
                label: '応答の冗長さ（model_verbosity）',
                desc: 'GPT-5 系の応答の長さの傾向。',
            },
            modelSupportsReasoningSummaries: {
                label: '推論サマリ強制（model_supports_reasoning_summaries）',
                desc: 'モデルが推論サマリに対応しているものとして強制的に有効化します。',
            },
            modelContextWindow: {
                label: 'コンテキストウィンドウ（model_context_window）',
                desc: 'コンテキストウィンドウのトークン数。空欄で既定。',
            },
            approvalPolicy: {
                label: '承認ポリシー（approval_policy）',
                desc: 'コマンド実行時に確認を求めるタイミング。',
            },
            sandboxMode: {
                label: 'サンドボックス（sandbox_mode）',
                desc: 'ファイルシステム／ネットワークアクセスの厳密度。',
            },
            webSearch: {
                label: 'Web検索（web_search）',
                desc: 'Web検索の動作モード（disabled / cached / indexed / live）。通常の既定は cached ですが、--yolo などのフルアクセス時は live になるため、未設定時の表示は固定しません。',
            },
            personality: {
                label: 'パーソナリティ（personality）',
                desc: '応答のコミュニケーションスタイル。',
            },
            allowLoginShell: {
                label: 'ログインシェル許可（allow_login_shell）',
                desc: 'コマンド実行時にログインシェルの使用を許可します。',
            },
            historyPersistence: {
                label: 'セッション履歴（history.persistence）',
                desc: 'セッション記録の保存。none で保存しません。',
            },
            fileOpener: {
                label: 'ファイルを開く（file_opener）',
                desc: 'クリック可能な引用を開くエディタ。既定は vscode。',
            },
            hideAgentReasoning: {
                label: '推論を隠す（hide_agent_reasoning）',
                desc: 'TUI／実行出力から推論イベントを抑制します。',
            },
            showRawAgentReasoning: {
                label: '生の推論を表示（show_raw_agent_reasoning）',
                desc: '生の推論コンテンツを表示します。',
            },
            tuiAnimations: {
                label: 'TUIアニメーション（tui.animations）',
                desc: 'TUI内のアニメーション表示。',
            },
            tuiShowTooltips: {
                label: 'TUIツールチップ（tui.show_tooltips）',
                desc: 'オンボーディングのツールチップを表示します。',
            },
            projectDocMaxBytes: {
                label: 'AGENTS.md 読込上限（project_doc_max_bytes）',
                desc: 'AGENTS.md を読み込む最大バイト数。空欄で既定（32KiB）。',
            },
            analyticsEnabled: {
                label: 'アナリティクス（analytics.enabled）',
                desc: 'メトリクス収集を有効にします。',
            },
            feedbackEnabled: {
                label: 'フィードバック送信（feedback.enabled）',
                desc: 'フィードバック送信を有効にします。',
            },
            reviewModel: {
                label: 'レビューモデル（review_model）',
                desc: '/review で使うモデルを上書きします。未設定時は現在のセッションモデルを使います。候補外のモデル ID も入力できます。',
            },
            planModeReasoningEffort: {
                label: 'プラン時の推論強度（plan_mode_reasoning_effort）',
                desc: 'プランモード中だけ使用する推論強度です。未設定時は通常の model_reasoning_effort に従います。',
            },
            modelAutoCompactTokenLimit: {
                label: '自動圧縮トークン上限（model_auto_compact_token_limit）',
                desc: '会話を自動圧縮する基準トークン数を上書きします。未設定時はモデルの既定値を使います。',
            },
            modelAutoCompactTokenLimitScope: {
                label: '自動圧縮の計測範囲（model_auto_compact_token_limit_scope）',
                desc: '上限判定を全トークン（total）または固定プレフィックス後の本文（body_after_prefix）で計測します。',
            },
            toolOutputTokenLimit: {
                label: 'ツール出力トークン上限（tool_output_token_limit）',
                desc: '1回のツール出力としてコンテキストへ保持する最大トークン数です。',
            },
            modelCatalogJson: {
                label: 'モデルカタログJSON（model_catalog_json）',
                desc: '起動時に読み込むモデルカタログ上書き JSON ファイルのパスです。',
            },
            openAiBaseUrl: {
                label: 'OpenAI API URL（openai_base_url）',
                desc: '組み込み OpenAI プロバイダの API ベース URL を上書きします。ChatGPT ログイン URL とは別です。',
            },
            ossProvider: {
                label: 'OSSプロバイダ（oss_provider）',
                desc: '--oss セッションで使うローカルモデルプロバイダです。未設定時は起動時に選択します。候補外の ID も入力できます。',
            },
            serviceTier: {
                label: 'サービスタイア（service_tier）',
                desc: '優先するサービス階層です。組み込み例は fast と flex で、モデルカタログ由来の値も入力できます。',
            },
            approvalsReviewer: {
                label: '承認レビュー担当（approvals_reviewer）',
                desc: '対象となる承認要求をユーザーが確認するか、自動レビューへ送るかを選びます。',
            },
            defaultPermissions: {
                label: '既定の権限プロファイル（default_permissions）',
                desc: '起動時に適用する組み込みまたは [permissions] で定義した権限プロファイル名です。',
            },
            sandboxNetworkAccess: {
                label: 'ワークスペースのネット接続（sandbox_workspace_write.network_access）',
                desc: 'workspace-write サンドボックス内からの外向きネットワークアクセスを許可します。既定は無効です。',
            },
            sandboxExcludeTmpdirEnvVar: {
                label: 'TMPDIRを書込対象外（sandbox_workspace_write.exclude_tmpdir_env_var）',
                desc: 'workspace-write の書き込み可能範囲から $TMPDIR が示すディレクトリを除外します。',
            },
            sandboxExcludeSlashTmp: {
                label: '/tmpを書込対象外（sandbox_workspace_write.exclude_slash_tmp）',
                desc: 'workspace-write の書き込み可能範囲から /tmp を除外します。',
            },
            tuiNotificationMethod: {
                label: '端末通知方式（tui.notification_method）',
                desc: '端末通知に自動判定、OSC 9、ベル文字のどれを使うか選びます。',
            },
            tuiNotificationCondition: {
                label: '端末通知条件（tui.notification_condition）',
                desc: '端末が非フォーカス時だけ通知するか、常に通知するかを選びます。既定は unfocused です。',
            },
            tuiAlternateScreen: {
                label: '代替画面（tui.alternate_screen）',
                desc: 'TUI の代替画面使用を自動判定、常時使用、使用しないから選びます。auto は Zellij でスクロールバックを保護します。',
            },
            tuiTheme: {
                label: 'TUIテーマ（tui.theme）',
                desc: '/theme で保存する構文強調テーマ名です。$CODEX_HOME/themes のカスタム .tmTheme も指定できます。',
            },
            historyMaxBytes: {
                label: '履歴ファイル上限（history.max_bytes）',
                desc: '履歴ファイルの最大バイト数です。超過時は古い項目から削除されます。',
            },
            checkForUpdateOnStartup: {
                label: '起動時に更新確認（check_for_update_on_startup）',
                desc: 'Codex 起動時に新しいバージョンを確認します。既定は有効です。',
            },
            disablePasteBurst: {
                label: '大量貼り付け検出を無効化（disable_paste_burst）',
                desc: 'TUI が短時間の大量入力を貼り付けとして扱う検出を無効にします。既定は無効です。',
            },
            modelInstructionsFile: {
                label: '基本指示ファイル（model_instructions_file）',
                desc: 'Codex の組み込み基本指示を置き換える指示ファイルのパスです。',
            },
            developerInstructions: {
                label: '追加開発者指示（developer_instructions）',
                desc: 'AGENTS.md より前に注入する追加のユーザー指示です。',
            },
            compactPrompt: {
                label: '圧縮プロンプト（compact_prompt）',
                desc: '履歴圧縮時に使う組み込みプロンプトをインライン文字列で上書きします。',
            },
            experimentalCompactPromptFile: {
                label: '圧縮プロンプトファイル（experimental_compact_prompt_file）',
                desc: '履歴圧縮プロンプトを読み込むファイルのパスです。実験的な上書き設定です。',
            },
            logDir: {
                label: 'ログ保存先（log_dir）',
                desc: 'Codex のログディレクトリを変更します。明示すると codex-tui.log の出力も有効になります。',
            },
            sqliteHome: {
                label: 'SQLite状態保存先（sqlite_home）',
                desc: 'SQLite を使うランタイム状態の保存ディレクトリを上書きします。',
            },
            backgroundTerminalMaxTimeout: {
                label: 'バックグラウンド端末待機上限（background_terminal_max_timeout）',
                desc: '空の write_stdin でバックグラウンド端末を待機できる最大時間をミリ秒で指定します。既定は5分です。',
            },
            cliAuthCredentialsStore: {
                label: 'ログイン資格情報の保存先（cli_auth_credentials_store）',
                desc: 'CLI ログイン資格情報をファイル、OSキーチェーン、または自動選択で保存します。既定は file です。',
            },
            chatgptBaseUrl: {
                label: 'ChatGPTログインURL（chatgpt_base_url）',
                desc: 'ChatGPT 認証フローのベース URL です。OpenAI API のエンドポイントとは別です。',
            },
            forcedChatgptWorkspaceId: {
                label: '固定ChatGPTワークスペース（forced_chatgpt_workspace_id）',
                desc: 'ChatGPT ログインを指定したワークスペース ID に制限します。',
            },
            forcedLoginMethod: {
                label: '固定ログイン方式（forced_login_method）',
                desc: '自動選択されるログイン方式を ChatGPT または API キーへ固定します。',
            },
            mcpOauthCredentialsStore: {
                label: 'MCP OAuth資格情報の保存先（mcp_oauth_credentials_store）',
                desc: 'MCP OAuth 資格情報をファイル、OSキーチェーン、または自動選択で保存します。既定は auto です。',
            },
            mcpOauthCallbackPort: {
                label: 'MCP OAuthコールバックポート（mcp_oauth_callback_port）',
                desc: 'MCP OAuth のローカルコールバック待受ポートを 1～65535 で固定します。',
            },
            mcpOauthCallbackUrl: {
                label: 'MCP OAuthコールバックURL（mcp_oauth_callback_url）',
                desc: 'リモート開発環境などで使う MCP OAuth リダイレクト URL のベースを上書きします。',
            },
            windowsWslSetupAcknowledged: {
                label: 'WSLセットアップ確認済み（windows_wsl_setup_acknowledged）',
                desc: 'Windows の WSL オンボーディング確認を完了済みとして記録します。通常は Codex が管理します。',
            },
            suppressUnstableFeaturesWarning: {
                label: '不安定機能の警告を非表示（suppress_unstable_features_warning）',
                desc: '開発中または実験的な機能フラグを有効にしたときの警告を抑止します。',
            },
            shellEnvironmentInherit: {
                label: 'シェル環境の継承範囲（shell_environment_policy.inherit）',
                desc: '子プロセスへ継承する環境変数をすべて、基本項目のみ、なしから選びます。',
            },
            shellEnvironmentIgnoreDefaultExcludes: {
                label: '機密変数の既定除外を無視（shell_environment_policy.ignore_default_excludes）',
                desc: 'KEY、SECRET、TOKEN を含む変数名の既定除外を無効にします。機密情報の露出に注意してください。',
            },
            shellEnvironmentExperimentalUseProfile: {
                label: 'シェルプロファイルを使用（shell_environment_policy.experimental_use_profile）',
                desc: '子プロセスの環境構築にユーザーのシェルプロファイルを使います。実験的な設定です。',
            },
            agentsMaxThreads: {
                label: 'エージェント同時数（agents.max_threads）',
                desc: '同時に開いておけるエージェントスレッド数の上限です。既定は 6 です。',
            },
            agentsMaxDepth: {
                label: 'エージェント階層深度（agents.max_depth）',
                desc: 'サブエージェントがさらに子を生成できる最大深度です。ルートは深度0、既定は1です。',
            },
            agentsJobMaxRuntimeSeconds: {
                label: 'エージェントジョブ時間（agents.job_max_runtime_seconds）',
                desc: 'spawn_agents_on_csv の各ワーカーに適用する既定の最大実行秒数です。未設定時は1800秒です。',
            },
            agentsInterruptMessage: {
                label: '中断メッセージを記録（agents.interrupt_message）',
                desc: 'エージェントターンを中断したとき、モデルから見えるメッセージを履歴へ記録します。既定は有効です。',
            },
            featuresGoals: {
                label: 'ゴール機能（features.goals）',
                desc: '長期タスクの達成条件と進捗を追跡するゴール機能を有効にします。安定機能で既定は有効です。',
            },
            featuresHooks: {
                label: 'ライフサイクルフック（features.hooks）',
                desc: 'ツール実行前後などに設定したライフサイクルフックを読み込みます。既定は有効です。',
            },
            featuresFastMode: {
                label: '高速モード（features.fast_mode）',
                desc: '対応モデルの高速モードを利用可能にします。安定機能で既定は有効です。',
            },
            featuresMemories: {
                label: 'ローカルメモリ（features.memories）',
                desc: '過去タスクからローカルメモリを生成・利用する実験的機能を有効にします。既定は無効です。',
            },
            memoriesGenerate: {
                label: 'メモリを生成（memories.generate_memories）',
                desc: '対象となる新しいタスクから将来利用するローカルメモリを生成します。features.memories の有効化が前提です。',
            },
            memoriesUse: {
                label: 'メモリを利用（memories.use_memories）',
                desc: '既存のローカルメモリを今後のセッションのコンテキストへ注入します。features.memories の有効化が前提です。',
            },
            memoriesDisableOnExternalContext: {
                label: '外部文脈使用時は記憶しない（memories.disable_on_external_context）',
                desc: 'MCP、Web検索、ツール検索など外部コンテキストを使ったタスクをメモリ生成の対象外にします。',
            },
            memoriesMinRateLimitRemainingPercent: {
                label: 'メモリ生成の残量下限（memories.min_rate_limit_remaining_percent）',
                desc: 'メモリ生成を開始するために必要な Codex レート制限残量の最低割合を 0～100 で指定します。',
            },
            memoriesExtractModel: {
                label: 'メモリ抽出モデル（memories.extract_model）',
                desc: '各タスクからメモリ候補を抽出するときに使うモデル ID を上書きします。',
            },
            memoriesConsolidationModel: {
                label: 'メモリ統合モデル（memories.consolidation_model）',
                desc: '複数のローカルメモリを整理・統合するときに使うモデル ID を上書きします。',
            },
            featuresMultiAgent: {
                label: 'マルチエージェント（features.multi_agent）',
                desc: 'サブエージェントの生成・指示・待機などのマルチエージェント機能を有効にします。既定は有効です。',
            },
            featuresPersonality: {
                label: 'パーソナリティ機能（features.personality）',
                desc: 'personality 設定とセッション内の応答スタイル切り替えを有効にします。既定は有効です。',
            },
            featuresRemotePlugin: {
                label: 'リモートプラグイン（features.remote_plugin）',
                desc: 'リモート配布される Codex プラグインの取得と利用を有効にします。既定は有効です。',
            },
            featuresShellSnapshot: {
                label: 'シェル環境スナップショット（features.shell_snapshot）',
                desc: '起動時のシェル環境を取得して後続のコマンドへ再利用します。既定は有効です。',
            },
            featuresShellTool: {
                label: 'シェルツール（features.shell_tool）',
                desc: 'コマンド実行用のシェルツールを有効にします。安定機能で既定は有効です。',
            },
            featuresUnifiedExec: {
                label: '統合実行セッション（features.unified_exec）',
                desc: 'コマンド実行と標準入力の継続操作を統合した実行基盤を有効にします。安定機能で既定は無効です。',
            },
            featuresApps: {
                label: 'アプリコネクタ（features.apps）',
                desc: 'Codex から接続済みアプリやコネクタを利用できるようにします。安定機能で既定は有効です。',
            },
            featuresNetworkProxy: {
                label: 'サンドボックス通信プロキシ（features.network_proxy）',
                desc: '権限プロファイルで制御するサンドボックス通信プロキシを有効にします。実験的機能で既定は無効です。',
            },
            featuresEnableRequestCompression: {
                label: 'リクエスト圧縮（features.enable_request_compression）',
                desc: '対応するモデル要求の転送データを圧縮します。安定機能で既定は有効です。',
            },
            featuresSkillMcpDependencyInstall: {
                label: 'スキルMCP依存関係の導入（features.skill_mcp_dependency_install）',
                desc: 'スキルが必要とする MCP 依存関係のインストールフローを有効にします。安定機能で既定は有効です。',
            },
            featuresPreventIdleSleep: {
                label: '実行中のスリープ防止（features.prevent_idle_sleep）',
                desc: 'Codex が処理中の間、システムのアイドルスリープを防ぎます。実験的機能で既定は無効です。',
            },
            modelProviders: {
                label: 'モデルプロバイダー定義（model_providers.<id>）',
                desc: 'カスタムモデルプロバイダーごとのエンドポイント、認証、ヘッダー、再試行設定を定義するテーブルです。',
            },
            approvalPolicyGranular: {
                label: '詳細な承認ポリシー（approval_policy.granular）',
                desc: 'サンドボックス昇格、ルール、MCP確認、権限要求、スキル承認を種類別に制御します。',
            },
            sandboxWritableRoots: {
                label: '追加の書込可能ルート（sandbox_workspace_write.writable_roots）',
                desc: 'workspace-write サンドボックスで、ワークスペース以外に書き込みを許可するパスの配列です。',
            },
            permissionsProfiles: {
                label: '権限プロファイル（permissions.<name>）',
                desc: '名前付き権限プロファイルのファイルシステム、ワークスペースルート、ネットワーク規則を定義します。',
            },
            notify: {
                label: '外部通知コマンド（notify）',
                desc: 'ターン完了時などに起動する外部通知プログラムと引数の配列です。未設定時は無効です。',
            },
            tuiNotifications: {
                label: 'TUI通知対象（tui.notifications）',
                desc: 'デスクトップ通知を有効・無効にするか、通知するイベントだけを配列で指定します。既定は有効です。',
            },
            tuiStatusLine: {
                label: 'TUIステータス行（tui.status_line）',
                desc: 'フッターへ表示するモデル、残りコンテキスト、Gitブランチ等の項目 ID を順番に指定します。',
            },
            tuiTerminalTitle: {
                label: '端末タイトル（tui.terminal_title）',
                desc: '端末ウィンドウまたはタブのタイトルへ表示する項目 ID を順番に指定します。',
            },
            tuiKeymap: {
                label: 'TUIキー割り当て（tui.keymap）',
                desc: 'global、composer、chat などの文脈ごとに TUI 操作のキー割り当てを上書きします。',
            },
            projectDocFallbackFilenames: {
                label: '指示ファイル代替名（project_doc_fallback_filenames）',
                desc: '各ディレクトリで AGENTS.md がない場合に検索する代替ファイル名を優先順で指定します。',
            },
            projectRootMarkers: {
                label: 'プロジェクトルート目印（project_root_markers）',
                desc: '親ディレクトリを探索してプロジェクトルートを決めるときに使用するファイル名の配列です。',
            },
            shellEnvironmentExclude: {
                label: '環境変数除外パターン（shell_environment_policy.exclude）',
                desc: '子プロセスへ継承する環境変数から除外する、大文字小文字を区別しない glob パターンの配列です。',
            },
            shellEnvironmentSet: {
                label: '環境変数上書き（shell_environment_policy.set）',
                desc: '子プロセスへ渡す環境変数を明示的に追加または上書きするキーと値のマップです。',
            },
            shellEnvironmentIncludeOnly: {
                label: '環境変数許可リスト（shell_environment_policy.include_only）',
                desc: '空でない場合に、子プロセスへ残す環境変数名を限定するパターンの配列です。',
            },
            projects: {
                label: 'プロジェクト信頼設定（projects）',
                desc: '絶対パスごとに worktree の trusted または untrusted 状態を記録するテーブルです。',
            },
            agentsDefinitions: {
                label: 'エージェント定義（agents.<name>）',
                desc: '名前付きサブエージェントの説明、設定ファイル、候補ニックネームなどを定義するテーブルです。',
            },
            skillsConfig: {
                label: 'スキル個別設定（skills.config）',
                desc: 'SKILL.md のパスごとにスキルを有効または無効にするテーブル配列です。',
            },
            hooks: {
                label: 'ライフサイクルフック（hooks）',
                desc: 'ツール実行前後などのイベントで実行するコマンドフックをインラインで定義します。',
            },
            mcpServers: {
                label: 'MCPサーバー定義（mcp_servers.<id>）',
                desc: 'MCP サーバーごとの stdio または HTTP 接続、認証、タイムアウト、ツール制御を定義します。',
            },
            apps: {
                label: 'アプリ個別設定（apps.<id>）',
                desc: 'アプリごとの有効状態、破壊的操作、承認方式、ツール単位の制御を定義します。',
            },
            toolSuggest: {
                label: 'ツール候補制御（tool_suggest）',
                desc: 'Codex が導入を提案できるコネクタやプラグインの許可リストと無効リストを定義します。',
            },
        },
    },
    pluginManager: {
        title: 'Codex プラグイン管理',
        description:
            'Codex のプラグインを一覧・追加・削除し、マーケットプレイスを管理します。操作には codex コマンドを使用します。',
    },
    nav: {
        codexMcp: 'Codex MCP 管理',
        codexAgentSkill: 'Codex Agent・Skill 管理',
        pluginManager: 'Codex プラグイン管理',
        codexCleanup: 'Codex クリーンアップ',
        codexSettings: 'Codex 設定',
    },
    dashboard: {
        codexMcpDesc: 'Codex（CLI）の MCP サーバーを有効化/無効化/並べ替えします。',
        codexAgentSkillDesc: 'Codex のエージェント・スキルを管理します。',
        pluginManagerDesc: 'Codex のプラグインとマーケットプレイスを管理します。',
        codexCleanupDesc: '~/.codex 配下のディレクトリをクリーンアップして容量を回収します。',
        codexSettingsDesc: '~/.codex/config.toml の設定項目を編集します。',
    },
};
