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
            '~/.grok 配下の履歴・メモリ・ログ・診断データ・キャッシュ・旧バージョンの実行ファイルと、OS の一時フォルダ（%TEMP% / /tmp）に残った Grok の一時ファイルを削除します。ディスク容量の回収に加え、動作速度の改善にも役立ちます。設定ファイル・認証情報・エージェント・スキル・プラグイン・フック・同梱資産（bundled）・セッションのワークツリーは対象外です。',
        wslSection: 'WSL: {{distro}}',
        deleteSelected: '選択済みを削除',
        cancel: 'キャンセル',
        confirmTitle: 'クリーンアップの確認',
        confirmBody: '選択した {{count}} 件を削除します。元に戻せません。よろしいですか？',
        reclaimable: '{{count}} 件選択中、回収可能 {{size}}',
        noCandidates: 'クリーンアップ対象が見つかりません',
        inUseNotice:
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
            sessions:
                '過去セッションの記録（会話ログ・プラン）。プロジェクト単位で展開して個別削除できます。プロジェクトごとに保存したツールの許可も削除されます。',
            sandboxEvents: 'サンドボックスのイベントログ。',
            logs: '統合ログ・MCP サーバーの標準エラー出力などの診断ログ。',
            debug: 'デバッグログ（GROK_DEBUG_LOG 指定時に出力）。',
            leaderLog: 'リーダープロセスのログ。',
            leaderLogRotated: 'サイズ上限で切り替えられた、リーダープロセスの以前のログ。',
            memtrace: 'プロセスのメモリ使用量の記録（診断用）。',
            crash: '異常終了時のクラッシュレポート。',
            traceExports: 'grok trace export で書き出したトレースのバンドル。',
            marketplaceCache: 'プラグインマーケットプレイスの Git キャッシュ（必要時に再取得されます）。',
            docs: '内蔵ユーザーガイドのキャッシュ（起動時に再生成されます）。',
            memory: 'クロスセッションメモリのデータ。削除すると蓄積した記憶が失われます。',
            memoryV2: 'メモリ v2 のデータ（トピック・観察）。削除すると蓄積した記憶が失われます。',
            plans: '旧バージョンが作成したプランファイル（現行版はセッション内に保存します）。',
            binOldVersions:
                '更新で残った旧バージョンの実行ファイルと、更新時に退避された実行ファイル（*.old）。1個あたり約130MB。現行バージョンと起動用ファイルは保護されます。',
            tempGoalScratch:
                'ゴールモードの検証用作業フォルダ（OS の一時フォルダ直下）。セッションに保存されたゴールの状態と照合し、完了・予算上限で終了したゴールと対応するゴールが無いものは 1 時間以上、それ以外は 7 日以上更新されていないものだけを削除します。使用中の可能性がある新しいものは削除しません。',
            tempSnapshotIndex:
                'ワークツリーのスナップショット作成に使う一時的な Git インデックス（.lock を含む、OS の一時フォルダ直下）。作成から 24 時間以上経過し、24 時間以上更新されていないものだけを削除します。使用中の可能性がある新しいものは削除しません。',
            tempVideoFrames:
                '動画の添付時にフレームを抽出する一時フォルダ（OS の一時フォルダ直下）。作成から 24 時間以上経過し、24 時間以上更新されていないものだけを削除します。使用中の可能性がある新しいものは削除しません。',
            tempEditorFiles:
                '外部エディタでのプロンプト編集やトランスクリプト表示に使う一時ファイル（OS の一時フォルダ直下）。7 日以上更新されていないものだけを削除します。使用中の可能性がある新しいものは削除しません。',
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
                desc: 'セッションをまたぐメモリ機能を有効にします。memory_v2.enabled を設定した場合はそちらが優先されます。既定は無効です。',
            },
            subagentsEnabled: {
                label: 'サブエージェント（subagents.enabled）',
                desc: 'サブエージェント（task ツール）機能のマスタースイッチです。既定は有効です。',
            },
            cliAutoUpdate: {
                label: '自動更新（cli.auto_update）',
                desc: 'CLI の更新確認を有効にします。',
            },
            cliChannel: {
                label: '更新チャンネル（cli.channel）',
                desc: 'リリースチャネル。stable は安定版、alpha は先行版、enterprise は企業向けです。その他の名前は stable と同じ規則で更新されます。',
            },
            cliShowTips: {
                label: '起動時 Tips（cli.show_tips）',
                desc: '起動時のヒント表示を有効にします。',
            },
            cliMinimumVersion: {
                label: '更新の下限バージョン（cli.minimum_version）',
                desc: 'アップデーターがこのバージョンより古い版へ下げないようにします。起動自体は妨げません。',
            },
            cliMaximumVersion: {
                label: '更新の上限バージョン（cli.maximum_version）',
                desc: 'アップデーターがこのバージョンより新しい版を入れないようにします。',
            },
            cliRequiredMinimumVersion: {
                label: '起動可能な下限バージョン（cli.required_minimum_version）',
                desc: 'これより古いバージョンでは起動を拒否します。grok update と grok --version は使えます。',
            },
            cliRequiredMaximumVersion: {
                label: '起動可能な上限バージョン（cli.required_maximum_version）',
                desc: 'これより新しいバージョンでは起動を拒否します。grok update と grok --version は使えます。',
            },
            hintsNewSessionWorktreeMode: {
                label: '/new ワークツリー提案（hints.new_session_worktree_mode）',
                desc: '/new 実行時に git ワークツリーの利用を提案するか。',
            },
            hintsForkWorktreeMode: {
                label: '/fork ワークツリー提案（hints.fork_worktree_mode）',
                desc: '/fork 実行時に git ワークツリーの利用を提案するか。',
            },
            hintsMemoryModalFullscreen: {
                label: 'メモリモーダル全画面（hints.memory_modal_fullscreen）',
                desc: 'メモリモーダルのフルスクリーン状態を記憶します。',
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
            modelsImageDescription: {
                label: '画像説明モデル（models.image_description）',
                desc: '画像の内容を説明するときに使用するモデル ID です。現在の候補とカスタムモデル ID の両方を入力できます。',
            },
            modelsMaxRetries: {
                label: '推論の再試行回数（models.max_retries）',
                desc: 'モデル推論が失敗した場合に行う全モデル共通の最大再試行回数です。',
            },
            modelsInferenceIdleTimeoutSecs: {
                label: '推論アイドルタイムアウト（models.inference_idle_timeout_secs）',
                desc: 'モデル推論のアイドルタイムアウト秒数（全体既定）です。既定は600秒です。',
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
            toolsetAskUserQuestionTimeoutEnabled: {
                label: '質問タイムアウト有効化（toolset.ask_user_question.timeout_enabled）',
                desc: 'ユーザーへの質問にタイムアウトを設けます。既定は有効です。',
            },
            toolsetAskUserQuestionTimeoutSecs: {
                label: '質問タイムアウト秒数（toolset.ask_user_question.timeout_secs）',
                desc: '質問の応答を待つ秒数です。既定は1800秒です。',
            },
            toolsetWebFetchAllowLocal: {
                label: 'ローカル取得許可（toolset.web_fetch.allow_local）',
                desc: 'web_fetch でループバック/ローカルホストへのアクセスを許可します（既定は SSRF 対策で無効）。',
            },
            uiCompactMode: {
                label: 'コンパクト表示（ui.compact_mode）',
                desc: 'TUI の余白や装飾を減らして、狭い端末に多くの内容を表示します。20行以下では自動的に使われます。',
            },
            uiScreenMode: {
                label: '画面モード（ui.screen_mode）',
                desc: 'fullscreen は標準の全画面TUI、minimal は確定済み出力を端末の通常スクロールバックへ残します。',
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
            uiMaxThoughtsWidth: {
                label: '思考表示の最大幅（ui.max_thoughts_width）',
                desc: '思考/推論表示の最大列幅です（40〜500）。既定は120です。',
            },
            uiForkSecondaryModel: {
                label: 'フォーク副モデル（ui.fork_secondary_model）',
                desc: 'フォーク時に副エージェントで使うモデルを指定します。',
            },
            uiYolo: {
                label: 'YOLOモード（ui.yolo）',
                desc: 'すべての操作を自動承認する YOLO モードです。permission_mode=always-approve と等価です。既定は無効です。',
            },
            uiPermissionMode: {
                label: '権限モード（ui.permission_mode）',
                desc: 'ツール実行時の権限モードを選びます。既定は ask です。',
            },
            uiDefaultSelectedPermission: {
                label: '承認の初期選択（ui.default_selected_permission）',
                desc: '最初の承認プロンプトで初期選択される行を指定します。',
            },
            uiPageFlipOnSend: {
                label: '送信時に最上部へ（ui.page_flip_on_send）',
                desc: '送信時に投稿を画面最上部へスナップします。既定は有効です。',
            },
            uiAutoDarkTheme: {
                label: 'OSダーク時テーマ（ui.auto_dark_theme）',
                desc: 'theme=auto のとき OS がダークならこのテーマを使います。既定は groknight です。',
            },
            uiAutoLightTheme: {
                label: 'OSライト時テーマ（ui.auto_light_theme）',
                desc: 'theme=auto のとき OS がライトならこのテーマを使います。既定は grokday です。',
            },
            uiVimMode: {
                label: 'vim操作（ui.vim_mode）',
                desc: 'スクロールバックで vim 風のキー操作を有効にします。既定は無効です。',
            },
            uiHunkTrackerMode: {
                label: '変更ハンク追跡（ui.hunk_tracker_mode）',
                desc: 'ファイル変更ハンクの追跡範囲を選びます。agent_only はエージェントの変更のみ、all_dirty は未コミットの変更すべてを追跡し、off は追跡しません。既定は off です。',
            },
            uiVoiceCaptureMode: {
                label: '音声キャプチャ方式（ui.voice_capture_mode）',
                desc: '音声入力の操作方式（トグル/長押し）を選びます。既定は hold です。',
            },
            uiVoiceKeybindEnabled: {
                label: '音声入力ショートカット（ui.voice_keybind_enabled）',
                desc: 'Ctrl+Space / F8 での音声入力ショートカットを有効にします。無効にしても /voice からは使えます。既定は有効です。',
            },
            uiVoiceSttLanguage: {
                label: '音声入力言語（ui.voice_stt_language）',
                desc: '音声入力（STT）の言語コードです（auto も可）。既定は en です。',
            },
            uiMouseReportingToggle: {
                label: 'マウスレポート切替（ui.mouse_reporting_toggle）',
                desc: 'Ctrl+R でマウスレポートの切り替えを有効にします。',
            },
            uiCancelSubagentsOnTurnCancel: {
                label: 'ターン中断時のサブエージェント（ui.cancel_subagents_on_turn_cancel）',
                desc: 'ターン中断時にサブエージェントを停止するか継続するかを指定します。既定は ask です。',
            },
            uiCursorBlink: {
                label: 'カーソル点滅（ui.cursor_blink）',
                desc: '起動時のカーソル点滅を制御します（設定画面なし・config専用）。',
            },
            uiCombineQueuedPrompts: {
                label: 'キュー投稿を結合（ui.combine_queued_prompts）',
                desc: '連続してキューした投稿を1ターンに結合します。既定は無効です。',
            },
            uiContextualHints: {
                label: '個別ヒント制御（ui.contextual_hints）',
                desc: 'ヒントの種類ごとに表示するかどうかを指定します。',
            },
            uiDisplayRefresh: {
                label: 'ディスプレイ更新（ui.display_refresh）',
                desc: '画面のリフレッシュレートを検出し、描画・スクロールの更新間隔を合わせる設定です。',
            },
            uiNotifications: {
                label: 'ターミナル通知（ui.notifications）',
                desc: 'ターミナル通知の方式、発火条件、対象イベント、フックを設定します。',
            },
            featuresRemoteFetch: {
                label: 'リモート設定取得（features.remote_fetch）',
                desc: 'xAI バックエンドからモデルカタログとリモート設定を取得します。無効時は同梱のモデル情報だけを使います。既定は有効です。',
            },
            featuresImageGen: {
                label: '画像生成（features.image_gen）',
                desc: 'Grok Build の画像生成ツールを有効にします。',
            },
            featuresVideoGen: {
                label: '動画生成（features.video_gen）',
                desc: 'Grok Build の動画生成ツールを有効にします。',
            },
            featuresTelemetry: {
                label: 'テレメトリ（features.telemetry）',
                desc: '製品分析テレメトリの送信モードです。有効・無効のほか、セッション指標だけを送る session_metrics を選べます。',
                choice: {
                    enabled: '有効（true）',
                    sessionMetrics: 'セッション指標のみ（session_metrics）',
                    disabled: '無効（false）',
                    off: 'オフ（off）',
                },
            },
            featuresFeedback: {
                label: 'フィードバック（features.feedback）',
                desc: 'フィードバック機能を有効にします。既定は有効です。',
            },
            featuresCodebaseIndexing: {
                label: 'コードベース索引（features.codebase_indexing）',
                desc: 'コードグラフの索引を作成します。true で Git リポジトリを索引し、include / exclude の glob 配列で対象を絞り込めます。',
            },
            featuresTwoPassCompaction: {
                label: '2パス圧縮（features.two_pass_compaction）',
                desc: '長い会話の前半を、圧縮の前にバックグラウンドで要約しておきます。既定は有効です。',
            },
            workflowsEnabled: {
                label: 'ワークフロー（workflows.enabled）',
                desc: 'バックグラウンドワークフロー（workflow ツール等）を有効にします。既定は有効です。',
            },
            telemetryTraceUpload: {
                label: 'トレース送信（telemetry.trace_upload）',
                desc: '診断用のセッショントレースを xAI へアップロードできるようにします。',
            },
            telemetryMixpanelEnabled: {
                label: 'Mixpanel 送信（telemetry.mixpanel_enabled）',
                desc: 'Mixpanel へのプロダクト分析データ送信を有効にします。',
            },
            telemetryEventsUrl: {
                label: 'イベント送信先（telemetry.events_url）',
                desc: 'イベントを自社コレクターへ送る場合の送信先 URL。未設定なら既定の送信先を使います。',
            },
            telemetryEventsApiKey: {
                label: 'イベント送信の認証キー（telemetry.events_api_key）',
                desc: '自社コレクターが認証を要求する場合のトークン。',
            },
            telemetryOtelEnabled: {
                label: '外部 OTEL 送信（telemetry.otel_enabled）',
                desc: '自社の OTLP コレクターへ使用状況を送る外部 OpenTelemetry 連携を有効にします。',
            },
            telemetryOtelEndpoint: {
                label: 'OTLP エンドポイント（telemetry.otel_endpoint）',
                desc: '外部 OpenTelemetry の送信先ベース URL。',
            },
            telemetryOtelProtocol: {
                label: 'OTLP プロトコル（telemetry.otel_protocol）',
                desc: '外部 OpenTelemetry の送信プロトコル。',
            },
            telemetryOtelMetricsExporter: {
                label: 'OTEL メトリクス出力（telemetry.otel_metrics_exporter）',
                desc: 'メトリクスの出力先。otlp=コレクターへ送信、console=標準出力、none=送信しない。',
            },
            telemetryOtelLogsExporter: {
                label: 'OTEL ログ出力（telemetry.otel_logs_exporter）',
                desc: 'ログの出力先。otlp=コレクターへ送信、console=標準出力、none=送信しない。',
            },
            telemetryOtelLogUserPrompts: {
                label: 'プロンプト本文を送信（telemetry.otel_log_user_prompts）',
                desc: '外部 OpenTelemetry の送信内容に入力プロンプトの本文を含めます。',
            },
            telemetryOtelLogToolDetails: {
                label: 'ツール詳細を送信（telemetry.otel_log_tool_details）',
                desc: '外部 OpenTelemetry の送信内容にツール呼び出しの詳細を含めます。',
            },
            cliUseLeader: {
                label: 'リーダープロセスを使用（cli.use_leader）',
                desc: '複数の Grok Build セッションを調整するリーダープロセスを利用します。',
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
            skillsIgnore: {
                label: 'スキャン除外パス（skills.ignore）',
                desc: 'スキル探索から除外するパスの一覧です。',
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
            modelsPromptSuggestion: {
                label: '入力候補モデル（models.prompt_suggestion）',
                desc: '次の入力候補（ゴーストテキスト）の生成に使うモデル ID です。未設定ならリモート設定、次にセッションのモデルを使います。',
            },
            modelsAgentType: {
                label: '既定のエージェント種別（models.agent_type）',
                desc: 'モデル個別に agent_type を指定していないモデルで使うエージェント定義の種別です。',
            },
            modelsRateLimitRetryThreshold: {
                label: 'レート制限時の試行上限（models.rate_limit_retry_threshold）',
                desc: 'レート制限を受けたリクエストの合計試行回数の上限（全モデル共通の既定）です。max_retries を超えません。設定するとサブエージェントの 429 待機ループは使われません。',
            },
            modelsSubagentRateLimitMaxAttempts: {
                label: 'サブエージェントの 429 待機回数（models.subagent_rate_limit_max_attempts）',
                desc: 'rate_limit_retry_threshold が未設定のとき、サブエージェントが 429 応答で待機・再試行する最大回数です（0〜32、0 で待機しません）。既定は 8 回です。',
            },
            modelProviders: {
                label: 'カスタムプロバイダー定義（model_providers.<name>）',
                desc: '[model.<id>] の model_provider から参照する名前付きのモデルプロバイダーを定義します。',
            },
            agentName: {
                label: 'エージェント定義名（agent.name）',
                desc: 'セッションで使う組み込みまたは検出済みのエージェント定義の名前です。',
            },
            agentDefinition: {
                label: 'エージェント定義ファイル（agent.definition）',
                desc: 'YAML frontmatter を持つエージェント定義 Markdown ファイルのパスです。その定義でセッションを動かします。',
            },
            agentSystemPromptLabel: {
                label: 'システムプロンプトの名乗り（agent.system_prompt_label）',
                desc: 'システムプロンプトで使うアシスタントの名乗りを全体で指定します。モデル個別の指定が優先します。',
            },
            promptSuggestionsMaxOutputTokens: {
                label: '入力候補の出力トークン数（prompt_suggestions.max_output_tokens）',
                desc: '入力候補を生成するときの表示用出力トークン数です（16〜256）。',
            },
            promptSuggestionsTemperature: {
                label: '入力候補の temperature（prompt_suggestions.temperature）',
                desc: '入力候補を生成するときのサンプリング温度です。',
            },
            promptSuggestionsReasoningEffort: {
                label: '入力候補の推論レベル（prompt_suggestions.reasoning_effort）',
                desc: '入力候補を生成するときの推論レベルです。none または未設定では推論を行いません。',
            },
            longReasoningReminderEnabled: {
                label: '長考リマインダー（long_reasoning_reminder.enabled）',
                desc: '1 回のモデル呼び出しで長い推論が行われたとき、ターンの途中で簡潔に考えるよう促すリマインダーを挿入します。既定は無効です。',
            },
            longReasoningReminderTokens: {
                label: '長考と判定するトークン数（long_reasoning_reminder.tokens）',
                desc: '1 回のモデル呼び出しでこの推論トークン数以上を使うと長考とみなします（100〜200000）。既定は 1000 です。',
            },
            longReasoningReminderDelay: {
                label: 'リマインダーまでの呼び出し回数（long_reasoning_reminder.delay）',
                desc: '長考の後、リマインダーを挿入するまでに待つモデル呼び出しの回数です（0〜10）。既定は 1 です。',
            },
            toolsetBashLoginShellCapture: {
                label: 'ログインシェル環境の取り込み（toolset.bash.login_shell_capture）',
                desc: 'bash の実行にログインシェルの環境を取り込みます。無効にすると .bashrc / .zshrc などのエイリアス・関数や PATH・export が反映されない場合があります。',
            },
            toolsetImageGenBaseUrl: {
                label: '画像生成エンドポイント（toolset.image_gen.base_url）',
                desc: 'カスタムモデルエンドポイント利用時に image_gen / image_edit が使う画像 API の URL です。未設定ならこれらのツールは無効のままです。',
            },
            toolsetImageGenEnvKey: {
                label: '画像生成の認証環境変数（toolset.image_gen.env_key）',
                desc: 'toolset.image_gen.base_url へ送るベアラートークンを保持する環境変数名（文字列または配列）です。最初に設定されているものを使います。',
            },
            toolsetVideoGenBaseUrl: {
                label: '動画生成エンドポイント（toolset.video_gen.base_url）',
                desc: 'カスタムモデルエンドポイント利用時に動画ツールが使う動画 API の URL です。未設定なら動画ツールは無効のままです。',
            },
            toolsetVideoGenEnvKey: {
                label: '動画生成の認証環境変数（toolset.video_gen.env_key）',
                desc: 'toolset.video_gen.base_url へ送るベアラートークンを保持する環境変数名（文字列または配列）です。最初に設定されているものを使います。',
            },
            toolsMediaGenMaxParallelImageGenCalls: {
                label: '画像生成の同時呼び出し数（tools.media_gen.max_parallel_image_gen_calls）',
                desc: '1 回のモデルステップで並列に実行する image_gen / image_edit 呼び出しの上限です。',
            },
            toolsMediaGenMaxParallelVideoGenCalls: {
                label: '動画生成の同時呼び出し数（tools.media_gen.max_parallel_video_gen_calls）',
                desc: '1 回のモデルステップで並列に実行する video_gen 呼び出しの上限です。',
            },
            disableWebSearch: {
                label: 'Web 検索ツールを外す（disable_web_search）',
                desc: 'web_search ツールをモデルが使えるツールから外します。',
            },
            storageCleanupTtlDays: {
                label: 'セッション自動削除の日数（storage.cleanup_ttl_days）',
                desc: '使われていないセッションのフォルダをこの日数で削除し、稼働中のセッションからも古いメディアと端末ログを削除します。未設定または 0 で自動削除しません。',
            },
            autoModeEnabled: {
                label: 'Auto 権限モード（auto_mode.enabled）',
                desc: 'ツール実行の可否を自動で判断する Auto 権限モードを使えるようにします。',
            },
            defaultAutoMode: {
                label: '既定で Auto モード（default_auto_mode）',
                desc: 'セッション個別の指定がないとき、新しいセッションを Auto 権限モードで開始します。',
            },
            doomLoopRecoveryEnabled: {
                label: 'ツール呼び出しのループ回復（doom_loop_recovery.enabled）',
                desc: '同じツール呼び出しを繰り返すループを検出したとき、再サンプリングして抜け出します。無効にするとこの回復を行いません。',
            },
            pathNotFoundHints: {
                label: 'パス未検出時のヒント（path_not_found_hints）',
                desc: 'ファイルが見つからないエラーに、作業ディレクトリの案内や似た名前の候補を添えます。',
            },
            harnessDisableWorkspaceTeleport: {
                label: 'ターンごとのスナップショット停止（harness.disable_workspace_teleport）',
                desc: 'ターンごとに作業領域のスナップショットを取る処理を停止します。',
            },
            subagentsLimitBehavior: {
                label: '同時実行上限時の動作（subagents.limit_behavior）',
                desc: 'サブエージェントの同時実行数が上限に達したとき、待機させる（queue）か失敗させる（fail）かを指定します。',
            },
            subagentsMaxConcurrent: {
                label: 'サブエージェント同時実行数（subagents.max_concurrent）',
                desc: '同時に実行できるサブエージェントの上限です。',
            },
            subagentsMaxDepth: {
                label: 'サブエージェントの入れ子の深さ（subagents.max_depth）',
                desc: 'サブエージェントがさらにサブエージェントを起動できる深さの上限です（1 以上）。',
            },
            mcpMaxOutputBytes: {
                label: 'MCP 出力サイズ上限（mcp.max_output_bytes）',
                desc: 'MCP ツールの出力サイズをこのバイト数までに制限します。',
            },
            shellEnvPolicyInherit: {
                label: '引き継ぐ環境変数の範囲（shell_environment_policy.inherit）',
                desc: 'ツールの子プロセスへ引き継ぐ親の環境変数の範囲です。all はすべて、core は PATH・HOME など最小限、none は空から始めます。既定は all です。',
            },
            shellEnvPolicyIgnoreDefaultExcludes: {
                label: '既定の除外を無視（shell_environment_policy.ignore_default_excludes）',
                desc: '名前に KEY / SECRET / TOKEN を含む環境変数を子プロセスから除外する既定の規則を適用しません。既定は無効です。',
            },
            shellEnvPolicyExclude: {
                label: '除外する環境変数（shell_environment_policy.exclude）',
                desc: 'ツールの子プロセスから取り除く環境変数名のパターンの配列です。',
            },
            shellEnvPolicyIncludeOnly: {
                label: '許可する環境変数（shell_environment_policy.include_only）',
                desc: '指定すると、ツールの子プロセスはこのパターンに一致する環境変数だけを受け取ります。',
            },
            shellEnvPolicySet: {
                label: '設定する環境変数（shell_environment_policy.set）',
                desc: 'ツールの子プロセスへ設定する環境変数の値のマップです。',
            },
            toolsetWebSearchAllowedDomains: {
                label: 'Web 検索の許可ドメイン（toolset.web_search.allowed_domains）',
                desc: 'web_search の検索対象に含めるドメインの配列です。',
            },
            toolsetWebSearchExcludedDomains: {
                label: 'Web 検索の除外ドメイン（toolset.web_search.excluded_domains）',
                desc: 'web_search の検索対象から除外するドメインの配列です。',
            },
            disabledMcpServers: {
                label: '無効 MCP サーバー（disabled_mcp_servers）',
                desc: '[mcp_servers] の定義を残したまま起動しない MCP サーバー名の配列です。',
            },
            disabledMcpTools: {
                label: '無効 MCP ツール（disabled_mcp_tools）',
                desc: 'MCP サーバー名ごとに、使わせないツール名を並べたマップです。',
            },
            hooks: {
                label: 'フック定義（hooks.<event>）',
                desc: 'PreToolUse や Stop などのライフサイクルイベントごとに、マッチャーと実行するコマンドを定義します。',
            },
            memoryV2Enabled: {
                label: 'メモリ v2（memory_v2.enabled）',
                desc: 'メモリ機能（v2）のオン/オフです。設定すると memory.enabled より優先されます。既定は無効です。',
            },
            memoryV2CompactIndexEnabled: {
                label: 'メモリ索引の簡略表示（memory_v2.compact_index_enabled）',
                desc: 'システムプロンプトへ注入するメモリ索引をタイトルだけにして、より多くのトピックを収めます。',
            },
            memoryV2BatchDreamEnabled: {
                label: 'バッチ Dream（memory_v2.batch_dream_enabled）',
                desc: 'メモリの整理（Dream）を、トピック一覧全体を参照しながらノートをまとめて処理するバッチ方式で実行します。',
            },
            memoryV2BatchDreamMaxRunSecs: {
                label: 'バッチ Dream の最大実行時間（memory_v2.batch_dream_max_run_secs）',
                desc: '1 回のバッチ Dream の実行時間の上限（秒、60〜3600）です。処理しきれなかったノートは次回に持ち越されます。',
            },
            memoryV2BatchDreamMaxCallsPerBatch: {
                label: 'バッチあたりのモデル呼び出し数（memory_v2.batch_dream_max_calls_per_batch）',
                desc: 'バッチ Dream の 1 バッチで行うモデル呼び出しの上限です（2〜16）。',
            },
            memoryV2BatchDreamMaxBatchNoteBytes: {
                label: 'バッチあたりのノート量（memory_v2.batch_dream_max_batch_note_bytes）',
                desc: 'バッチ Dream の 1 バッチで扱うノートのバイト数の上限です（16384〜262144）。',
            },
            memoryV2ArchivedRetentionDays: {
                label: 'アーカイブの保持日数（memory_v2.archived_retention_days）',
                desc: 'アーカイブしたメモリの観察ファイルを保持する日数です。既定は 30 日です。',
            },
            memoryV2JobRetentionDays: {
                label: 'キャプチャジョブの保持日数（memory_v2.job_retention_days）',
                desc: '完了したメモリのキャプチャジョブ情報を保持する日数です。既定は 14 日です。',
            },
            memoryV2DailyTokenCap: {
                label: 'メモリの 1 日あたりトークン上限（memory_v2.daily_token_cap）',
                desc: 'メモリ処理が直近 24 時間に使えるモデルトークン数の上限です（1000000 以上）。超えるとキャプチャを一時停止します。',
            },
            cliNpmRegistry: {
                label: 'npm レジストリ（cli.npm_registry）',
                desc: '自動更新が使用する npm レジストリの URL です。',
            },
            cliWorktreeType: {
                label: 'ワークツリー作成方式（cli.worktree_type）',
                desc: 'ワークツリーの作成方式（linked / standalone / git）です。grove / copy などの綴りはワークツリーの Grove 設定として扱われます。',
            },
            cliSessionPickerGrouped: {
                label: 'セッションをリポジトリ別に表示（cli.session_picker_grouped）',
                desc: 'セッション選択画面と CLI の一覧で、セッションをリポジトリごとにまとめて表示します。',
            },
            cliSessionRegistry: {
                label: 'セッションレジストリ参加（cli.session_registry）',
                desc: 'プロセスをまたいでセッションを共有するセッションレジストリに参加します。',
            },
            cliGrove: {
                label: 'Grove 一括有効化（cli.grove）',
                desc: 'grok clone とセッション（-w）のワークツリーの両方で Grove を使います。真偽値または Grove の種類名を指定します。',
            },
            cliGroveWorktree: {
                label: 'ワークツリーの Grove（cli.grove_worktree）',
                desc: 'セッション（-w）のワークツリーを Grove とコピーのどちらで作るかを、真偽値または Grove の種類名で指定します。',
            },
            dashboardEnabled: {
                label: 'エージェントダッシュボード（dashboard.enabled）',
                desc: 'エージェントダッシュボードを表示します。',
            },
            dashboardGrouping: {
                label: 'ダッシュボードのグループ化（dashboard.grouping）',
                desc: 'ダッシュボードの行を状態（state）とディレクトリ（directory）のどちらでまとめるかを指定します。',
            },
            uiTimestamps: {
                label: '時刻表示（ui.timestamps）',
                desc: 'メッセージに時刻を表示する範囲です。off は表示せず、minimal は自分の入力と各ターンの所要時間の行のみ、on はすべてのメッセージに表示します。',
            },
            uiToolCallDensity: {
                label: 'ツール呼び出しの表示量（ui.tool_call_density）',
                desc: 'トランスクリプトに表示するツール呼び出しの詳しさです。detailed は編集差分やシェル出力まで表示し、compact 系ほど要約行へ折りたたみます。',
            },
            uiConfirmBeforeRewind: {
                label: '巻き戻し前に確認（ui.confirm_before_rewind）',
                desc: '会話履歴を巻き戻す前に確認します。既定は有効です。',
            },
            uiDashboardPreview: {
                label: 'ダッシュボードのプレビュー（ui.dashboard_preview）',
                desc: 'ダッシュボードに、選択中セッションのプレビューと返信パネルを表示します。既定は有効です。',
            },
            uiFollowUpBehavior: {
                label: '実行中の追加入力（ui.follow_up_behavior）',
                desc: 'ターンの実行中に送った追加入力を、キューに積む（queue）か、次の安全な時点で割り込ませる（steer）かを指定します。既定は queue です。',
            },
            uiStatusLineType: {
                label: 'ステータスライン（ui.status_line.type）',
                desc: 'ショートカットバーの上にステータスライン行を表示します。command は ui.status_line.command の出力を表示します。既定は disabled です。',
            },
            uiStatusLineCommand: {
                label: 'ステータスラインのコマンド（ui.status_line.command）',
                desc: 'ステータスラインに表示する内容を出力するスクリプトです。',
            },
            voiceLanguage: {
                label: '音声入力の言語（voice.language）',
                desc: '音声入力（STT）の言語コードまたは auto です。ui.voice_stt_language を設定した場合はそちらが優先されます。',
            },
            voiceApiBase: {
                label: '音声入力 API（voice.api_base）',
                desc: '音声入力（STT）に使う HTTPS の API ルートです。未設定なら xAI API のベース URL を使います。',
            },
            voiceSampleRate: {
                label: '音声のサンプリングレート（voice.sample_rate）',
                desc: '音声入力のキャプチャに使うサンプリングレート（Hz）です。',
            },
            worktreeAutoGc: {
                label: 'ワークツリーの自動削除（worktree.auto_gc）',
                desc: 'セッション用ワークツリーを自動で片付ける条件を定義します。',
            },
            versionOverrides: {
                label: 'バージョン別の設定（version_overrides）',
                desc: 'CLI のバージョンごとに適用する設定の差分を定義します。',
            },
            featuresAskUserQuestion: {
                label: '質問ツール（features.ask_user_question）',
                desc: 'ask_user_question ツールで、モデルがユーザーへ質問できるようにします。既定は有効です。',
            },
            featuresBackendTools: {
                label: 'サーバー側検索（features.backend_tools）',
                desc: 'web_search と x_search をサーバー側で実行します。既定は有効です。',
            },
            featuresImageGenModelOverride: {
                label: '画像生成モデル（features.image_gen_model_override）',
                desc: 'image_gen で使う Imagine モデル ID です。未設定ならリモート設定の既定を使います。',
            },
            featuresImageEditModelOverride: {
                label: '画像編集モデル（features.image_edit_model_override）',
                desc: 'image_edit で使う Imagine モデル ID です。',
            },
            featuresVoiceMode: {
                label: '音声入力（features.voice_mode）',
                desc: '音声入力（音声からテキストへの変換）を有効にします。既定は有効です。',
            },
            featuresFeedbackTraceCard: {
                label: 'フィードバック時のトレース送信確認（features.feedback_trace_card）',
                desc: '/feedback の後に、トレースのアップロードへの同意を確認します。既定は無効です。',
            },
            featuresCompactionMode: {
                label: '圧縮方式（features.compaction_mode）',
                desc: '会話の圧縮方式（summary / transcript / segments）を指定します。',
            },
            featuresCompactionDetail: {
                label: '圧縮の詳細度（features.compaction_detail）',
                desc: 'segments 方式の圧縮で原文を残す度合い（none / minimal / balanced / verbose）です。',
            },
            featuresCompactionToolChoice: {
                label: '圧縮時のツール選択（features.compaction_tool_choice）',
                desc: '圧縮処理のモデル呼び出しで使うツール選択のヒントです。',
            },
            featuresCompactionVerbatimInput: {
                label: '原文から要約（features.compaction_verbatim_input）',
                desc: '短縮したコピーではなく、会話の原文を要約します。既定は有効です。',
            },
            featuresSessionRecap: {
                label: 'セッションの振り返り（features.session_recap）',
                desc: '/recap と、離席から戻ったときの自動の振り返りを有効にします。既定は有効です。',
            },
            featuresSessionSearch: {
                label: 'セッション検索（features.session_search）',
                desc: 'SQLite によるセッション検索インデックスを有効にします。既定は有効です。',
            },
            featuresTurnSummary: {
                label: 'ターン要約（features.turn_summary）',
                desc: 'エージェントダッシュボードにターンごとの要約を表示します。既定は有効です。',
            },
            featuresTitleRefresh: {
                label: 'タイトルの自動更新（features.title_refresh）',
                desc: 'セッションの序盤にセッションタイトルを自動で更新します。',
            },
            featuresCancelRewind: {
                label: 'キャンセル時の入力復元（features.cancel_rewind）',
                desc: 'ターンの最初の動作より前に Ctrl+C を押すと、入力を元に戻します。既定は有効です。',
            },
            featuresAutoWake: {
                label: '自動再開（features.auto_wake）',
                desc: 'バックグラウンドタスクやサブエージェントが終わると、すぐに会話を続けます。既定は有効です。',
            },
            featuresActiveAgentMessages: {
                label: '実行中エージェントへの追加指示（features.active_agent_messages）',
                desc: 'モデルが作成した追加の指示を、実行中の配下のエージェントへ送れるようにします。既定は無効です。',
            },
            featuresSubagentBundle: {
                label: 'スキルバンドルの読み込み（features.subagent_bundle）',
                desc: 'デーモン経路の組み込みスキルを、バージョン管理されたスキルバンドルから読み込みます。起動時に読み込まれます。既定は有効です。',
            },
            featuresSubagentModelInheritance: {
                label: 'サブエージェントのモデル継承（features.subagent_model_inheritance）',
                desc: '選べるモデルがすべて xAI のモデルのとき、サブエージェントの model 引数を隠して親のモデルを継承させます。セッション開始時に読み込まれます。既定は無効です。',
            },
            featuresSubagentWorktreeSnapshot: {
                label: 'サブエージェントの作業保存（features.subagent_worktree_snapshot）',
                desc: '完了したサブエージェントの作業コピーを git の ref としてリポジトリへ保存し、再開時に復元します。既定は無効です。',
            },
            featuresWorkflowConversion: {
                label: 'ワークフローの変換（features.workflow_conversion）',
                desc: 'デーモン経路で旧形式（.rhai）のワークフローを名前で実行したとき、JavaScript モジュールへの変換をモデルに依頼してから実行します。既定は有効です。',
            },
            featuresSupportPermission: {
                label: '権限確認（features.support_permission）',
                desc: 'ツールの実行について、エージェントが権限を確認できるようにします。',
            },
            featuresRememberMode: {
                label: '権限モードを記憶（features.remember_mode）',
                desc: '最後に使った権限モードをセッションをまたいで記憶します。既定は無効です。',
            },
            featuresNonGitWarning: {
                label: 'Git 外での警告（features.non_git_warning）',
                desc: 'Git リポジトリの外で起動したとき、続行前に警告を表示します。',
            },
            featuresMcpAutoRestart: {
                label: 'MCP の自動再起動（features.mcp_auto_restart）',
                desc: '通信が途切れた stdio の MCP サーバーを自動で再起動します。既定は有効です。',
            },
            featuresMcpLivenessWatchers: {
                label: 'MCP の死活監視（features.mcp_liveness_watchers）',
                desc: 'MCP の接続を定期的に確認し、サーバーの状態変化を通知します。',
            },
            featuresMcpPushServerStatus: {
                label: 'MCP 状態の受信（features.mcp_push_server_status）',
                desc: 'TUI が MCP サーバーの状態変化の通知を受け取ります。',
            },
            featuresMcpRecursiveConfigWatch: {
                label: 'プロジェクト MCP 設定の監視（features.mcp_recursive_config_watch）',
                desc: '作業ディレクトリと .grok ディレクトリにある MCP 設定の変更を監視します（サブディレクトリは監視しません）。',
            },
            featuresDock: {
                label: 'パネルドック（features.dock）',
                desc: 'サブエージェント・タスク・ウォッチャー・キューをまとめたパネルを入力欄の上に表示します。既定は無効です。',
            },
            featuresTerminalTheme: {
                label: 'terminal テーマ（features.terminal_theme）',
                desc: '端末自身の配色を使う terminal カラーテーマを選べるようにします。既定は無効です。',
            },
            featuresFileAcceleration: {
                label: 'ファイルアクセラレーター（features.file_acceleration）',
                desc: 'ローカルセッションのファイルシステムを、インストール済みのファイルアクセラレーターに任せます。既定は無効です。',
            },
            fileAccelerationRoutes: {
                label: 'ファイルアクセラレーターの経路（file_acceleration.routes）',
                desc: 'インストール済みのファイルアクセラレーターへそのまま渡す経路の上書き指定です。',
            },
            featuresCampaigns: {
                label: 'キャンペーン設定の適用（features.campaigns）',
                desc: 'リモートから配信されるキャンペーンの設定パッチを適用します。',
            },
            goalEnabled: {
                label: '/goal（goal.enabled）',
                desc: '/goal コマンドを有効にします。既定は有効です。',
            },
            relayEnabled: {
                label: 'セッションの中継同期（relay.enabled）',
                desc: 'セッションの中継（relay）同期を有効にします。',
            },
            compatCodexSkills: {
                label: 'Codexスキルを検出（compat.codex.skills）',
                desc: 'Codex のスキルディレクトリを検索し、Grok Build から利用できるようにします。既定は有効です。',
            },
            compatCodexHooks: {
                label: 'Codexフックを検出（compat.codex.hooks）',
                desc: 'Codex のフック設定を検索し、互換フックとして読み込みます。既定は有効です。',
            },
            marketplaceRequireSha: {
                label: 'コミット SHA の固定を必須化（marketplace.require_sha）',
                desc: 'リモートのプラグインのインストールと更新に、完全なコミット SHA の固定を必須にします。他の設定や環境変数で有効になっている場合、この設定で無効にはできません。',
            },
            marketplaceSources: {
                label: 'マーケットプレイスソース（marketplace.sources）',
                desc: 'プラグインのマーケットプレイスとして登録する Git リポジトリまたはローカルディレクトリの一覧です。',
            },
            pathsExtraRuleDirs: {
                label: '追加ルールディレクトリ（paths.extra_rule_dirs）',
                desc: 'ホームのルールの後に読み込むルールディレクトリ（各ディレクトリに *.md を置く）の配列です。',
            },
            cursorWorkerAutoStart: {
                label: 'Cursor ワーカー自動起動（cursor_worker.auto_start）',
                desc: '起動時にリーダープロセスを Cursor のプライベートワーカーとして登録し、Cursor Cloud Agents からこのマシンで作業できるようにします。既定は無効です。',
            },
            cursorWorkerName: {
                label: 'Cursor ワーカー名（cursor_worker.name）',
                desc: 'Cursor に表示するワーカー名です。未設定ならマシンのホスト名を使います。',
            },
            cursorWorkerWorkerDirs: {
                label: 'Cursor ワーカーの対象ディレクトリ（cursor_worker.worker_dirs）',
                desc: 'Cursor Cloud Agents に提供するリポジトリディレクトリの絶対パスの配列です。先頭が作業ディレクトリとして登録されます。',
            },
            cursorWorkerMaxAgents: {
                label: 'Cursor ワーカー同時実行数（cursor_worker.max_agents）',
                desc: '同時に受け付ける Cloud Agents の上限です。上限を超えた依頼は待たずに失敗します。未設定なら上限はありません。',
            },
            cursorWorkerAnyRepo: {
                label: '任意リポジトリの受け付け（cursor_worker.any_repo）',
                desc: 'Cloud Agent が持ち込んだ任意のリポジトリを複製して作業する受け口も登録します。既定は無効です。',
            },
            cursorWorkerHubUrl: {
                label: 'Computer Hub の URL（cursor_worker.hub_url）',
                desc: 'Cursor のセッション取得に使う Computer Hub のベース URL です。未設定ならリーダーの Hub URL から導出します。',
            },
            cursorWorkerRewriteShellOutput: {
                label: 'シェル出力のパス書き換え（cursor_worker.rewrite_shell_output）',
                desc: 'シェル出力に含まれるワークツリーやスナップショットのパスを、登録ディレクトリのパスへ書き換えます。既定は有効です。',
            },
            telemetryOtelLogsEndpoint: {
                label: 'OTLP ログ送信先（telemetry.otel_logs_endpoint）',
                desc: 'ログの送信先の OTLP エンドポイントです（指定どおりに使われます）。',
            },
            telemetryOtelMetricsEndpoint: {
                label: 'OTLP メトリクス送信先（telemetry.otel_metrics_endpoint）',
                desc: 'メトリクスの送信先の OTLP エンドポイントです（指定どおりに使われます）。',
            },
            telemetryOtelLogsProtocol: {
                label: 'OTLP ログのプロトコル（telemetry.otel_logs_protocol）',
                desc: 'ログの送信に使う OTLP の通信プロトコルです。',
            },
            telemetryOtelMetricsProtocol: {
                label: 'OTLP メトリクスのプロトコル（telemetry.otel_metrics_protocol）',
                desc: 'メトリクスの送信に使う OTLP の通信プロトコルです。',
            },
            telemetryOtelTimeout: {
                label: 'OTLP 送信タイムアウト（telemetry.otel_timeout）',
                desc: '外部 OpenTelemetry への送信のタイムアウト（ミリ秒）です。',
            },
            telemetryOtelMetricExportInterval: {
                label: 'メトリクス送信間隔（telemetry.otel_metric_export_interval）',
                desc: 'メトリクスを送信する間隔（ミリ秒）です。',
            },
            telemetryOtelMetricsIncludeSessionId: {
                label: 'メトリクスにセッション ID（telemetry.otel_metrics_include_session_id）',
                desc: 'メトリクスにセッション ID の属性を付けます。',
            },
            telemetryOtelLogAssistantResponses: {
                label: '応答本文を送信（telemetry.otel_log_assistant_responses）',
                desc: '外部 OpenTelemetry の送信内容にアシスタントの応答本文を含めます。未設定ならプロンプト本文の設定に従います。',
            },
            telemetryOtelLogToolContent: {
                label: 'ツールの入出力本文を送信（telemetry.otel_log_tool_content）',
                desc: '外部 OpenTelemetry の送信内容に、ツールの入力・出力・コマンド全文・エラーメッセージを含めます。既定は無効です。',
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
                desc: 'mTLS で使うクライアント証明書（PEM）のパスです。',
            },
            telemetryOtelClientKey: {
                label: 'OTLP クライアント鍵（telemetry.otel_client_key）',
                desc: 'mTLS で使うクライアント秘密鍵（PEM）のパスです。',
            },
            telemetryOtelLogsClientCertificate: {
                label: 'OTLP ログのクライアント証明書（telemetry.otel_logs_client_certificate）',
                desc: 'ログの送信の mTLS で使うクライアント証明書（PEM）のパスです。',
            },
            telemetryOtelLogsClientKey: {
                label: 'OTLP ログのクライアント鍵（telemetry.otel_logs_client_key）',
                desc: 'ログの送信の mTLS で使うクライアント秘密鍵（PEM）のパスです。',
            },
            telemetryOtelMetricsClientCertificate: {
                label: 'OTLP メトリクスのクライアント証明書（telemetry.otel_metrics_client_certificate）',
                desc: 'メトリクスの送信の mTLS で使うクライアント証明書（PEM）のパスです。',
            },
            telemetryOtelMetricsClientKey: {
                label: 'OTLP メトリクスのクライアント鍵（telemetry.otel_metrics_client_key）',
                desc: 'メトリクスの送信の mTLS で使うクライアント秘密鍵（PEM）のパスです。',
            },
            diagnosticsCrashHandler: {
                label: 'クラッシュレポート（diagnostics.crash_handler）',
                desc: '異常終了時に ~/.grok/crash へクラッシュレポートを書き出します。',
            },
            harnessWaitForUploads: {
                label: 'トレース送信の完了待ち（harness.wait_for_uploads）',
                desc: 'ターン終了時のトレースのアップロードが終わるまで、プロンプトの応答を返すのを待ちます。既定は無効です。',
            },
            feedbackUserCommand: {
                label: 'フィードバック送信者コマンド（feedback.user.command）',
                desc: 'フィードバック送信時の名前とメールアドレスを JSON で出力するシェルコマンドです。',
            },
            feedbackUserEmail: {
                label: 'フィードバック送信者メール（feedback.user.email）',
                desc: 'フィードバック送信者のメールアドレスの取得元（git_email またはそのままの値）の配列です。',
            },
            feedbackUserName: {
                label: 'フィードバック送信者名（feedback.user.name）',
                desc: 'フィードバック送信者の名前の取得元（os_user またはそのままの値）の配列です。',
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
