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
            '~/.codex 配下の履歴・キャッシュ・一時ファイル・ログ・セッションと、更新で残った旧バージョンの Codex 本体を削除します。ディスク容量の回収に加え、動作速度の改善や、一時的な内容が残って挙動が不可解になった状態の解消にも役立ちます。',
        wslSection: 'WSL: {{distro}}',
        deleteSelected: '選択済みを削除',
        cancel: 'キャンセル',
        confirmTitle: 'クリーンアップの確認',
        confirmBody: '選択した {{count}} 件を削除します。元に戻せません。よろしいですか？',
        reclaimable: '{{count}} 件選択中、回収可能 {{size}}',
        noCandidates: 'クリーンアップ対象が見つかりません',
        deleteSuccess: 'クリーンアップが完了しました',
        deleteError: '一部の項目の削除に失敗しました',
        columnName: '項目',
        columnDescription: '説明',
        columnFiles: 'ファイル数',
        columnSize: 'サイズ',
        view: {
            label: '表示',
            date: '日付',
            project: 'プロジェクト',
        },
        threadCount: 'スレッド {{count}}',
        lastUpdated: '最終更新 {{date}}',
        notice: {},
        confirmWarning: {
            sessions:
                '選択したセッションのセッションファイル、状態DBの行、session_index.jsonl と history.jsonl の該当行、シェルのスナップショット、可視化の出力、ロックファイルを削除します。',
            sessionsNoDb:
                '選択したセッションのセッションファイル、session_index.jsonl と history.jsonl の該当行、シェルのスナップショット、可視化の出力、ロックファイルを削除します。この環境では状態DBの行は残ります。',
            sessionProjects:
                '選択したパスのスレッドのセッションファイル、状態DBの行、session_index.jsonl と history.jsonl の該当行、シェルのスナップショット、可視化の出力、ロックファイルを削除します。',
            projectRecords:
                '信頼の記録を削除します。そのフォルダを次に開いたときに信頼の確認が再び表示されることがあります。untrusted の記録を削除すると明示的な拒否も失われ、プロジェクトの AGENTS.md も読まれるようになります。',
        },
        dir: {
            sessions: 'sessions',
            archivedSessions: 'archived_sessions',
            sessionProjects: 'sessions / archived_sessions',
            projectRecords: 'プロジェクト記録',
            history: 'history.jsonl',
            shellSnapshots: 'shell_snapshots',
            cache: 'cache',
            generatedImages: 'generated_images',
            tmpArg0: 'tmp/arg0',
            pluginsSyncTemp: '.tmp（プラグイン同期の作業フォルダ）',
            log: 'log',
            sandboxLogs: 'sandbox.*.log（古いサンドボックスログ）',
            modelsCache: 'models_cache.json',
            sessionIndex: 'session_index.jsonl',
            sandboxBinOld: '.sandbox-bin（旧バージョン）',
            standaloneOldReleases: 'packages/standalone/releases（旧バージョン）',
        },
        desc: {
            sessions:
                '過去セッションの記録（会話ログ・ロールアウト）。一緒に消えるもの: 状態DBの行、session_index.jsonl と history.jsonl の該当行、シェルのスナップショット、可視化の出力、ロックファイル。',
            archivedSessions:
                'アーカイブしたセッションの記録。一緒に消えるもの: 状態DBの行、session_index.jsonl と history.jsonl の該当行、シェルのスナップショット、可視化の出力、ロックファイル。',
            sessionProjects:
                'ワークスペースのパスごとのスレッド（アーカイブ済みを含む）。一緒に消えるもの: 状態DBの行、session_index.jsonl と history.jsonl の該当行、シェルのスナップショット、可視化の出力、ロックファイル。',
            projectRecords: 'config.toml の [projects] に記録された、フォルダごとの信頼の記録。',
            history: '入力したメッセージの履歴（上キーで呼び出す入力履歴）。',
            shellSnapshots: 'コマンド実行用に取得したシェル環境のスナップショット。',
            cache: 'ダウンロードや各種データの一時キャッシュ（プラグインカタログ・アプリ情報など）。',
            generatedImages: 'Codex が生成した画像の保存領域。',
            tmpArg0: 'Codex が起動ごとに作る補助コマンド（apply_patch など）の一時フォルダ。',
            pluginsSyncTemp: 'プラグイン同期の途中で残った作業フォルダ。',
            log: 'ログ出力ディレクトリ。',
            sandboxLogs: 'Windows サンドボックスの日付別ログ。',
            modelsCache: '利用可能なモデル情報のキャッシュ。',
            sessionIndex: 'セッション一覧のインデックス。',
            sandboxBinOld: 'Windows サンドボックス用にコピーされた旧バージョンの実行ファイル。',
            standaloneOldReleases: '更新で残った旧バージョンの Codex 本体。',
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
                serenaProjects: 'Serena に登録されたプロジェクトの一覧。',
                serenaLogs: 'Serena が出力したログ。',
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
        deleteNestedNotice: 'スキルのフォルダーを削除すると、その中のスキルも一緒に削除されます: {{names}}',
        deleteSuccess: '{{count}} 件を削除しました',
        deletePartial: '使用中のため一部を削除できませんでした',
        deleteError: '選択した項目の削除に失敗しました',
        noEntries: '対象のデータはありません',
        unavailable: 'この環境のファイルに届きません。',
        downloadSuccess: 'アーカイブを保存しました',
        downloadError: 'アーカイブの作成に失敗しました',
        uploadSuccess: '{{count}} 件を展開しました',
        uploadError: 'アップロードに失敗しました',
        invalidArchive: 'このアーカイブは取り込めません。壊れているか、取り込む対象が含まれていません。',
        overwriteConfirmTitle: '同名の項目を上書きしますか？',
        overwriteConfirmBody: '次の {{count}} 件は既に存在します。削除して置き換えます: {{names}}。続行しますか？',
        importOfficial: '公式スキルインポート',
        importOfficialTitle: '公式スキルをインポート',
        importOfficialDesc: 'OpenAI 公式リポジトリ（openai/skills）のスキルです。同名の既存スキルは置き換えられます。',
        import: 'インポート',
        gitRequired: 'この機能には git のインストールが必要です',
        officialImportSuccess: '{{count}} 件の公式スキルをインポートしました',
        officialImportError: '公式スキルのインポートに失敗しました',
        officialListError: '公式スキルの取得に失敗しました',
        repoUpdating: '公式リポジトリを更新しています…',
        mdNoName: 'SKILL.md の name が取得できませんでした',
        listTruncated: '{{depth}} 階層より深いフォルダーは一覧に表示していません。',
        listIncomplete: '読み取れないフォルダーがあるため、一覧が欠けている可能性があります。',
        entryMark: {
            link: {
                self: 'リンク',
                via: 'リンクされたフォルダー内',
            },
            linkHint: {
                self: 'シンボリックリンクです。削除するとリンクだけを外します。',
                via: 'リンクされたフォルダーを通して読んでいるため、ここからは削除できません。削除するにはフォルダーのリンクを削除してください。',
            },
            status: {
                'dangling-link': '読み込まれません（リンク先がありません）',
                'no-entry-file': '読み込まれません（定義ファイルがないか、名前が「.」で始まります）',
                'link-folder': 'フォルダーへのリンク',
                'link-loop': '読み取りません（一覧済みのフォルダーです）',
                'refused-name': '管理できません（安全でない名前です）',
            },
            statusHint: {
                'dangling-link':
                    'リンク先のパスが存在しないため、CLI に読み込まれません。削除するとリンクだけを外します。',
                'no-entry-file': '定義ファイルがないか、名前が「.」で始まるため、CLI に読み込まれません。',
                'link-folder': 'フォルダーを指すリンクです。削除するとリンクだけを外します。',
                'link-loop':
                    '読み取り済みのフォルダーを指すリンクのため、中身をもう一度は表示しません。削除するとリンクだけを外します。',
                'refused-name':
                    '別の場所を指す可能性がある名前のため、ここでは参照、ダウンロード、削除ができません。このアプリの外で名前を変更してください。',
            },
        },
        kindWarnTitle: '種別が一致しない可能性があります',
        kindWarnContinue: 'このまま取り込む',
        kindWarn: {
            'agents-into-skills':
                'このアーカイブには .toml ファイルがあり SKILL.md がないため、エージェントの可能性があります。スキルとして取り込みますか？',
            'skillmd-into-agents':
                'このファイルは SKILL.md のため、スキルの可能性があります。エージェントとして取り込みますか？',
        },
    },
    profile: {
        tab: {
            settings: '設定',
            hooks: 'フック',
            statusLine: 'ステータスライン',
            externalCommands: '外部コマンド',
            permissions: '権限',
            instructions: '指示ファイル',
        },
        hooks: {
            savedNote: '保存しました。Codex で信頼するまで実行されません（/hooks で確認できます）。',
        },
        externalCommands: {
            environmentsTitle: 'environments.toml',
        },
        permissions: {
            rulesTitle: 'ルールファイル',
        },
    },
    settings: {
        title: 'Codex 設定',
        description:
            'Codex の設定、フック、権限、指示ファイルなどを編集します。主な設定ファイルは ~/.codex/config.toml です。',
        wslSection: 'WSL: {{distro}}',
        colItem: '項目',
        colValue: '値',
        directEdit: '直接編集',
        directEditTitle: 'config.toml を直接編集',
        directEditDesc: '保存するとファイル全体がこの内容で上書きされます。',
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
        verifyFailed:
            '編集結果の検証に失敗したため保存を中止しました。ファイルは変更されていません。この項目は「直接編集」で変更してください。',
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
                desc: '使用するモデルの ID です。',
            },
            reviewModel: {
                label: 'レビューモデル（review_model）',
                desc: '/review で使うモデルです。',
            },
            modelProvider: {
                label: 'モデルプロバイダ（model_provider）',
                desc: 'モデルの要求に使うプロバイダです。組み込みの ID か model_providers で定義した ID です。',
            },
            modelReasoningEffort: {
                label: '推論レベル（model_reasoning_effort）',
                desc: 'モデルの推論レベルです。高いほど深く推論し、時間とトークンも増えます。',
            },
            modelReasoningSummary: {
                label: '推論サマリ（model_reasoning_summary）',
                desc: '推論サマリの詳細度です。none は無効です。',
            },
            modelVerbosity: {
                label: '応答の冗長さ（model_verbosity）',
                desc: 'GPT-5 系の応答の長さです。',
            },
            modelContextWindow: {
                label: 'コンテキストウィンドウ（model_context_window）',
                desc: '使用中のモデルのコンテキストウィンドウのトークン数です。',
            },
            planModeReasoningEffort: {
                label: 'プランモードの推論レベル（plan_mode_reasoning_effort）',
                desc: 'プランモードで使う推論レベルです。',
            },
            modelAutoCompactTokenLimit: {
                label: '自動圧縮トークン上限（model_auto_compact_token_limit）',
                desc: '履歴の自動圧縮を始めるトークン数です。',
            },
            modelAutoCompactTokenLimitScope: {
                label: '自動圧縮の計測範囲（model_auto_compact_token_limit_scope）',
                desc: '上限の計測範囲です。total はコンテキスト全体、body_after_prefix は引き継いだプレフィックス以降の増加分です。',
            },
            modelPostTurnCompactThresholdPercent: {
                label: 'ターン終了時の圧縮しきい値（model_post_turn_compact_threshold_percent）',
                desc: '最終応答の後に履歴を圧縮する、利用可能なコンテキストウィンドウに対する割合です。0 は無効です。',
            },
            toolOutputTokenLimit: {
                label: 'ツール出力トークン上限（tool_output_token_limit）',
                desc: 'ツール出力 1 件を履歴に保持するトークン予算です。',
            },
            modelCatalogJson: {
                label: 'モデルカタログ JSON（model_catalog_json）',
                desc: '起動時に読み込む JSON モデルカタログのパスです。',
            },
            openAiBaseUrl: {
                label: 'OpenAI API URL（openai_base_url）',
                desc: '組み込みの openai プロバイダのベース URL です。',
            },
            ossProvider: {
                label: 'OSS プロバイダ（oss_provider）',
                desc: '--oss セッションで使うローカルプロバイダです。',
            },
            serviceTier: {
                label: 'サービスティア（service_tier）',
                desc: '新しいターンのサービスティアです。default は Standard、fast は Fast モード、ultrafast は Ultrafast モード、flex は Flex ティアです。',
            },
            modelProviders: {
                label: 'モデルプロバイダ定義（model_providers.<id>）',
                desc: 'カスタムモデルプロバイダのエンドポイント、認証、ヘッダー、再試行の設定です。',
            },
            modelProvidersBedrockAwsProfile: {
                label: 'Bedrock の AWS プロファイル（model_providers.amazon-bedrock.aws.profile）',
                desc: '組み込みの amazon-bedrock プロバイダが使う AWS プロファイル名です。',
            },
            modelProvidersBedrockAwsRegion: {
                label: 'Bedrock の AWS リージョン（model_providers.amazon-bedrock.aws.region）',
                desc: '組み込みの amazon-bedrock プロバイダが使う AWS リージョンです。',
            },
            modelProvidersGcpBaseUrl: {
                label: 'Vertex AI のエンドポイント（model_providers.gcp.base_url）',
                desc: '組み込みの gcp プロバイダが使う Google Cloud Vertex AI のエンドポイントです。',
            },
            modelProvidersGcpProjectId: {
                label: 'Vertex AI のプロジェクト（model_providers.gcp.project_id）',
                desc: '組み込みの gcp プロバイダが使う Google Cloud のプロジェクト ID です。',
            },
            modelProvidersGcpLocation: {
                label: 'Vertex AI のロケーション（model_providers.gcp.location）',
                desc: '組み込みの gcp プロバイダが使う Google Cloud のロケーションです。',
            },
            modelProvidersGcpCredentialFile: {
                label: 'Vertex AI の資格情報ファイル（model_providers.gcp.credential_file）',
                desc: '組み込みの gcp プロバイダが使う Application Default Credentials ファイルの絶対パスです。',
            },
            approvalPolicy: {
                label: '承認ポリシー（approval_policy）',
                desc: 'コマンドの実行前に承認を求めるタイミングです。on-request、never、またはプロンプトの種類ごとの granular テーブルです。',
            },
            sandboxMode: {
                label: 'サンドボックス（sandbox_mode）',
                desc: 'コマンドのファイルシステムとネットワークへのアクセス範囲です。read-only、workspace-write、danger-full-access です。',
            },
            webSearch: {
                label: 'Web 検索（web_search）',
                desc: 'Web 検索のモードです。disabled はツールを外し、cached は OpenAI が管理する索引を使い、indexed は索引を通して外部アクセスを制御し、live はライブで取得します。',
            },
            allowLoginShell: {
                label: 'ログインシェルの許可（allow_login_shell）',
                desc: 'シェルのツールにログインシェルの使用を許可します。',
            },
            allowSymlinkedCodexHome: {
                label: 'CODEX_HOME のシンボリックリンクを許可（allow_symlinked_codex_home）',
                desc: 'macOS で、$CODEX_HOME 以下の書き込み可能なサンドボックスルートがシンボリックリンクをたどることを許可します。',
            },
            approvalsReviewer: {
                label: '承認レビュー担当（approvals_reviewer）',
                desc: '対象の承認プロンプトを確認する相手です。user は利用者、auto_review はレビュー用のサブエージェントです。',
            },
            defaultPermissions: {
                label: '既定の権限プロファイル（default_permissions）',
                desc: 'サンドボックス内のツール呼び出しに適用する権限プロファイルです。組み込みの名前か [permissions] で定義した名前です。',
            },
            sandboxNetworkAccess: {
                label: 'ワークスペースのネット接続（sandbox_workspace_write.network_access）',
                desc: 'workspace-write サンドボックス内からの外向きネットワークアクセスを許可します。',
            },
            sandboxExcludeTmpdirEnvVar: {
                label: 'TMPDIR を書き込み対象外にする（sandbox_workspace_write.exclude_tmpdir_env_var）',
                desc: 'workspace-write の書き込み可能なルートから $TMPDIR を除外します。',
            },
            sandboxExcludeSlashTmp: {
                label: '/tmp を書き込み対象外にする（sandbox_workspace_write.exclude_slash_tmp）',
                desc: 'workspace-write の書き込み可能なルートから /tmp を除外します。',
            },
            historyPersistence: {
                label: 'セッション履歴（history.persistence）',
                desc: 'セッションの記録を history.jsonl に保存するかどうかです。save-all は保存し、none は保存を無効にします。',
            },
            autoReviewTimeoutMs: {
                label: '自動レビューのタイムアウト（auto_review.timeout_ms）',
                desc: '準備と再試行を含むレビュー全体の持ち時間（ミリ秒）です。0 は期限なしです。',
            },
            autoReviewConversationHistoryMaxOutputTokens: {
                label: '自動レビューの履歴出力上限（auto_review.conversation_history_max_output_tokens）',
                desc: 'レビューの履歴ツールの応答 1 件あたりの推定トークン数の上限です。',
            },
            autoReviewCircuitBreakAction: {
                label: '自動レビューの中断の扱い（auto_review.circuit_break_action）',
                desc: 'サーキットブレーカーによる中断の形式です。default か、構造化エラーを加える strict です。',
            },
            autoReviewPolicy: {
                label: '自動レビュー方針（auto_review.policy）',
                desc: '自動レビューに渡すローカルの Markdown の方針です。',
            },
            autoReviewExtraPolicy: {
                label: '自動レビュー追加方針（auto_review.extra_policy）',
                desc: '主な方針に加えて渡すローカルの Markdown の方針です。',
            },
            autoReviewExperimentalPolicyTemplate: {
                label: '自動レビューのプロンプトテンプレート（auto_review.experimental_policy_template）',
                desc: '方針のプレースホルダーを含む、レビュー全体の実験的なプロンプトテンプレートです。',
            },
            autoReviewExperimentalConversationHistoryPrompt: {
                label: '自動レビューの履歴プロンプト（auto_review.experimental_conversation_history_prompt）',
                desc: '履歴取得の指示を置き換える実験的なプロンプトです。',
            },
            windowsSandbox: {
                label: 'Windows サンドボックス方式（windows.sandbox）',
                desc: 'Windows ネイティブサンドボックスの実装です。mxc、elevated、unelevated です。',
            },
            windowsAllowMxc: {
                label: 'MXC の許可（windows.allow_mxc）',
                desc: 'Windows で MXC を許可します。明示の選択と自動選択の両方に適用します。',
            },
            sandboxWritableRoots: {
                label: '追加の書き込み可能ルート（sandbox_workspace_write.writable_roots）',
                desc: 'workspace-write で追加する書き込み可能なパスです。',
            },
            permissionsProfiles: {
                label: '権限プロファイル（permissions.<name>）',
                desc: '名前付き権限プロファイルのファイルシステム、ワークスペースルート、ネットワークの規則です。',
            },
            fileOpener: {
                label: 'ファイルを開くアプリ（file_opener）',
                desc: 'Codex の出力にある引用を開く URI スキームです。',
            },
            hideAgentReasoning: {
                label: '推論を隠す（hide_agent_reasoning）',
                desc: 'TUI と codex exec の出力で推論イベントを隠します。',
            },
            showRawAgentReasoning: {
                label: '生の推論を表示（show_raw_agent_reasoning）',
                desc: 'モデルの生の推論内容を表示します。',
            },
            tuiAnimations: {
                label: 'TUI アニメーション（tui.animations）',
                desc: 'ウェルカム画面、シマー、スピナーなどの端末アニメーションです。',
            },
            tuiEffectsEffort: {
                label: '推論レベルのアニメーション（tui.effects.effort）',
                desc: '入力欄とフッターで推論レベルの変更をアニメーション表示します。',
            },
            tuiEffectsProgress: {
                label: '進行状況のアニメーション（tui.effects.progress）',
                desc: '処理中の行頭記号と読み込みスピナーをアニメーション表示します。',
            },
            tuiEffectsShimmer: {
                label: 'シマー効果（tui.effects.shimmer）',
                desc: '状態と読み込みの文字をシマー表示します。',
            },
            tuiEffectsStarfield: {
                label: 'スターフィールドのアニメーション（tui.effects.starfield）',
                desc: '入力欄のスターフィールドをアニメーション表示します。',
            },
            tuiEffectsTitle: {
                label: 'タイトルの点滅（tui.effects.title）',
                desc: '利用者の操作が必要なことを端末タイトルの点滅で示します。',
            },
            tuiEffectsWelcome: {
                label: 'ウェルカムのアニメーション（tui.effects.welcome）',
                desc: 'ウェルカム画面のアートワークをアニメーション表示します。',
            },
            tuiRenderingLists: {
                label: 'リストの描画（tui.rendering.lists）',
                desc: 'Markdown の箇条書きとタスクリストの記号を Unicode 記号で描画します。',
            },
            tuiRenderingMath: {
                label: '数式の描画（tui.rendering.math）',
                desc: '数式を Unicode の表記で描画します。',
            },
            tuiRenderingMermaid: {
                label: 'Mermaid の描画（tui.rendering.mermaid）',
                desc: 'Mermaid のコードブロックを図として描画します。',
            },
            tuiRenderingTables: {
                label: '表の描画（tui.rendering.tables）',
                desc: 'Markdown のコードフェンス内を含むパイプ形式の表を描画します。',
            },
            tuiShowTooltips: {
                label: 'TUI ツールチップ（tui.show_tooltips）',
                desc: 'ウェルカム画面にオンボーディングのツールチップを表示します。',
            },
            tuiNotificationMethod: {
                label: '端末通知の方式（tui.notification_method）',
                desc: '端末通知の送り方です。自動判定、OSC 9、端末のベルです。',
            },
            tuiNotificationCondition: {
                label: '端末通知の条件（tui.notification_condition）',
                desc: '通知のタイミングです。端末が非フォーカスの間だけ、または常にです。',
            },
            tuiAlternateScreen: {
                label: '代替画面（tui.alternate_screen）',
                desc: 'TUI の代替画面バッファの使用です。auto、always、never です。',
            },
            tuiFullscreenTranscript: {
                label: '全画面の会話表示（tui.fullscreen_transcript）',
                desc: 'スクロール、選択、検索を含む全画面の会話表示を Codex が担います。',
            },
            tuiRawOutputMode: {
                label: 'TUI の生出力モード（tui.raw_output_mode）',
                desc: '端末で選択してコピーしやすい生のスクロールバックモードで TUI を起動します。',
            },
            tuiVimModeDefault: {
                label: 'TUI の Vim モード既定（tui.vim_mode_default）',
                desc: '入力欄を Vim のノーマルモードで開始します。',
            },
            tuiAutoRecap: {
                label: '自動要約（tui.auto_recap）',
                desc: '端末が非フォーカスの間に会話の要約を作成します。',
            },
            tuiDisablePasteBurst: {
                label: '大量貼り付け検出の無効化（tui.disable_paste_burst）',
                desc: '短時間の大量入力を貼り付けとして扱う検出を無効にします。',
            },
            tuiShowServerVersionNotice: {
                label: 'サーバーバージョン差の通知（tui.show_server_version_notice）',
                desc: '接続先のアプリサーバーとのバージョン差の通知を表示します。',
            },
            tuiCopyOnSelect: {
                label: '選択時のコピー（tui.copy_on_select）',
                desc: 'マウスのボタンを離したときに選択した文字をコピーします。auto は端末に合わせ、always はすべての選択をコピーし、never はコピーを明示の操作に任せます。',
            },
            tuiCopyOnSelectClearSelection: {
                label: 'コピー後に選択を解除（tui.copy_on_select_clear_selection）',
                desc: '選択時のコピーの完了後に、読み取り専用の会話とフッターの選択を解除します。',
            },
            tuiRightClickPaste: {
                label: '右クリックの貼り付け（tui.right_click_paste）',
                desc: '全画面の TUI での右クリックの貼り付けです。auto は Windows、WSL、Linux で有効、on は macOS も有効、off は端末に任せます。',
            },
            tuiMouseScrollSpeed: {
                label: 'マウススクロールの速度（tui.mouse_scroll_speed）',
                desc: '会話のスクロールでのマウスホイールの速度の倍率です。イベントごとに 1 行が基準です。',
            },
            tuiQuestionEscBack: {
                label: '質問からの Esc での復帰（tui.question_esc_back）',
                desc: '非同期の質問から Esc で入力欄へ戻り、回答の下書きを保持します。',
            },
            tuiStatusLineUseColors: {
                label: 'ステータス行の色（tui.status_line_use_colors）',
                desc: 'ステータス行の項目を使用中の構文テーマの色で表示します。',
            },
            tuiSessionPickerView: {
                label: 'セッション選択の表示（tui.session_picker_view）',
                desc: '再開とフォークのセッション選択の表示形式です。comfortable か dense です。',
            },
            tuiTerminalResizeReflowMaxRows: {
                label: 'リサイズ時の再描画の行数（tui.terminal_resize_reflow_max_rows）',
                desc: '端末のリサイズで会話を再描画するときに残す、最近の描画行数です。0 はすべて残します。',
            },
            tuiPet: {
                label: '端末のペット（tui.pet）',
                desc: '端末のペット選択で最初に選ばれるペットの ID です。',
            },
            tuiPetAnchor: {
                label: '端末のペットの位置（tui.pet_anchor）',
                desc: 'ペットの縦の基準位置です。composer は入力欄に合わせ、screen-bottom は端末の最下部です。',
            },
            noticeHideFullAccessWarning: {
                label: 'フルアクセス警告を非表示（notice.hide_full_access_warning）',
                desc: 'フルアクセスの警告プロンプトを非表示にします。',
            },
            noticeHideRateLimitModelNudge: {
                label: 'レート制限の案内を非表示（notice.hide_rate_limit_model_nudge）',
                desc: 'レート制限でモデルの切り替えを促す案内を非表示にします。',
            },
            noticeHideWorldWritableWarning: {
                label: '全書き込み可の警告を非表示（notice.hide_world_writable_warning）',
                desc: 'Windows の誰でも書き込めるディレクトリの警告を非表示にします。',
            },
            noticeHideGpt51MigrationPrompt: {
                label: 'GPT-5.1 移行案内を非表示（notice.hide_gpt5_1_migration_prompt）',
                desc: 'GPT-5.1 への移行案内を非表示にします。',
            },
            noticeModelMigrations: {
                label: 'モデル移行の確認状態（notice.model_migrations）',
                desc: '確認済みのモデル移行を旧モデルと新モデルの組で保持します。',
            },
            notify: {
                label: '外部通知コマンド（notify）',
                desc: '通知で起動するプログラムと引数です。Codex から JSON のペイロードを受け取ります。',
            },
            tuiNotifications: {
                label: 'TUI の通知対象（tui.notifications）',
                desc: 'TUI のデスクトップ通知です。有効、無効、またはイベントの種類の一覧です。',
            },
            tuiStatusLine: {
                label: 'TUI のステータス行（tui.status_line）',
                desc: 'フッターのステータス行に表示する項目 ID の並びです。',
            },
            tuiTerminalTitle: {
                label: '端末タイトル（tui.terminal_title）',
                desc: '端末のウィンドウまたはタブのタイトルに表示する項目 ID の並びです。',
            },
            tuiPresets: {
                label: 'プリセット（tui.presets.<digit>）',
                desc: '/presets のスロット 0 から 9 に保存するプロンプトかスラッシュコマンドです。',
            },
            tuiResumeCwd: {
                label: '再開時の作業ディレクトリ（tui.resume_cwd）',
                desc: '再開またはフォークしたセッションの作業ディレクトリです。current は現在のディレクトリ、session はセッションに保存されたディレクトリです。',
            },
            tuiTheme: {
                label: 'TUI テーマ（tui.theme）',
                desc: '構文強調のテーマです。組み込みの名前か $CODEX_HOME/themes のカスタムテーマです。',
            },
            projectDocMaxBytes: {
                label: 'プロジェクト指示の読み込み上限（project_doc_max_bytes）',
                desc: 'プロジェクト指示の合計の最大バイト数です。0 は読み込みが無効です。',
            },
            historyMaxBytes: {
                label: '履歴ファイルの上限（history.max_bytes）',
                desc: '履歴ファイルの最大バイト数です。古い項目から削除します。',
            },
            checkForUpdateOnStartup: {
                label: '起動時の更新確認（check_for_update_on_startup）',
                desc: '起動時に Codex の更新を確認します。',
            },
            modelInstructionsFile: {
                label: '基本指示ファイル（model_instructions_file）',
                desc: '組み込みの基本指示を置き換えるファイルのパスです。',
            },
            includePermissionsInstructions: {
                label: '権限の指示（include_permissions_instructions）',
                desc: '権限の指示を開発者ブロックとして挿入します。',
            },
            includeAppsInstructions: {
                label: 'アプリの指示（include_apps_instructions）',
                desc: 'アプリの指示を開発者ブロックとして挿入します。',
            },
            includeCollaborationModeInstructions: {
                label: 'コラボレーションモードの指示（include_collaboration_mode_instructions）',
                desc: 'コラボレーションモードの指示を開発者ブロックとして挿入します。',
            },
            includeEnvironmentContext: {
                label: '環境コンテキスト（include_environment_context）',
                desc: '環境コンテキストをユーザーブロックとして挿入します。',
            },
            includeEnvironmentContextTime: {
                label: '環境コンテキストの日時（include_environment_context_time）',
                desc: '環境コンテキストに現在の日付とタイムゾーンを含めます。',
            },
            developerInstructions: {
                label: '追加の開発者指示（developer_instructions）',
                desc: 'セッションに挿入する追加の開発者指示です。',
            },
            compactPrompt: {
                label: '圧縮プロンプト（compact_prompt）',
                desc: '履歴圧縮のプロンプトを置き換える文字列です。',
            },
            experimentalCompactPromptFile: {
                label: '圧縮プロンプトファイル（experimental_compact_prompt_file）',
                desc: '圧縮プロンプトを実験的に置き換えるファイルのパスです。',
            },
            logDir: {
                label: 'ログの保存先（log_dir）',
                desc: 'ログファイルとプレーンテキストの TUI ログ codex-tui.log の保存先ディレクトリです。',
            },
            sqliteHome: {
                label: 'SQLite 状態の保存先（sqlite_home）',
                desc: 'SQLite の状態データベースの保存先ディレクトリです。',
            },
            backgroundTerminalMaxTimeout: {
                label: 'バックグラウンド端末の待機上限（background_terminal_max_timeout）',
                desc: '空の write_stdin のポーリングで待つ最大時間（ミリ秒）です。',
            },
            threadUnloadDelaySecs: {
                label: 'スレッドのアンロード待機（thread_unload_delay_secs）',
                desc: 'アプリサーバーが、購読者のいない非アクティブなスレッドをアンロードするまで待つ秒数です。0 はすぐにアンロードします。',
            },
            analyticsEnabled: {
                label: 'アナリティクス（analytics.enabled）',
                desc: 'このマシンまたはプロファイルのアナリティクスです。組み込みの Statsig メトリクスのエクスポータを含みます。',
            },
            feedbackEnabled: {
                label: 'フィードバック（feedback.enabled）',
                desc: '/feedback によるフィードバックの送信です。',
            },
            cliAuthCredentialsStore: {
                label: 'ログイン資格情報の保存先（cli_auth_credentials_store）',
                desc: 'CLI のログイン資格情報の保存先です。file、keyring、auto、または実行中のプロセスのメモリである ephemeral です。',
            },
            chatgptBaseUrl: {
                label: 'ChatGPT ログイン URL（chatgpt_base_url）',
                desc: 'ChatGPT のログインフローのベース URL です。',
            },
            forcedChatgptWorkspaceId: {
                label: '固定の ChatGPT ワークスペース（forced_chatgpt_workspace_id）',
                desc: 'ChatGPT のログインを限定するワークスペース ID です。1 つの ID か配列です。',
            },
            forcedLoginMethod: {
                label: '固定のログイン方式（forced_login_method）',
                desc: 'Codex を限定する認証方式です。chatgpt か api です。',
            },
            mcpOauthCredentialsStore: {
                label: 'MCP OAuth 資格情報の保存先（mcp_oauth_credentials_store）',
                desc: 'MCP OAuth 資格情報の保存先です。auto、file、keyring です。',
            },
            mcpOauthCallbackPort: {
                label: 'MCP OAuth コールバックポート（mcp_oauth_callback_port）',
                desc: 'MCP OAuth ログインのローカルコールバックサーバーの固定ポートです。',
            },
            mcpOauthCallbackUrl: {
                label: 'MCP OAuth コールバック URL（mcp_oauth_callback_url）',
                desc: 'MCP OAuth ログインのコールバックのベース URL です。devbox のイングレス URL などです。',
            },
            mcpOptionalStartupGraceMs: {
                label: '任意 MCP の起動待ち時間（mcp_optional_startup_grace_ms）',
                desc: '初期ツール一覧の作成で任意の MCP サーバーを待つ共通の時間（ミリ秒）です。0 は各サーバーの startup_timeout_sec まで待ちます。',
            },
            suppressUnstableFeaturesWarning: {
                label: '不安定機能の警告を非表示（suppress_unstable_features_warning）',
                desc: '開発中の機能フラグについての警告を非表示にします。',
            },
            shellEnvironmentInherit: {
                label: 'シェル環境の継承範囲（shell_environment_policy.inherit）',
                desc: 'サブプロセスに渡す環境変数の基準です。all、core、none です。',
            },
            shellEnvironmentIgnoreDefaultExcludes: {
                label: '機密変数の自動除外を無視（shell_environment_policy.ignore_default_excludes）',
                desc: 'KEY、SECRET、TOKEN を含む変数を他のフィルタの前に残します。',
            },
            shellEnvironmentExperimentalUseProfile: {
                label: 'シェルプロファイルの使用（shell_environment_policy.experimental_use_profile）',
                desc: 'サブプロセスの起動にユーザーのシェルプロファイルを使います。',
            },
            otelEnvironment: {
                label: 'OpenTelemetry の環境名（otel.environment）',
                desc: '送出するテレメトリイベントに付ける環境のタグです。',
            },
            otelLogUserPrompt: {
                label: '生プロンプトの送出（otel.log_user_prompt）',
                desc: 'ユーザーの生のプロンプトを OpenTelemetry のログで送出します。',
            },
            otelLogAgentResponses: {
                label: '最終応答の送出（otel.log_agent_responses）',
                desc: 'メインエージェントと起動したサブエージェントの最終応答の本文を OTLP ログエクスポータへ送出します。',
            },
            otelLogGuardianAssessments: {
                label: '自動承認レビューの送出（otel.log_guardian_assessments）',
                desc: '完了した自動承認レビューを OTLP ログエクスポータへ送出します。',
            },
            otelLogSseDeltas: {
                label: 'SSE 差分のログ（otel.log_sse_deltas）',
                desc: '種類が .delta で終わる成功した SSE イベントをログに記録します。',
            },
            otelToolResultMaxBytes: {
                label: 'ログのツール結果の上限（otel.tool_result.max_bytes）',
                desc: 'ログに含める各ツール結果の最大バイト数（UTF-8）です。',
            },
            otelExporter: {
                label: 'ログエクスポータ（otel.exporter）',
                desc: 'ログイベントの送信先です。none、または OTLP/HTTP か OTLP/gRPC のエンドポイントです。',
            },
            otelTraceExporter: {
                label: 'トレースエクスポータ（otel.trace_exporter）',
                desc: 'トレースの送信先です。none、または OTLP/HTTP か OTLP/gRPC のエンドポイントです。',
            },
            otelMetricsExporter: {
                label: 'メトリクスエクスポータ（otel.metrics_exporter）',
                desc: 'メトリクスの送信先です。none、statsig、または OTLP/HTTP か OTLP/gRPC のエンドポイントです。statsig は analytics.enabled に従います。',
            },
            otelSpanAttributes: {
                label: 'スパン属性（otel.span_attributes）',
                desc: 'エクスポートするすべてのトレーススパンに追加する文字列の属性です。',
            },
            otelTracestate: {
                label: 'tracestate のフィールド（otel.tracestate）',
                desc: 'トレースコンテキストの伝播で W3C tracestate のメンバーに設定するフィールドです。',
            },
            projectDocFallbackFilenames: {
                label: '指示ファイルの代替名（project_doc_fallback_filenames）',
                desc: 'AGENTS.md の代わりに順に探すファイル名です。',
            },
            projectRootMarkers: {
                label: 'プロジェクトルートの目印（project_root_markers）',
                desc: '親ディレクトリからプロジェクトルートを探すのに使うファイル名です。',
            },
            shellEnvironmentFilters: {
                label: '環境変数フィルタ（shell_environment_policy.filters）',
                desc: '大文字小文字を区別しない変数名のパターンと、include（許可リスト）か exclude の対応です。',
            },
            shellEnvironmentSet: {
                label: '環境変数の上書き（shell_environment_policy.set）',
                desc: 'サブプロセスに渡す環境変数の明示の値です。',
            },
            projects: {
                label: 'プロジェクトの信頼設定（projects）',
                desc: 'プロジェクトのパスごとの信頼レベルです。trusted か untrusted です。',
            },
            agentsMaxConcurrentThreadsPerSession: {
                label: 'エージェントの同時数（agents.max_concurrent_threads_per_session）',
                desc: '主スレッドを除く、同時に開くエージェントスレッド数の上限です。',
            },
            agentsMaxDepth: {
                label: 'エージェントの入れ子の深さ（agents.max_depth）',
                desc: 'V1 のエージェントスレッドの入れ子の最大の深さです。',
            },
            agentsInterruptMessage: {
                label: '中断メッセージの記録（agents.interrupt_message）',
                desc: '中断したエージェントターンについて、モデルから見えるメッセージを記録します。',
            },
            agentsEnabled: {
                label: 'マルチエージェントの有効化（agents.enabled）',
                desc: 'マルチエージェントのツールを有効にします。',
            },
            agentsDefaultSubagentModel: {
                label: 'サブエージェントの既定モデル（agents.default_subagent_model）',
                desc: '起動するサブエージェントの既定のモデルです。',
            },
            agentsDefaultSubagentReasoningEffort: {
                label: 'サブエージェントの既定の推論レベル（agents.default_subagent_reasoning_effort）',
                desc: '起動するサブエージェントの既定の推論レベルです。',
            },
            featuresGoals: {
                label: 'ゴール機能（features.goals）',
                desc: '永続化するゴールと自動継続を有効にします。',
            },
            goalsMaxGoalTokenBudget: {
                label: 'ゴールのトークン予算上限（goals.max_goal_token_budget）',
                desc: '新しいゴールの既定のトークン予算と、ゴールの予算の上限です。',
            },
            featuresHooks: {
                label: 'ライフサイクルフック（features.hooks）',
                desc: 'hooks.json かインラインの [hooks] からライフサイクルフックを読み込みます。',
            },
            featuresFastMode: {
                label: 'Fast モード（features.fast_mode）',
                desc: '使用中のモデルが提示する Fast モードの操作を有効にします。',
            },
            featuresUltrafastMode: {
                label: 'Ultrafast モード（features.ultrafast_mode）',
                desc: 'Ultrafast モードの操作を有効にします。',
            },
            featuresMemories: {
                label: 'メモリ（features.memories）',
                desc: 'チャットをまたいで有用なコンテキストを引き継ぐメモリを有効にします。',
            },
            memoriesGenerate: {
                label: 'メモリの生成（memories.generate_memories）',
                desc: '新しく作成したスレッドをメモリ生成の入力として保存します。',
            },
            memoriesUse: {
                label: 'メモリの利用（memories.use_memories）',
                desc: '既存のメモリを今後のセッションに挿入します。',
            },
            memoriesVersion: {
                label: 'メモリの保存先（memories.version）',
                desc: 'ローカルメモリの保存先です。v1 か v2 です。',
            },
            memoriesDualWrite: {
                label: 'メモリの二重書き込み（memories.dual_write）',
                desc: 'v1 を読みながら、両方の保存先へ生成します。',
            },
            memoriesDisableOnExternalContext: {
                label: '外部コンテキストのメモリ除外（memories.disable_on_external_context）',
                desc: 'MCP、Web 検索、ツール検索などの外部コンテキストを使ったスレッドをメモリ生成から外します。',
            },
            memoriesDedicatedTools: {
                label: '専用のメモリツール（memories.dedicated_tools）',
                desc: '専用のメモリツールを拡張ツールとして公開します。',
            },
            memoriesMinRateLimitRemainingPercent: {
                label: 'メモリ生成の残量下限（memories.min_rate_limit_remaining_percent）',
                desc: 'メモリ生成を始めるのに必要な、Codex のレート制限の残りの最低割合です。',
            },
            memoriesExtractModel: {
                label: 'メモリ抽出モデル（memories.extract_model）',
                desc: 'スレッドごとのメモリ抽出に使うモデルです。',
            },
            memoriesConsolidationModel: {
                label: 'メモリ統合モデル（memories.consolidation_model）',
                desc: '全体のメモリ統合に使うモデルです。',
            },
            memoriesConsolidationServiceTier: {
                label: 'メモリ統合のサービスティア（memories.consolidation_service_tier）',
                desc: '全体のメモリ統合に使うサービスティアです。default は Standard です。',
            },
            featuresMultiAgent: {
                label: 'マルチエージェント（features.multi_agent）',
                desc: 'spawn_agent や wait_agent などのサブエージェント連携ツールを有効にします。',
            },
            featuresRemotePlugin: {
                label: 'リモートプラグイン（features.remote_plugin）',
                desc: 'リモートプラグインのカタログを有効にします。',
            },
            featuresPlugins: {
                label: 'プラグイン（features.plugins）',
                desc: 'プラグインを有効にします。',
            },
            featuresShellSnapshot: {
                label: 'シェル環境のスナップショット（features.shell_snapshot）',
                desc: 'シェル環境のスナップショットを取り、繰り返すコマンドを高速にします。',
            },
            featuresShellTool: {
                label: 'シェルツール（features.shell_tool）',
                desc: 'コマンド実行のツールを有効にします。',
            },
            featuresApps: {
                label: 'アプリコネクタ（features.apps）',
                desc: 'アプリとコネクタの連携を有効にします。',
            },
            featuresNetworkProxy: {
                label: 'サンドボックスのネットワークプロキシ（features.network_proxy）',
                desc: 'サンドボックス内のコマンドのネットワークプロキシです。有効、無効、または domains などの方針を持つテーブルです。',
            },
            featuresRespectSystemProxy: {
                label: 'システムプロキシ（features.respect_system_proxy）',
                desc: 'Codex の要求に macOS か Windows のシステムプロキシの設定を使います。',
            },
            featuresSystemProxyFallback: {
                label: 'システムプロキシでの再試行（features.system_proxy_fallback）',
                desc: '接続に失敗したサインインとクラウド設定の要求をシステムプロキシ経由で再試行します。',
            },
            featuresEnableRequestCompression: {
                label: 'リクエスト圧縮（features.enable_request_compression）',
                desc: 'ストリーミングのリクエスト本文を zstd で圧縮します。',
            },
            featuresSkillMcpDependencyInstall: {
                label: 'スキルの MCP 依存関係の導入（features.skill_mcp_dependency_install）',
                desc: 'スキルに足りない MCP 依存関係の確認とインストールを行います。',
            },
            featuresPreventIdleSleep: {
                label: '実行中のスリープ防止（features.prevent_idle_sleep）',
                desc: 'ターンの実行中にマシンのスリープを防ぎます。',
            },
            featuresPreferMxc: {
                label: 'MXC の優先（features.prefer_mxc）',
                desc: 'Windows のローカル実行で MXC を優先します。代わりの方式は windows.sandbox です。',
            },
            featuresViewImage: {
                label: '画像表示ツール（features.view_image）',
                desc: 'ローカル画像を開く組み込みの view_image ツールを有効にします。',
            },
            featuresRequestPermissionsTool: {
                label: '権限要求ツール（features.request_permissions_tool）',
                desc: '組み込みの request_permissions ツールを公開します。',
            },
            featuresGcpSetupWizard: {
                label: 'Vertex AI のセットアップ（features.gcp_setup_wizard）',
                desc: 'TUI のサインインで Google Cloud Vertex AI のセットアップを案内します。',
            },
            featuresApiKeyModelDiscovery: {
                label: 'API キーのモデル検出（features.api_key_model_discovery）',
                desc: 'OpenAI の API キー認証でモデルカタログを検出します。',
            },
            featuresLoginShellPackagePath: {
                label: 'ログインシェルの同梱ツール（features.login_shell_package_path）',
                desc: 'ログインシェルの起動で PATH がリセットされた後も、ripgrep などの同梱ツールを PATH に残します。',
            },
            featuresAnalyticsPlanHistory: {
                label: '利用枠の履歴（features.analytics_plan_history）',
                desc: '個人アカウントの 5 時間と週間の利用枠の履歴を /analytics に表示します。',
            },
            featuresDaemonAutoStart: {
                label: 'デーモンの自動起動（features.daemon_auto_start）',
                desc: 'CLI のバックグラウンドサーバーを自動で起動します。',
            },
            featuresCliDaybreak: {
                label: 'CLI の Daybreak（features.cli_daybreak）',
                desc: 'CLI クライアントで Daybreak の操作とアクセスプログラムの自動選択を有効にします。',
            },
            daybreak: {
                label: 'Daybreak（daybreak）',
                desc: '新しいスレッドと非対話のターンでの Daybreak の既定の選択です。',
            },
            featuresToolRegistryErrorOnToolCollisions: {
                label: 'ツール名の衝突で失敗（features.tool_registry.error_on_tool_collisions）',
                desc: '複数のツールが同じ実効名を持つときにターンを失敗させます。',
            },
            featuresToolRegistryTurnMetadataIncludesToolInfo: {
                label: 'ターンのメタデータのツール情報（features.tool_registry.turn_metadata_includes_tool_info）',
                desc: 'ターンごとの要求のメタデータに正式なツール情報を含めます。',
            },
            toolsUpdatePlanEnabled: {
                label: '計画更新ツール（tools.update_plan.enabled）',
                desc: 'update_plan ツールを登録します。',
            },
            toolsExperimentalRequestUserInputEnabled: {
                label: 'ユーザー入力要求ツール（tools.experimental_request_user_input.enabled）',
                desc: '実験的な request_user_input ツールを登録します。',
            },
            cloudSkillsEnabled: {
                label: 'クラウドスキル（cloud.skills.enabled）',
                desc: 'ホストが提供するクラウドスキルを許可します。',
            },
            orchestratorMcpEnabled: {
                label: 'オーケストレーターの MCP ツール（orchestrator.mcp.enabled）',
                desc: 'オーケストレーターが持つ MCP ツールをモデルに公開します。',
            },
            skillsMaxContextTokens: {
                label: 'スキル一覧のトークン予算（skills.max_context_tokens）',
                desc: '利用可能なスキル一覧のトークン予算です。上限は 10000 トークンです。',
            },
            skillsBundledEnabled: {
                label: '同梱スキルの読み込み（skills.bundled.enabled）',
                desc: 'Codex に同梱のシステムスキルを読み込みます。',
            },
            skillsIncludeInstructions: {
                label: 'スキルの自動指示（skills.include_instructions）',
                desc: 'スキルの自動指示をモデルのコンテキストに含めます。',
            },
            browserUseAllowHistoryAccess: {
                label: 'ブラウザ履歴へのアクセス（browser_use.allow_history_access）',
                desc: 'Browser Use にブラウザ履歴へのアクセスを許可します。',
            },
            computerUseDefaultAppAccess: {
                label: 'Computer Use の既定アプリアクセス（computer_use.default_app_access）',
                desc: 'ネイティブアプリに対する Computer Use の既定のアクセスです。allow か deny です。',
            },
            memoriesMaxRawMemoriesForConsolidation: {
                label: 'メモリ統合の入力上限（memories.max_raw_memories_for_consolidation）',
                desc: '全体の統合のために保持する最近の生メモリの最大件数です。',
            },
            memoriesMaxRolloutAgeDays: {
                label: 'メモリ対象スレッドの最大日数（memories.max_rollout_age_days）',
                desc: 'メモリ生成の対象とするスレッドの最大経過日数です。',
            },
            memoriesMaxRolloutsPerStartup: {
                label: '起動あたりの処理数（memories.max_rollouts_per_startup）',
                desc: '起動ごとの処理で扱うロールアウト候補の最大件数です。',
            },
            memoriesMaxUnusedDays: {
                label: 'メモリ未使用の最大日数（memories.max_unused_days）',
                desc: 'メモリが統合の対象であり続ける、最後の使用からの最大日数です。',
            },
            memoriesMinRolloutIdleHours: {
                label: 'メモリ生成の待機時間（memories.min_rollout_idle_hours）',
                desc: 'スレッドをメモリ生成の対象にするまでの最小アイドル時間です。',
            },
            appsDefaultEnabled: {
                label: 'アプリの既定の有効状態（apps._default.enabled）',
                desc: 'すべてのアプリの既定の有効状態です。',
            },
            appsDefaultDestructiveEnabled: {
                label: 'アプリの破壊的ツールの既定（apps._default.destructive_enabled）',
                desc: 'destructive_hint = true のアプリツールの既定の許可または拒否です。',
            },
            appsDefaultOpenWorldEnabled: {
                label: 'アプリの外部接続ツールの既定（apps._default.open_world_enabled）',
                desc: 'open_world_hint = true のアプリツールの既定の許可または拒否です。',
            },
            appsDefaultDefaultToolsApprovalMode: {
                label: 'アプリツールの既定の承認モード（apps._default.default_tools_approval_mode）',
                desc: 'アプリツールの既定の承認動作です。auto、prompt、writes、approve です。',
            },
            appsDefaultApprovalsReviewer: {
                label: 'アプリの既定の承認レビュー担当（apps._default.approvals_reviewer）',
                desc: 'アプリツールの承認プロンプトの既定のレビュー担当です。',
            },
            agentsDefinitions: {
                label: 'エージェント定義（agents.<name>）',
                desc: 'カスタムエージェントの役割です。それぞれ説明と設定ファイルを持ちます。',
            },
            skillsConfig: {
                label: 'スキルの個別設定（skills.config）',
                desc: '名前か SKILL.md のパスでスキルを有効または無効にする規則です。',
            },
            hooks: {
                label: 'ライフサイクルフック（hooks）',
                desc: 'ツールの実行前後などのイベントで動くコマンドと MCP ツールのフックです。',
            },
            mcpServers: {
                label: 'MCP サーバー定義（mcp_servers.<id>）',
                desc: 'MCP サーバーごとの接続、認証、タイムアウト、ツールの制御です。',
            },
            mcpEnterpriseManagedAuth: {
                label: 'エンタープライズの MCP 認可（mcp_enterprise_managed_auth）',
                desc: 'エンタープライズ認可を使う MCP サーバーとプラグインが共有する、信頼された ID プロバイダです。',
            },
            marketplaces: {
                label: 'プラグインマーケットプレイス（marketplaces.<name>）',
                desc: '設定したプラグインマーケットプレイスの取得元、ref、スパースチェックアウトのパスです。',
            },
            pluginsDefaultEnabled: {
                label: 'プラグインの既定の有効状態（plugins._default.enabled）',
                desc: 'インストール済みプラグインの既定の有効状態です。',
            },
            pluginsEnabled: {
                label: 'プラグインの有効状態（plugins.<plugin>.enabled）',
                desc: 'ローカルマーケットプレイスのプラグインごとの有効状態です。キーは「プラグイン名@マーケットプレイス名」です。',
            },
            pluginsMcpServers: {
                label: 'プラグイン同梱の MCP（plugins.<plugin>.mcp_servers）',
                desc: 'プラグインが同梱する MCP サーバーの有効状態、承認モード、ツールの一覧です。',
            },
            pluginsApps: {
                label: 'プラグインのアプリ設定（plugins.<plugin>.apps）',
                desc: 'プラグインのコネクタ全体のアプリ設定です。キーはコネクタ ID です。',
            },
            apps: {
                label: 'アプリの個別設定（apps.<id>）',
                desc: 'アプリごとの有効状態、破壊的ツールと外部接続ツール、承認、個別のツールの設定です。',
            },
            toolSuggest: {
                label: 'ツールの提案（tool_suggest）',
                desc: 'インストールの提案に使うコネクタとプラグインの許可と無効の一覧です。',
            },
            toolsWebSearch: {
                label: 'Web 検索ツール（tools.web_search）',
                desc: 'Web 検索ツールの検索コンテキストサイズ、許可ドメイン、おおよその位置情報です。',
            },
            featuresCodeMode: {
                label: 'コードモード（features.code_mode）',
                desc: 'コードモードの設定です。有効状態とツールの名前空間です。',
            },
            featuresRolloutBudget: {
                label: 'ロールアウト予算（features.rollout_budget）',
                desc: 'ロールアウト予算の追跡です。有効状態、トークン上限、リマインダー、トークンの重みです。',
            },
            browserUseDefaultOriginPolicy: {
                label: 'ブラウザの既定オリジン制限（browser_use.default_origin_policy）',
                desc: 'アクセス、アップロード、ダウンロード、CDP フルアクセスの既定の許可または拒否です。',
            },
            browserUseOrigins: {
                label: 'ブラウザのオリジン別制限（browser_use.origins.<origin>）',
                desc: 'オリジンごとのアクセス、アップロード、ダウンロード、CDP フルアクセスの許可または拒否です。',
            },
            computerUseMacosBundleIds: {
                label: 'Computer Use の macOS アプリ（computer_use.macos.bundle_ids）',
                desc: 'macOS のバンドル ID ごとの Computer Use のアクセスです。allow か deny です。',
            },
            computerUseWindowsAllowedAppIds: {
                label: 'Computer Use の許可アプリ（computer_use.windows.always_allowed_app_ids）',
                desc: 'Computer Use が確認なしで開く Windows アプリの ID です。',
            },
            computerUseWindowsAumids: {
                label: 'Computer Use の Windows パッケージアプリ（computer_use.windows.aumids）',
                desc: 'パッケージ化された Windows アプリの AUMID ごとの Computer Use のアクセスです。allow か deny です。',
            },
            computerUseWindowsExes: {
                label: 'Computer Use の Windows 実行ファイル（computer_use.windows.exes）',
                desc: '発行元、製品名、任意の実行ファイル名で指定する Windows 実行ファイルの Computer Use のアクセス規則です。',
            },
            desktopCustomFileHandlers: {
                label: 'デスクトップの独自ハンドラ（desktop.custom_file_handlers）',
                desc: 'ChatGPT デスクトップアプリの Open in の独自の開き先です。',
            },
        },
    },
    pluginManager: {
        title: 'Codex プラグイン管理',
        description: 'Codex のプラグインを一覧・追加・削除し、マーケットプレイスを管理します。',
    },
    nav: {
        group: 'Codex',
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
