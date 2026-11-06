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
            '~/.grok 配下の履歴・メモリ・ログ・診断データ・キャッシュ・旧バージョンの実行ファイルと、OS の一時フォルダに残った Grok の一時ファイルを削除します。ディスク容量の回収に加え、動作速度の改善にも役立ちます。',
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
        memoryPathUnknown: 'パスを特定できないメモリ',
        confirmSharedTitle: '次のパスは同じメモリを共有しているので、一緒に削除します。',
        confirmRelatedTitle:
            '下位フォルダにも許可のファイルがあります。上位のパスの許可が無くなると、再び効く可能性があります。一緒に削除するものを選択してください。',
        confirmWarning: {
            sessions: '選択したパスのセッションと、そのパスのツールの許可を削除します。',
            projectRecords:
                '次回そのフォルダで信頼の確認が再び表示されることがあります。確認が済むまで、そのフォルダでは自分のフックも動きません。',
            projectGrants: '次回、ツールの許可の確認が再び表示されることがあります。',
            projectMemory:
                'メモリは元に戻せません。同じリポジトリのクローンや worktree と共有している場合があります。同じ名前の旧メモリも一緒に削除します。',
        },
        dir: {
            sessions: 'sessions',
            projectRecords: 'プロジェクト記録',
            projectGrants: 'プロジェクト別の許可',
            projectMemory: 'プロジェクトメモリ',
            sandboxEvents: 'sessions/sandbox-events.jsonl',
            logs: 'logs',
            debug: 'debug',
            leaderLog: 'leader.log',
            leaderLogRotated: 'leader.log.1',
            memtrace: 'memtrace',
            crash: 'crash',
            traceExports: 'trace-exports',
            marketplaceCache: 'marketplace-cache',
            docs: 'docs',
            memory: 'memory',
            memoryV2: 'memory-v2',
            plans: 'plans',
            binOldVersions: 'bin（旧バージョン）',
            tempGoalScratch: '一時フォルダ: grok-goal-*',
            tempSnapshotIndex: '一時フォルダ: grok-snapshot-index-*',
            tempVideoFrames: '一時フォルダ: grok-video-*',
            tempEditorFiles: '一時フォルダ: grok-prompt-* / grok-transcript-*',
        },
        desc: {
            sessions: '過去セッションの記録（会話ログ・プラン）。一緒に消えるもの: 同じパスのツールの許可。',
            projectRecords: 'trusted_folders.toml に記録された、フォルダごとの信頼の決定。',
            projectGrants: 'ワークスペースのパスごとに保存したツールの許可。',
            projectMemory: 'ワークスペースごとのメモリ。一緒に消えるもの: 同じ名前の旧メモリ。',
            sandboxEvents: 'サンドボックスのイベントログ。',
            logs: '統合ログ・MCP サーバーの標準エラー出力などの診断ログ。',
            debug: 'デバッグログ（GROK_DEBUG_LOG 指定時に出力）。',
            leaderLog: 'リーダープロセスのログ。',
            leaderLogRotated: 'サイズ上限で切り替えられた、リーダープロセスの以前のログ。',
            memtrace: 'プロセスのメモリ使用量の記録（診断用）。',
            crash: '異常終了時のクラッシュレポート。',
            traceExports: 'grok trace export で書き出したトレースのバンドル。',
            marketplaceCache: 'プラグインマーケットプレイスの Git キャッシュ。',
            docs: '内蔵ユーザーガイドのキャッシュ。',
            memory: 'クロスセッションメモリのデータ。',
            memoryV2: 'メモリ v2 のデータ（トピック・観察）。',
            plans: '旧バージョンが作成したプランファイル。',
            binOldVersions: '更新で残った旧バージョンの実行ファイルと、更新時に退避された実行ファイル（*.old）。',
            tempGoalScratch: 'ゴールモードの検証用作業フォルダ（OS の一時フォルダ直下）。',
            tempSnapshotIndex:
                'ワークツリーのスナップショット作成に使う一時的な Git インデックス（OS の一時フォルダ直下）。',
            tempVideoFrames: '動画の添付時にフレームを抽出する一時フォルダ（OS の一時フォルダ直下）。',
            tempEditorFiles:
                '外部エディタでのプロンプト編集やトランスクリプト表示に使う一時ファイル（OS の一時フォルダ直下）。',
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
        deleteNestedNotice: 'スキルのフォルダーを削除すると、その中のスキルも一緒に削除されます: {{names}}',
        deleteSuccess: '{{count}} 件を削除しました',
        deletePartial: '使用中のため一部を削除できませんでした',
        deleteError: '選択した項目の削除に失敗しました',
        noEntries: '対象のデータはありません',
        unavailable: 'この環境のファイルに届きません。',
        downloadSuccess: 'アーカイブを保存しました',
        downloadError: 'アーカイブの作成に失敗しました',
        uploadSuccess: '{{count}} 件を展開しました',
        uploadError: 'アーカイブの展開に失敗しました',
        invalidArchive: 'このアーカイブは取り込めません。壊れているか、取り込む対象が含まれていません。',
        overwriteConfirmTitle: '同名の項目を上書きしますか？',
        overwriteConfirmBody:
            '次の {{count}} 件は既に存在します。ディレクトリごと削除して置き換えます: {{names}}。続行しますか？',
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
                'no-entry-file': '読み込まれません（定義ファイルがありません）',
                'link-folder': 'フォルダーへのリンク',
                'link-loop': '読み取りません（一覧済みのフォルダーです）',
                'refused-name': '管理できません（安全でない名前です）',
            },
            statusHint: {
                'dangling-link':
                    'リンク先のパスが存在しないため、CLI に読み込まれません。削除するとリンクだけを外します。',
                'no-entry-file': 'このフォルダーには定義ファイルがないため、CLI に読み込まれません。',
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
    profile: {
        tab: {
            settings: '設定',
            hooks: 'フック',
            statusLine: 'ステータスライン',
            externalCommands: '外部コマンド',
            permissions: '権限',
            instructions: '指示ファイル',
            rules: 'ルール',
            workflows: 'ワークフロー',
            commands: 'コマンド',
        },
        statusLine: {
            title: 'ステータスライン（[ui.status_line]）',
        },
        hooks: {
            filesTitle: 'フックファイル',
        },
        externalCommands: {
            commandsTitle: 'コマンド',
            authCommandLabel: '認証コマンド（auth.auth_provider_command）',
            authAliasNotice: 'grok_com_config の auth_provider_command が使われています。',
            authProviderTitle: '認証プロバイダー（auth_provider）',
            lspTitle: 'lsp.json',
        },
        permissions: {
            listsTitle: 'permission.allow / ask / deny',
            allow: '許可（allow）',
            ask: '確認（ask）',
            deny: '拒否（deny）',
            rulesTitle: 'permission.rules',
            listsBlocked: 'rules だけが書かれています。',
            rulesBlocked: 'allow / ask / deny だけが書かれています。',
            bothForms: 'allow / ask / deny と rules の両方が書かれています。',
        },
        workflows: {
            notGuaranteed: '読み込みを保証しない',
        },
    },
    settings: {
        title: 'Grok 設定',
        description:
            'Grok の設定、フック、権限、指示ファイルなどを編集します。主な設定ファイルは ~/.grok/config.toml です。',
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
            memory: 'メモリ',
            cli: '表示・CLI',
            features: '機能',
            extensions: '拡張・互換',
            telemetry: 'テレメトリ・診断',
        },
        field: {
            modelsDefault: {
                label: '既定モデル（models.default）',
                desc: '新規セッションで使うモデルです。',
            },
            modelsWebSearch: {
                label: 'Web 検索モデル（models.web_search）',
                desc: 'web_search ツールが使うモデルです。',
            },
            modelsDefaultReasoningEffort: {
                label: '既定の推論の労力（models.default_reasoning_effort）',
                desc: '既定モデルの推論の労力です。',
            },
            modelsSessionSummary: {
                label: 'セッション要約モデル（models.session_summary）',
                desc: 'セッションのタイトルと要約に使うモデルです。',
            },
            modelsImageDescription: {
                label: '画像説明モデル（models.image_description）',
                desc: '渡された画像を文字に起こすビジョンモデルです。',
            },
            modelsPromptSuggestion: {
                label: '入力候補モデル（models.prompt_suggestion）',
                desc: '次の入力候補（ゴーストテキスト）を生成するモデルです。',
            },
            modelsAgentType: {
                label: '既定のエージェント種別（models.agent_type）',
                desc: 'agent_type を持たないモデルに使うエージェント定義の種別です。',
            },
            modelsTemperature: {
                label: 'temperature（models.temperature）',
                desc: '全モデル共通のサンプリング温度の既定値です（0〜2）。',
            },
            modelsTopP: {
                label: 'top_p（models.top_p）',
                desc: '全モデル共通の top_p の既定値です（0〜1）。',
            },
            modelsMaxCompletionTokens: {
                label: '最大出力トークン（models.max_completion_tokens）',
                desc: '全モデル共通の最大出力トークン数の既定値です。',
            },
            modelsMaxRetries: {
                label: '推論の再試行回数（models.max_retries）',
                desc: '全モデル共通の推論の再試行回数の既定値です。',
            },
            modelsRateLimitRetryThreshold: {
                label: 'レート制限時の試行上限（models.rate_limit_retry_threshold）',
                desc: 'レート制限を受けた要求の合計試行回数の上限の既定値です（最大は max_retries）。',
            },
            modelsSubagentRateLimitMaxAttempts: {
                label: 'サブエージェントの 429 待機回数（models.subagent_rate_limit_max_attempts）',
                desc: 'サブエージェントが 429 応答で待機する回数の上限です（0〜32）。0 で待機をオフにします。',
            },
            modelsInferenceIdleTimeoutSecs: {
                label: '推論アイドルタイムアウト（models.inference_idle_timeout_secs）',
                desc: 'ストリーミング推論のアイドルタイムアウトの既定値（秒）です。',
            },
            modelsStreamToolCalls: {
                label: 'ツール呼び出しのストリーミング（models.stream_tool_calls）',
                desc: '全モデルの要求でツール呼び出しをストリーミングします。',
            },
            agentName: {
                label: 'エージェント定義名（agent.name）',
                desc: 'セッションで動かす組み込みまたは検出済みのエージェント定義の名前です。',
            },
            agentDefinition: {
                label: 'エージェント定義ファイル（agent.definition）',
                desc: 'YAML frontmatter を持つエージェント定義 Markdown ファイルのパスです。',
            },
            agentSystemPromptLabel: {
                label: 'システムプロンプトの名乗り（agent.system_prompt_label）',
                desc: 'システムプロンプトでの名乗りです。モデル個別の指定が優先します。',
            },
            promptSuggestionsMaxOutputTokens: {
                label: '入力候補の出力トークン数（prompt_suggestions.max_output_tokens）',
                desc: '入力候補の生成で出力するトークン数です（16〜256）。',
            },
            promptSuggestionsTemperature: {
                label: '入力候補の temperature（prompt_suggestions.temperature）',
                desc: '入力候補の生成に使うサンプリング温度です。',
            },
            promptSuggestionsReasoningEffort: {
                label: '入力候補の推論の労力（prompt_suggestions.reasoning_effort）',
                desc: '入力候補の生成に使う推論の労力です。none は推論なしです。',
            },
            longReasoningReminderEnabled: {
                label: '長考リマインダー（long_reasoning_reminder.enabled）',
                desc: '長い推論を行ったモデル呼び出しの後、簡潔に考えるよう促すリマインダーをターンの途中で挿入します。',
            },
            longReasoningReminderTokens: {
                label: '長考と判定するトークン数（long_reasoning_reminder.tokens）',
                desc: '1 回のモデル呼び出しで長考とみなす推論トークン数です（100〜200000）。',
            },
            longReasoningReminderDelay: {
                label: 'リマインダーまでの呼び出し回数（long_reasoning_reminder.delay）',
                desc: '長考の後、リマインダーまでに待つモデル呼び出しの回数です（0〜10）。',
            },
            modelsExtraHeaders: {
                label: 'モデル共通ヘッダー（models.extra_headers）',
                desc: 'すべてのモデル要求へ追加する HTTP ヘッダーです。モデル個別の値が優先します。',
            },
            modelsAllowedModels: {
                label: 'モデル許可リスト（models.allowed_models）',
                desc: 'モデル選択画面、既定モデル、-m で使うモデルを絞る glob パターンです。',
            },
            modelsHiddenModels: {
                label: '非表示モデル（models.hidden_models）',
                desc: 'モデル選択画面で非表示にするモデル ID です。',
            },
            modelsDisabledModels: {
                label: '無効モデル（models.disabled_models）',
                desc: 'モデルカタログから除くモデル ID です。非表示モデルより優先します。',
            },
            customModels: {
                label: 'カスタムモデル定義（model.<id>）',
                desc: 'モデルごとの上書きと BYOK の定義です（接続先、認証、サンプリングなど）。',
            },
            modelProviders: {
                label: 'カスタムプロバイダー定義（model_providers.<name>）',
                desc: '[model.<id>] の model_provider から参照する名前付きプロバイダーの定義です。',
            },
            sandboxProfile: {
                label: 'サンドボックス（sandbox.profile）',
                desc: 'ファイルシステムのサンドボックスのプロファイルです（off / workspace / devbox / read-only / strict / カスタム名）。',
            },
            sandboxAutoAllowBash: {
                label: 'bash 自動許可（sandbox.auto_allow_bash）',
                desc: 'サンドボックスのプロファイルが有効な間、bash の権限確認を省きます。',
            },
            toolsRespectGitignore: {
                label: 'gitignore 尊重（tools.respect_gitignore）',
                desc: '検索・読み取りツールが gitignore 対象のファイルを飛ばします。',
            },
            toolsDisableZdrIncompatibleTools: {
                label: 'ZDR 非対応ツールの制限（tools.disable_zdr_incompatible_tools）',
                desc: 'ゼロデータ保持（ZDR）の下で、xAI がホストする出力を使うツール（動画など）を制限します。',
            },
            toolsetFileToolset: {
                label: 'ファイル編集方式（toolset.file_toolset）',
                desc: 'ファイル編集ツールの方式です。standard は通常の編集、hashline は行ハッシュを使う編集です。',
            },
            toolsetBashTimeoutSecs: {
                label: 'bash タイムアウト（toolset.bash.timeout_secs）',
                desc: 'フォアグラウンドの bash コマンドのタイムアウト（秒）です。',
            },
            toolsetBashOutputByteLimit: {
                label: 'bash 出力上限（toolset.bash.output_byte_limit）',
                desc: '取得する bash 出力の上限（バイト）です。',
            },
            toolsetBashMaxTimeoutSecs: {
                label: 'bash 最大タイムアウト（toolset.bash.max_timeout_secs）',
                desc: 'モデルが要求するフォアグラウンドのタイムアウトの上限（秒）です。',
            },
            toolsetBashAutoBackground: {
                label: 'タイムアウト時にバックグラウンド化（toolset.bash.auto_background_on_timeout）',
                desc: 'フォアグラウンドのタイムアウトで bash コマンドをバックグラウンドへ移します。',
            },
            toolsetBashLoginShellCapture: {
                label: 'ログインシェル環境の取り込み（toolset.bash.login_shell_capture）',
                desc: 'bash にログインシェルの環境を取り込みます。',
            },
            toolsetWebFetchProxyEndpoint: {
                label: 'Web 取得プロキシ（toolset.web_fetch.proxy_endpoint）',
                desc: 'web_fetch の外向き通信に使うプロキシ URL です。',
            },
            toolsetWebFetchAllowLocal: {
                label: 'ローカル取得許可（toolset.web_fetch.allow_local）',
                desc: 'web_fetch の接続先に明示的なループバック（localhost、127.0.0.0/8、::1）を加えます。',
            },
            toolsetAskUserQuestionTimeoutEnabled: {
                label: '質問タイムアウト（toolset.ask_user_question.timeout_enabled）',
                desc: 'ask_user_question にタイムアウトを設けます。オフでは回答を無期限に待ちます。',
            },
            toolsetAskUserQuestionTimeoutSecs: {
                label: '質問タイムアウト秒数（toolset.ask_user_question.timeout_secs）',
                desc: 'ask_user_question が回答を待つ秒数です。',
            },
            toolsMediaGenMaxParallelImageGenCalls: {
                label: '画像生成の同時呼び出し数（tools.media_gen.max_parallel_image_gen_calls）',
                desc: '1 回のモデルステップでの image_gen と image_edit の呼び出しの上限です。',
            },
            toolsMediaGenMaxParallelVideoGenCalls: {
                label: '動画生成の同時呼び出し数（tools.media_gen.max_parallel_video_gen_calls）',
                desc: '1 回のモデルステップでの video_gen の呼び出しの上限です。',
            },
            disableWebSearch: {
                label: 'Web 検索ツールを外す（disable_web_search）',
                desc: 'web_search ツールを外します。',
            },
            sessionAutoCompactThreshold: {
                label: '自動圧縮の閾値（session.auto_compact_threshold_percent）',
                desc: '自動圧縮を始めるコンテキスト使用率（%）です（0〜100）。',
            },
            sessionLoadEnvrc: {
                label: '.envrc 読み込み（session.load_envrc）',
                desc: '.envrc の環境変数を bash へ注入します。',
            },
            storageCleanupTtlDays: {
                label: 'セッション自動削除の日数（storage.cleanup_ttl_days）',
                desc: 'この日数使われていないセッションのフォルダを削除し、古いメディアと端末ログを整理します。0 で自動削除をオフにします。',
            },
            autoModeEnabled: {
                label: 'Auto 権限モード（auto_mode.enabled）',
                desc: 'ツールの承認を自動で判断する Auto 権限モードを有効にします。',
            },
            defaultAutoMode: {
                label: '既定で Auto モード（default_auto_mode）',
                desc: 'セッションを Auto 権限モードで開始します。',
            },
            doomLoopRecoveryEnabled: {
                label: 'ツール呼び出しのループ回復（doom_loop_recovery.enabled）',
                desc: 'ツール呼び出しのループを検出すると再サンプリングします。',
            },
            pathNotFoundHints: {
                label: 'パス未検出時のヒント（path_not_found_hints）',
                desc: 'パスが見つからないエラーに、作業ディレクトリの案内と似た名前の候補を添えます。',
            },
            harnessDisableWorkspaceTeleport: {
                label: 'ターンごとのスナップショット停止（harness.disable_workspace_teleport）',
                desc: 'ターンごとの作業領域のスナップショットを止めます。',
            },
            subagentsEnabled: {
                label: 'サブエージェント（subagents.enabled）',
                desc: 'サブエージェントと task ツールのマスタースイッチです。',
            },
            subagentsLimitBehavior: {
                label: '同時実行上限時の動作（subagents.limit_behavior）',
                desc: '同時実行数の上限での動作です。queue は待機、fail はエラーにします。',
            },
            subagentsMaxConcurrent: {
                label: 'サブエージェント同時実行数（subagents.max_concurrent）',
                desc: '同時に実行するサブエージェントの上限です。',
            },
            subagentsMaxDepth: {
                label: 'サブエージェントの入れ子の深さ（subagents.max_depth）',
                desc: 'サブエージェントの入れ子の深さの上限です。',
            },
            subagentsSamplingLimit: {
                label: 'サブエージェントのサンプリング上限（subagents.sampling_limit）',
                desc: 'プロセスあたりのサブエージェントのサンプリング呼び出しの同時実行数です。',
            },
            mcpMaxOutputBytes: {
                label: 'MCP 出力サイズ上限（mcp.max_output_bytes）',
                desc: 'MCP ツールの出力サイズの上限（バイト）です。',
            },
            shellEnvPolicyInherit: {
                label: '引き継ぐ環境変数の範囲（shell_environment_policy.inherit）',
                desc: 'bash が親から引き継ぐ環境変数です。all はすべて、core は PATH や HOME などの最小限、none は空から始めます。',
            },
            shellEnvPolicyIgnoreDefaultExcludes: {
                label: '既定の除外を無視（shell_environment_policy.ignore_default_excludes）',
                desc: '名前が *KEY*、*SECRET*、*TOKEN* に一致する変数を除く組み込みの規則を外します。',
            },
            toolsetWebFetchAllowedDomains: {
                label: 'Web 取得の許可ドメイン（toolset.web_fetch.allowed_domains）',
                desc: 'web_fetch の接続先ドメインです。組み込みの許可リストを置き換えます。',
            },
            toolsetWebSearchAllowedDomains: {
                label: 'Web 検索の許可ドメイン（toolset.web_search.allowed_domains）',
                desc: 'web_search の検索対象のドメインです。',
            },
            toolsetWebSearchExcludedDomains: {
                label: 'Web 検索の除外ドメイン（toolset.web_search.excluded_domains）',
                desc: 'web_search の検索対象から除くドメインです。',
            },
            toolsZdrVideoOutputS3: {
                label: 'ZDR の動画出力バケット（tools.zdr_video_output_s3）',
                desc: 'ZDR の下で生成した動画を保存する S3 互換バケットと認証情報です。',
            },
            mcpServers: {
                label: 'MCP サーバー定義（mcp_servers.<name>）',
                desc: 'MCP サーバーごとの stdio または HTTP 接続、環境変数、ヘッダー、タイムアウトの定義です。',
            },
            disabledMcpServers: {
                label: '無効 MCP サーバー（disabled_mcp_servers）',
                desc: '[mcp_servers] の定義を残したまま飛ばす MCP サーバー名です。',
            },
            disabledMcpTools: {
                label: '無効 MCP ツール（disabled_mcp_tools）',
                desc: 'MCP サーバーごとの拒否するツール名です。',
            },
            permission: {
                label: '権限規則（permission）',
                desc: 'ツールの allow、ask、deny の規則と詳細な規則です。deny、ask、allow の順に優先します。',
            },
            hooks: {
                label: 'フック定義（hooks.<event>）',
                desc: 'PreToolUse や Stop などのライフサイクルイベントで動かすマッチャーとコマンドです。',
            },
            shellEnvPolicyExclude: {
                label: '除外する環境変数（shell_environment_policy.exclude）',
                desc: 'bash から取り除く環境変数名です。',
            },
            shellEnvPolicyIncludeOnly: {
                label: '許可する環境変数（shell_environment_policy.include_only）',
                desc: 'bash が受け取る環境変数をこの名前に絞ります。',
            },
            shellEnvPolicySet: {
                label: '設定する環境変数（shell_environment_policy.set）',
                desc: 'bash へ注入する環境変数の値です。',
            },
            subagentsToggle: {
                label: 'サブエージェント個別状態（subagents.toggle）',
                desc: 'サブエージェントの種類ごとの有効・無効です。',
            },
            subagentsModels: {
                label: 'サブエージェントモデル（subagents.models）',
                desc: 'サブエージェントの種類ごとに使うモデル ID です。',
            },
            subagentsRoles: {
                label: 'サブエージェントのロール（subagents.roles）',
                desc: '権限と使うモデルの既定を持つカスタムロールの定義です。',
            },
            subagentsPersonas: {
                label: 'サブエージェントのペルソナ（subagents.personas）',
                desc: '口調や重点などの振る舞いの指示を加えるカスタムペルソナの定義です。',
            },
            memoryEnabled: {
                label: 'クロスセッションメモリ（memory.enabled）',
                desc: 'セッションをまたぐメモリのマスタースイッチです。',
            },
            memoryV2Enabled: {
                label: 'メモリ v2（memory_v2.enabled）',
                desc: 'メモリ v2 の主スイッチです。オンは memory.enabled より優先します。',
            },
            memoryV2BatchDreamEnabled: {
                label: 'バッチ Dream（memory_v2.batch_dream_enabled）',
                desc: 'メモリの Dream をバッチで実行し、トピック一覧全体を見てノートをトピックへまとめます。',
            },
            memoryV2BatchDreamMaxRunSecs: {
                label: 'バッチ Dream の最大実行時間（memory_v2.batch_dream_max_run_secs）',
                desc: '1 回のバッチ Dream の実行時間の上限（秒）です（60〜3600）。',
            },
            memoryV2BatchDreamMaxCallsPerBatch: {
                label: 'バッチあたりのモデル呼び出し数（memory_v2.batch_dream_max_calls_per_batch）',
                desc: 'バッチ Dream の 1 バッチのモデル呼び出しの上限です（2〜16）。',
            },
            memoryV2BatchDreamMaxBatchNoteBytes: {
                label: 'バッチあたりのノート量（memory_v2.batch_dream_max_batch_note_bytes）',
                desc: 'バッチ Dream の 1 バッチのノートのバイト数の上限です（16384〜262144）。',
            },
            memoryV2ArchivedRetentionDays: {
                label: 'アーカイブの保持日数（memory_v2.archived_retention_days）',
                desc: 'アーカイブしたメモリの観察ファイルを保持する日数です。',
            },
            memoryV2JobRetentionDays: {
                label: 'キャプチャジョブの保持日数（memory_v2.job_retention_days）',
                desc: '完了したメモリのキャプチャジョブ情報を保持する日数です。',
            },
            cliAutoUpdate: {
                label: '自動更新（cli.auto_update）',
                desc: '起動時に CLI の更新を確認します。',
            },
            cliChannel: {
                label: '更新チャンネル（cli.channel）',
                desc: 'リリースチャネルです（stable / alpha / enterprise）。',
            },
            cliShowTips: {
                label: '起動時 Tips（cli.show_tips）',
                desc: '起動時にヒントを表示します。',
            },
            cliUseLeader: {
                label: 'リーダープロセスを使用（cli.use_leader）',
                desc: '設定の再読み込みと MCP の監視にリーダープロセスを使います。',
            },
            cliNpmRegistry: {
                label: 'npm レジストリ（cli.npm_registry）',
                desc: '自動更新が使う npm レジストリです。',
            },
            cliMinimumVersion: {
                label: '更新の下限バージョン（cli.minimum_version）',
                desc: 'アップデーターが入れる最も古いバージョンです。',
            },
            cliMaximumVersion: {
                label: '更新の上限バージョン（cli.maximum_version）',
                desc: 'アップデーターが入れる最も新しいバージョンです。',
            },
            cliRequiredMinimumVersion: {
                label: '起動可能な下限バージョン（cli.required_minimum_version）',
                desc: '起動する最も古いバージョンです。',
            },
            cliRequiredMaximumVersion: {
                label: '起動可能な上限バージョン（cli.required_maximum_version）',
                desc: '起動する最も新しいバージョンです。',
            },
            cliWorktreeType: {
                label: 'ワークツリー作成方式（cli.worktree_type）',
                desc: 'ワークツリーの作成方式です（linked / standalone / git）。',
            },
            cliSessionPickerGrouped: {
                label: 'セッションをリポジトリ別に表示（cli.session_picker_grouped）',
                desc: 'セッション選択画面と CLI の一覧で、セッションをリポジトリごとにまとめます。',
            },
            cliSessionRegistry: {
                label: 'セッションレジストリ参加（cli.session_registry）',
                desc: 'プロセスをまたぐセッションレジストリに参加します。',
            },
            hintsNewSessionWorktreeMode: {
                label: '/new のワークツリー確認（hints.new_session_worktree_mode）',
                desc: '/new でのワークツリーの扱いです。ask は確認、always は作成、never は作成なしです。',
            },
            hintsForkWorktreeMode: {
                label: '/fork のワークツリー確認（hints.fork_worktree_mode）',
                desc: '/fork でのワークツリーの扱いです。ask は確認、always は作成、never は作成なしです。',
            },
            hintsMemoryModalFullscreen: {
                label: 'メモリモーダル全画面（hints.memory_modal_fullscreen）',
                desc: 'メモリモーダルを前回全画面で開いたかどうかを記憶します。',
            },
            dashboardEnabled: {
                label: 'エージェントダッシュボード（dashboard.enabled）',
                desc: 'エージェントダッシュボードを有効にします。',
            },
            dashboardGrouping: {
                label: 'ダッシュボードのグループ化（dashboard.grouping）',
                desc: 'ダッシュボードの行を状態（state）またはディレクトリ（directory）でまとめます。',
            },
            uiCompactMode: {
                label: 'コンパクト表示（ui.compact_mode）',
                desc: 'メッセージの余白を詰めて表示します。',
            },
            uiScreenMode: {
                label: '既定の画面モード（ui.screen_mode）',
                desc: 'grok の表示モードです。fullscreen は標準の TUI、minimal は端末のスクロールバックを使います。',
            },
            uiTimestamps: {
                label: '時刻表示（ui.timestamps）',
                desc: 'メッセージの時刻の表示です。off は非表示、minimal は入力と所要時間の行だけ、on はすべてのメッセージです。',
            },
            uiShowTimeline: {
                label: 'タイムラインサイドバー（ui.show_timeline）',
                desc: 'スクロールバーの代わりにターンごとの目盛りを表示します。',
            },
            uiToolCallDensity: {
                label: 'ツール呼び出しの表示量（ui.tool_call_density）',
                desc: 'ツール呼び出しの表示量です。detailed は編集差分とシェル出力まで表示し、compact 系ほど要約行へ折りたたみます。',
            },
            uiTheme: {
                label: 'テーマ（ui.theme）',
                desc: 'カラーテーマの名前です。auto は OS のライト・ダークに従います。',
            },
            uiAutoDarkTheme: {
                label: 'OS ダーク時のテーマ（ui.auto_dark_theme）',
                desc: 'テーマが auto で OS がダークのときのテーマです。',
            },
            uiAutoLightTheme: {
                label: 'OS ライト時のテーマ（ui.auto_light_theme）',
                desc: 'テーマが auto で OS がライトのときのテーマです。',
            },
            uiRenderMermaid: {
                label: 'Mermaid の表示（ui.render_mermaid）',
                desc: 'Mermaid 図の表示です。auto と on は開くための行を添え、off はソースのまま表示します。',
            },
            uiRememberToolApprovals: {
                label: 'ツール承認を記憶（ui.remember_tool_approvals）',
                desc: '承認の確認にツールごとの「常に許可」の選択肢を表示します。',
            },
            uiShowThinkingBlocks: {
                label: '思考ブロックを表示（ui.show_thinking_blocks）',
                desc: 'ストリーミング中に思考・推論のブロックを表示します。',
            },
            uiPromptSuggestions: {
                label: '入力候補（ui.prompt_suggestions）',
                desc: '各ターンの後に次の入力候補（ゴーストテキスト）を表示します。',
            },
            uiScrollSpeed: {
                label: 'スクロール速度（ui.scroll_speed）',
                desc: 'マウスとトラックパッドのスクロール速度の倍率です（1〜100）。',
            },
            uiScrollMode: {
                label: 'スクロール入力方式（ui.scroll_mode）',
                desc: 'スクロール入力の種類です。auto は自動判定、wheel と trackpad は固定です。',
            },
            uiScrollLines: {
                label: '1 回のスクロール行数（ui.scroll_lines）',
                desc: 'ホイールとトラックパッドの 1 回あたりのスクロール行数です（1〜10）。',
            },
            uiInvertScroll: {
                label: 'スクロール方向を反転（ui.invert_scroll）',
                desc: '縦のスクロール方向を反転します。',
            },
            uiKeepTextSelection: {
                label: 'テキスト選択（ui.keep_text_selection）',
                desc: 'アプリ内の選択の動作です。flash は短く強調、hold は保持、word_select はダブルクリックで単語、トリプルクリックで段落を選択します。',
            },
            uiMaxThoughtsWidth: {
                label: '思考表示の幅（ui.max_thoughts_width）',
                desc: '思考パネルの列幅です（40〜500）。',
            },
            uiForkSecondaryModel: {
                label: 'フォーク副モデル（ui.fork_secondary_model）',
                desc: 'フォーク時の副エージェントのモデルです。',
            },
            uiYolo: {
                label: 'YOLO モード（ui.yolo）',
                desc: 'ツールの呼び出しを常に承認します。',
            },
            uiPermissionMode: {
                label: '権限モード（ui.permission_mode）',
                desc: 'ツールの権限の既定の動作です。default と ask は確認、auto は分類器で判断、always-approve は確認なしです。',
            },
            uiDefaultSelectedPermission: {
                label: '承認の初期選択（ui.default_selected_permission）',
                desc: '最初の承認の確認で選択しておく行です。',
            },
            uiPageFlipOnSend: {
                label: '送信時に最上部へ（ui.page_flip_on_send）',
                desc: '送信した入力を画面の最上部へ移します。',
            },
            uiConfirmBeforeRewind: {
                label: '巻き戻し前に確認（ui.confirm_before_rewind）',
                desc: '会話履歴を巻き戻す前に確認します。',
            },
            uiDashboardPreview: {
                label: 'ダッシュボードのプレビュー（ui.dashboard_preview）',
                desc: 'ダッシュボードに、選択中のセッションのプレビューと返信パネルを表示します。',
            },
            uiFollowUpBehavior: {
                label: '実行中の追加入力（ui.follow_up_behavior）',
                desc: 'ターン中の追加入力の扱いです。queue はターンの終了まで待ち、steer は次の安全な時点で割り込ませます。',
            },
            keysVim: {
                label: 'Vim ナビゲーション（keys.vim）',
                desc: 'スクロールバックの Vim キーの操作です。off は無効、nav は有効です。/vim-mode でも切り替えられます。',
            },
            uiHunkTrackerMode: {
                label: '変更ハンク追跡（ui.hunk_tracker_mode）',
                desc: 'ファイル変更のハンク追跡です。agent_only はエージェントの編集、all_dirty は Git の未コミット変更すべて、off は追跡なしです。',
            },
            uiVoiceCaptureMode: {
                label: '音声キャプチャ方式（ui.voice_capture_mode）',
                desc: '音声入力の操作です。hold は押している間だけ録音し、toggle は押すたびに開始と停止を切り替えます。',
            },
            uiVoiceKeybindEnabled: {
                label: '音声入力ショートカット（ui.voice_keybind_enabled）',
                desc: 'Ctrl+Space / F8 の音声入力ショートカットを有効にします。',
            },
            uiVoiceSttLanguage: {
                label: '音声入力言語（ui.voice_stt_language）',
                desc: '音声入力の言語コードまたは auto です。voice.language より優先します。',
            },
            uiMouseReportingToggle: {
                label: 'マウスレポート切替（ui.mouse_reporting_toggle）',
                desc: 'スクロールバックで Ctrl+R を押すと端末のマウスキャプチャを切り替えます。',
            },
            uiCancelSubagentsOnTurnCancel: {
                label: 'ターン中断時のサブエージェント（ui.cancel_subagents_on_turn_cancel）',
                desc: 'ターン中断時のサブエージェントの扱いです。ask は確認、always_stop は停止、always_continue は継続です。',
            },
            uiCursorBlink: {
                label: 'カーソル点滅（ui.cursor_blink）',
                desc: 'ブロックカーソルの表示です。オンは点滅、オフは点灯、未設定は端末の設定に従います。',
            },
            uiCombineQueuedPrompts: {
                label: 'キュー投稿を結合（ui.combine_queued_prompts）',
                desc: '連続する通常の追加入力を 1 つのターンにまとめます。',
            },
            uiStatusLineType: {
                label: 'ステータスラインの種類（ui.status_line.type）',
                desc: 'ステータスラインの方式です。builtin は Grok の表示項目、command はスクリプトの出力、disabled は非表示です。',
            },
            uiStatusLineItems: {
                label: 'ステータスラインの項目（ui.status_line.items）',
                desc: 'builtin で表示する項目と順序です（cwd / model / context / cost / turn-timer / session-name）。',
            },
            uiStatusLineCommand: {
                label: 'ステータスラインのコマンド（ui.status_line.command）',
                desc: 'command で出力を表示するスクリプトのパスまたはシェルコマンドです。',
            },
            uiStatusLinePadding: {
                label: 'ステータスラインの余白（ui.status_line.padding）',
                desc: '左右それぞれの余白の文字数です（最大 16）。',
            },
            uiStatusLineRefreshInterval: {
                label: 'ステータスラインの更新間隔（ui.status_line.refresh_interval）',
                desc: 'command のスクリプトを定期的に実行する間隔（秒）です（1〜86400）。',
            },
            voiceLanguage: {
                label: '音声認識の言語（voice.language）',
                desc: '音声認識の言語コードまたは auto です。',
            },
            voiceApiBase: {
                label: '音声認識 API（voice.api_base）',
                desc: '音声認識に使う HTTPS の API ルートです。',
            },
            voiceSampleRate: {
                label: '音声のサンプリングレート（voice.sample_rate）',
                desc: '音声認識のキャプチャのサンプリングレート（Hz）です。',
            },
            uiContextualHints: {
                label: '状況別のヒント（ui.contextual_hints）',
                desc: 'undo、plan_mode、image_input などのヒントごとの表示です。',
            },
            uiDisplayRefresh: {
                label: 'ディスプレイ更新（ui.display_refresh）',
                desc: 'ストリーミングとスクロールの更新間隔をディスプレイのリフレッシュレートに合わせます。',
            },
            uiNotifications: {
                label: 'ターミナル通知（ui.notifications）',
                desc: 'ターミナル通知の方式、条件、対象イベント、フックです。',
            },
            cliGrove: {
                label: 'Grove 一括有効化（cli.grove）',
                desc: 'grok clone とセッションのワークツリーの両方で Grove をオンにします。値は真偽値または Grove の種類名です。',
            },
            cliGroveWorktree: {
                label: 'ワークツリーの Grove（cli.grove_worktree）',
                desc: 'セッションのワークツリーの作り方（Grove またはコピー）です。値は真偽値または Grove の種類名です。',
            },
            worktreeAutoGc: {
                label: 'ワークツリーの自動削除（worktree.auto_gc）',
                desc: 'ワークツリーを自動で片付ける方針です。',
            },
            versionOverrides: {
                label: 'バージョン別の設定（version_overrides）',
                desc: 'CLI のバージョンごとに適用する設定の差分です。',
            },
            featuresWebFetch: {
                label: 'web_fetch（features.web_fetch）',
                desc: 'web_fetch ツールを有効にします。',
            },
            featuresRemoteFetch: {
                label: 'リモート取得（features.remote_fetch）',
                desc: 'モデルカタログとアセットをオンラインで取得します。',
            },
            featuresLspTools: {
                label: 'LSP ツール（features.lsp_tools）',
                desc: 'LSP のコード解析ツールをモデルへ公開します。',
            },
            featuresWriteFile: {
                label: 'write ツール（features.write_file）',
                desc: 'write ツールを有効にします。',
            },
            featuresAskUserQuestion: {
                label: '質問ツール（features.ask_user_question）',
                desc: 'ユーザーへ質問する ask_user_question ツールを有効にします。',
            },
            featuresBackendTools: {
                label: 'サーバー側検索（features.backend_tools）',
                desc: 'web_search と x_search をサーバー側で実行します。',
            },
            featuresImageGen: {
                label: '画像生成（features.image_gen）',
                desc: 'image_gen と /imagine を有効にします。',
            },
            featuresImageGenModelOverride: {
                label: '画像生成モデル（features.image_gen_model_override）',
                desc: 'image_gen で使う Imagine モデル ID です。',
            },
            featuresImageEditModelOverride: {
                label: '画像編集モデル（features.image_edit_model_override）',
                desc: 'image_edit で使う Imagine モデル ID です。',
            },
            featuresVideoGen: {
                label: '動画生成（features.video_gen）',
                desc: '動画ツールと /imagine-video を有効にします。',
            },
            featuresVoiceMode: {
                label: '音声入力（features.voice_mode）',
                desc: '音声入力（音声からテキストへの変換）を有効にします。',
            },
            featuresTelemetry: {
                label: 'テレメトリ（features.telemetry）',
                desc: '製品分析テレメトリのモードです。有効はすべて、session_metrics はセッション指標だけを送り、無効とオフは送信なしです。',
                choice: {
                    enabled: '有効（true）',
                    sessionMetrics: 'セッション指標のみ（session_metrics）',
                    disabled: '無効（false）',
                    off: 'オフ（off）',
                },
            },
            featuresFeedback: {
                label: 'フィードバック（features.feedback）',
                desc: 'フィードバックの案内と /feedback を有効にします。',
            },
            featuresFeedbackTraceCard: {
                label: 'フィードバック時のトレース送信確認（features.feedback_trace_card）',
                desc: '/feedback の後に、トレースのアップロードへの同意を確認します。',
            },
            featuresTwoPassCompaction: {
                label: '2 パス圧縮（features.two_pass_compaction）',
                desc: '長い会話の前半を、圧縮の前にバックグラウンドで要約します。',
            },
            featuresCompactionMode: {
                label: '圧縮方式（features.compaction_mode）',
                desc: '会話の圧縮方式です（summary / transcript / segments）。',
            },
            featuresCompactionDetail: {
                label: '圧縮の詳細度（features.compaction_detail）',
                desc: 'segments 方式で原文を残す度合いです（none / minimal / balanced / verbose）。',
            },
            featuresCompactionToolChoice: {
                label: '圧縮時のツール選択（features.compaction_tool_choice）',
                desc: '圧縮のときに使うツール選択のヒントです。',
            },
            featuresCompactionVerbatimInput: {
                label: '原文から要約（features.compaction_verbatim_input）',
                desc: '短縮したコピーではなく会話の原文を要約します。',
            },
            featuresSessionRecap: {
                label: 'セッションの振り返り（features.session_recap）',
                desc: '/recap と、離席から戻ったときの自動の振り返りを有効にします。',
            },
            featuresSessionSearch: {
                label: 'セッション検索（features.session_search）',
                desc: 'SQLite のセッション検索インデックスを有効にします。',
            },
            featuresTurnSummary: {
                label: 'ターン要約（features.turn_summary）',
                desc: 'エージェントダッシュボードにターンごとの要約を表示します。',
            },
            featuresTitleRefresh: {
                label: 'タイトルの自動更新（features.title_refresh）',
                desc: 'セッションの序盤にタイトルを自動で更新します。',
            },
            featuresCancelRewind: {
                label: 'キャンセル時の入力復元（features.cancel_rewind）',
                desc: 'ターンの最初の動作より前の Ctrl+C で入力を元に戻します。',
            },
            featuresAutoWake: {
                label: '自動再開（features.auto_wake）',
                desc: 'バックグラウンドタスクやサブエージェントが終わると、すぐに会話を続けます。',
            },
            featuresActiveAgentMessages: {
                label: '実行中エージェントへの追加指示（features.active_agent_messages）',
                desc: 'モデルが作成した追加の指示を、実行中の配下のエージェントへ送ります。',
            },
            featuresSubagentModelInheritance: {
                label: 'サブエージェントのモデル継承（features.subagent_model_inheritance）',
                desc: '選べるモデルがすべて xAI のとき、サブエージェントの model 引数を隠して親のモデルを継承させます。',
            },
            featuresSubagentWorktreeSnapshot: {
                label: 'サブエージェントの作業保存（features.subagent_worktree_snapshot）',
                desc: '完了したサブエージェントの作業コピーを git の ref としてリポジトリへ保存し、再開時に復元します。',
            },
            featuresWorktreeInheritsMainApprovals: {
                label: 'ワークツリーの承認の継承（features.worktree_inherits_main_approvals）',
                desc: 'メインのチェックアウトで保存した「常に許可」の回答を git ワークツリーでも使います。',
            },
            featuresSupportPermission: {
                label: '権限確認（features.support_permission）',
                desc: 'ツールの実行についてエージェントが権限を確認します。',
            },
            featuresRememberMode: {
                label: '権限モードを記憶（features.remember_mode）',
                desc: '最後の権限モードをセッションをまたいで記憶します。',
            },
            featuresNonGitWarning: {
                label: 'Git 外での警告（features.non_git_warning）',
                desc: 'Git リポジトリの外で起動すると、操作を止める警告を表示します。',
            },
            featuresMcpAutoRestart: {
                label: 'MCP の自動再起動（features.mcp_auto_restart）',
                desc: '通信が失敗した stdio の MCP サーバーを自動で再起動します。',
            },
            featuresMcpLivenessWatchers: {
                label: 'MCP の死活監視（features.mcp_liveness_watchers）',
                desc: 'MCP の接続を定期的に確認し、サーバーの状態の更新を送ります。',
            },
            featuresMcpPushServerStatus: {
                label: 'MCP 状態の受信（features.mcp_push_server_status）',
                desc: 'TUI が MCP サーバーの状態の通知を受け取ります。',
            },
            featuresMcpRecursiveConfigWatch: {
                label: 'プロジェクト MCP 設定の監視（features.mcp_recursive_config_watch）',
                desc: '作業ディレクトリと .grok フォルダのプロジェクト MCP 設定の編集を監視します。',
            },
            featuresDock: {
                label: 'パネルドック（features.dock）',
                desc: 'サブエージェント、タスク、ウォッチャー、キューをまとめたパネルを入力欄の上に表示します。',
            },
            featuresTerminalTheme: {
                label: 'terminal テーマ（features.terminal_theme）',
                desc: '端末自身の配色を使う terminal カラーテーマを表示します。',
            },
            featuresFileAcceleration: {
                label: 'ファイルアクセラレーター（features.file_acceleration）',
                desc: 'ローカルセッションのファイルシステムを、インストール済みのファイルアクセラレーターに任せます。',
            },
            fileAccelerationRoutes: {
                label: 'ファイルアクセラレーターの経路（file_acceleration.routes）',
                desc: 'インストール済みのファイルアクセラレーターへそのまま渡す経路の上書きです。',
            },
            featuresCampaigns: {
                label: 'キャンペーン設定の適用（features.campaigns）',
                desc: 'リモートから配信されるキャンペーンの設定パッチを適用します。',
            },
            featuresZdrAccessEnabled: {
                label: 'ZDR でのツール提示（features.zdr_access_enabled）',
                desc: 'ゼロデータ保持（ZDR）のチームに、ZDR 非対応のツールを提示します。',
            },
            workflowsEnabled: {
                label: 'ワークフロー（workflows.enabled）',
                desc: 'workflow ツールや /deep-research などのバックグラウンドワークフローを有効にします。',
            },
            goalEnabled: {
                label: '/goal（goal.enabled）',
                desc: '/goal コマンドを有効にします。',
            },
            relayEnabled: {
                label: 'セッションの中継同期（relay.enabled）',
                desc: 'セッションの中継（relay）同期を有効にします。',
            },
            featuresCodebaseIndexing: {
                label: 'コードベース索引（features.codebase_indexing）',
                desc: 'コードグラフの索引です。true は Git リポジトリを索引し、include / exclude の glob 配列は対象を指定します。',
            },
            compatCursorSkills: {
                label: 'Cursor スキルを検出（compat.cursor.skills）',
                desc: 'Cursor のスキルディレクトリを検索します。',
            },
            compatCursorRules: {
                label: 'Cursor ルールを検出（compat.cursor.rules）',
                desc: '.cursor/rules を検索します。',
            },
            compatCursorAgents: {
                label: 'Cursor エージェントを検出（compat.cursor.agents）',
                desc: 'Cursor のエージェント定義を検索します。',
            },
            compatCursorMcps: {
                label: 'Cursor MCP を検出（compat.cursor.mcps）',
                desc: 'Cursor の mcp.json を検索します。',
            },
            compatCursorHooks: {
                label: 'Cursor フックを検出（compat.cursor.hooks）',
                desc: 'Cursor のフックを検索します。',
            },
            compatClaudeSkills: {
                label: 'Claude スキルを検出（compat.claude.skills）',
                desc: 'Claude のスキルを検索します。',
            },
            compatClaudeRules: {
                label: 'Claude ルールを検出（compat.claude.rules）',
                desc: 'Claude のルールを検索します。',
            },
            compatClaudeAgents: {
                label: 'Claude エージェントを検出（compat.claude.agents）',
                desc: 'CLAUDE.md と CLAUDE.local.md を検索します。',
            },
            compatClaudeMcps: {
                label: 'Claude MCP を検出（compat.claude.mcps）',
                desc: 'Claude の MCP 設定を検索します。',
            },
            compatClaudeHooks: {
                label: 'Claude フックを検出（compat.claude.hooks）',
                desc: 'Claude のフックを検索します。',
            },
            compatCodexSkills: {
                label: 'Codex スキルを検出（compat.codex.skills）',
                desc: 'Codex のスキルディレクトリを検索します。',
            },
            compatCodexHooks: {
                label: 'Codex フックを検出（compat.codex.hooks）',
                desc: 'Codex のフックを検索します。',
            },
            marketplaceRequireSha: {
                label: 'コミット SHA の固定を必須化（marketplace.require_sha）',
                desc: 'リモートのプラグインのインストールと更新に、完全なコミット SHA の固定を求めます。',
            },
            cursorWorkerAutoStart: {
                label: 'Cursor ワーカー自動起動（cursor_worker.auto_start）',
                desc: 'リーダーの起動時に Cursor のプライベートワーカーとして登録します。',
            },
            cursorWorkerName: {
                label: 'Cursor ワーカー名（cursor_worker.name）',
                desc: 'Cursor に表示するワーカー名です。未設定はホスト名です。',
            },
            cursorWorkerMaxAgents: {
                label: 'Cursor ワーカー同時実行数（cursor_worker.max_agents）',
                desc: '同時に受け付ける Cloud Agents の上限です。未設定は上限なしです。',
            },
            cursorWorkerAnyRepo: {
                label: '任意リポジトリの受け付け（cursor_worker.any_repo）',
                desc: 'Cloud Agent が持ち込んだリポジトリを複製する受け口も登録します。',
            },
            cursorWorkerHubUrl: {
                label: 'Computer Hub の URL（cursor_worker.hub_url）',
                desc: 'ワーカーのセッションに使う Hub のベース URL です。未設定はリーダーの Hub URL から導きます。',
            },
            cursorWorkerRewriteShellOutput: {
                label: 'シェル出力のパス書き換え（cursor_worker.rewrite_shell_output）',
                desc: 'シェル出力のワークツリーとスナップショットのパスを、登録ディレクトリのパスへ書き換えます。',
            },
            skillsPaths: {
                label: '追加スキルパス（skills.paths）',
                desc: '追加のスキルディレクトリです。',
            },
            skillsDisabled: {
                label: '無効スキル（skills.disabled）',
                desc: '検出だけして無効にしておくスキル名です。',
            },
            skillsIgnore: {
                label: 'スキャン除外パス（skills.ignore）',
                desc: 'スキルの検出から除くパスです。',
            },
            pathsExtraRuleDirs: {
                label: '追加ルールディレクトリ（paths.extra_rule_dirs）',
                desc: 'ホームのルールの後に読み込むルールディレクトリです（各ディレクトリに *.md を置きます）。',
            },
            pluginsPaths: {
                label: '追加プラグインパス（plugins.paths）',
                desc: '追加のプラグインディレクトリです。',
            },
            pluginsDisabled: {
                label: '無効プラグイン（plugins.disabled）',
                desc: '検出だけして読み込みを止めるプラグイン ID です。',
            },
            pluginsEnabled: {
                label: '有効プラグイン（plugins.enabled）',
                desc: '有効にするプラグイン ID です。既定で無効のプロジェクトプラグインも含みます。',
            },
            marketplaceSources: {
                label: 'マーケットプレイスソース（marketplace.sources）',
                desc: 'プラグインのマーケットプレイスとして登録する Git リポジトリまたはローカルディレクトリです。',
            },
            cursorWorkerWorkerDirs: {
                label: 'Cursor ワーカーの対象ディレクトリ（cursor_worker.worker_dirs）',
                desc: 'Cloud Agents に提供するリポジトリの絶対パスです。先頭が作業ディレクトリとして登録されます。',
            },
            telemetryTraceUpload: {
                label: 'トレース送信（telemetry.trace_upload）',
                desc: 'セッションのトレースをアップロードします。',
            },
            telemetryMixpanelEnabled: {
                label: 'Mixpanel 送信（telemetry.mixpanel_enabled）',
                desc: '製品分析データを Mixpanel へ送ります。',
            },
            telemetryEventsUrl: {
                label: 'イベント送信先（telemetry.events_url）',
                desc: 'テレメトリのイベントを送る自社コレクターの URL です。',
            },
            telemetryEventsApiKey: {
                label: 'イベント送信の認証キー（telemetry.events_api_key）',
                desc: '自社コレクターのトークンです。',
            },
            telemetryOtelEnabled: {
                label: '外部 OTEL 送信（telemetry.otel_enabled）',
                desc: '自社コレクターへ送る外部 OpenTelemetry のマスタースイッチです。',
            },
            telemetryOtelEndpoint: {
                label: 'OTLP エンドポイント（telemetry.otel_endpoint）',
                desc: '外部 OpenTelemetry の OTLP のベースエンドポイントです。',
            },
            telemetryOtelLogsEndpoint: {
                label: 'OTLP ログのエンドポイント（telemetry.otel_logs_endpoint）',
                desc: 'ログの OTLP エンドポイントです（指定のまま使います）。',
            },
            telemetryOtelMetricsEndpoint: {
                label: 'OTLP メトリクスのエンドポイント（telemetry.otel_metrics_endpoint）',
                desc: 'メトリクスの OTLP エンドポイントです（指定のまま使います）。',
            },
            telemetryOtelProtocol: {
                label: 'OTLP プロトコル（telemetry.otel_protocol）',
                desc: 'OTLP の通信プロトコルです（http/protobuf / grpc）。',
            },
            telemetryOtelLogsProtocol: {
                label: 'OTLP ログのプロトコル（telemetry.otel_logs_protocol）',
                desc: 'ログの OTLP の通信プロトコルです。',
            },
            telemetryOtelMetricsProtocol: {
                label: 'OTLP メトリクスのプロトコル（telemetry.otel_metrics_protocol）',
                desc: 'メトリクスの OTLP の通信プロトコルです。',
            },
            telemetryOtelMetricsExporter: {
                label: 'OTEL メトリクス出力（telemetry.otel_metrics_exporter）',
                desc: 'メトリクスの出力先です。otlp はコレクター、console は標準出力、none は出力なしです。',
            },
            telemetryOtelLogsExporter: {
                label: 'OTEL ログ出力（telemetry.otel_logs_exporter）',
                desc: 'ログの出力先です。otlp はコレクター、console は標準出力、none は出力なしです。',
            },
            telemetryOtelTimeout: {
                label: 'OTLP 送信タイムアウト（telemetry.otel_timeout）',
                desc: '送信のタイムアウト（ミリ秒）です。',
            },
            telemetryOtelMetricExportInterval: {
                label: 'メトリクス送信間隔（telemetry.otel_metric_export_interval）',
                desc: 'メトリクスを送る間隔（ミリ秒）です。',
            },
            telemetryOtelMetricsIncludeSessionId: {
                label: 'メトリクスにセッション ID（telemetry.otel_metrics_include_session_id）',
                desc: 'メトリクスに session.id を付けます。',
            },
            telemetryOtelLogUserPrompts: {
                label: 'プロンプト本文を送信（telemetry.otel_log_user_prompts）',
                desc: '外部 OpenTelemetry に入力プロンプトの本文を含めます。',
            },
            telemetryOtelLogAssistantResponses: {
                label: '応答本文を送信（telemetry.otel_log_assistant_responses）',
                desc: '外部 OpenTelemetry にアシスタントの応答本文を含めます。未設定はプロンプト本文の設定に従います。',
            },
            telemetryOtelLogToolDetails: {
                label: 'ツール詳細を送信（telemetry.otel_log_tool_details）',
                desc: '外部 OpenTelemetry にツール引数の抜粋、パス、正確な名前を含めます。',
            },
            telemetryOtelLogToolContent: {
                label: 'ツールの入出力本文を送信（telemetry.otel_log_tool_content）',
                desc: '外部 OpenTelemetry にツールの入力、出力、コマンド全文、エラーメッセージを含めます。',
            },
            telemetryOtelCertificate: {
                label: 'OTLP の CA 証明書（telemetry.otel_certificate）',
                desc: 'コレクターの検証に追加する CA 証明書（PEM）のパスです。',
            },
            telemetryOtelLogsCertificate: {
                label: 'OTLP ログの CA 証明書（telemetry.otel_logs_certificate）',
                desc: 'ログの送信先の検証に使う CA 証明書（PEM）のパスです。',
            },
            telemetryOtelMetricsCertificate: {
                label: 'OTLP メトリクスの CA 証明書（telemetry.otel_metrics_certificate）',
                desc: 'メトリクスの送信先の検証に使う CA 証明書（PEM）のパスです。',
            },
            telemetryOtelClientCertificate: {
                label: 'OTLP クライアント証明書（telemetry.otel_client_certificate）',
                desc: 'mTLS のクライアント証明書（PEM）のパスです。',
            },
            telemetryOtelClientKey: {
                label: 'OTLP クライアント鍵（telemetry.otel_client_key）',
                desc: 'mTLS のクライアント秘密鍵（PEM）のパスです。',
            },
            telemetryOtelLogsClientCertificate: {
                label: 'OTLP ログのクライアント証明書（telemetry.otel_logs_client_certificate）',
                desc: 'ログの mTLS のクライアント証明書（PEM）のパスです。',
            },
            telemetryOtelLogsClientKey: {
                label: 'OTLP ログのクライアント鍵（telemetry.otel_logs_client_key）',
                desc: 'ログの mTLS のクライアント秘密鍵（PEM）のパスです。',
            },
            telemetryOtelMetricsClientCertificate: {
                label: 'OTLP メトリクスのクライアント証明書（telemetry.otel_metrics_client_certificate）',
                desc: 'メトリクスの mTLS のクライアント証明書（PEM）のパスです。',
            },
            telemetryOtelMetricsClientKey: {
                label: 'OTLP メトリクスのクライアント鍵（telemetry.otel_metrics_client_key）',
                desc: 'メトリクスの mTLS のクライアント秘密鍵（PEM）のパスです。',
            },
            diagnosticsErrorReporting: {
                label: 'エラー報告（diagnostics.error_reporting）',
                desc: 'エラー報告のオンとオフです。未設定はテレメトリの設定に従います。',
            },
            diagnosticsCrashHandler: {
                label: 'クラッシュレポート（diagnostics.crash_handler）',
                desc: '異常終了のレポートを $GROK_HOME/crash へ書き出します。',
            },
            harnessWaitForUploads: {
                label: 'トレース送信の完了待ち（harness.wait_for_uploads）',
                desc: 'ターン終了時のトレースのアップロードが終わるまで、プロンプトの応答を待ちます。',
            },
            feedbackUserCommand: {
                label: 'フィードバック送信者コマンド（feedback.user.command）',
                desc: 'フィードバックの送信者の名前とメールを JSON で出力するシェルコマンドです。',
            },
            feedbackUserEmail: {
                label: 'フィードバック送信者メール（feedback.user.email）',
                desc: 'フィードバックの送信者のメールの取得元です（git_email またはそのままの値）。',
            },
            feedbackUserName: {
                label: 'フィードバック送信者名（feedback.user.name）',
                desc: 'フィードバックの送信者の名前の取得元です（os_user またはそのままの値）。',
            },
        },
    },
    pluginManager: {
        title: 'Grok プラグイン管理',
        description: 'Grok のプラグインを一覧・追加・削除し、マーケットプレイスを管理します。',
        configUnreadable:
            '~/.grok/config.toml を読み込めないか、形式が正しくないため、有効・無効の状態を確認できません。一覧の状態は既定の「有効」で表示しています。',
    },
    nav: {
        group: 'Grok',
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
