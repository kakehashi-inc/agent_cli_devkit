export default {
    claudeDesktop: {
        title: 'Claude Desktop MCP 管理',
        notFound: 'Claude Desktopの設定ファイルが見つかりません',
        notFoundDescription: 'Claude Desktopがインストールされているか確認してください。',
        standardConfigPath: '標準',
        disabledConfigPath: '無効',
        restart: 'Claude Desktop起動/再起動',
        restartSuccess: 'Claude Desktopを再起動しました',
        restartError: 'Claude Desktopの再起動に失敗しました',
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
    claudeCode: {
        title: 'Claude Code MCP 管理',
        wslSection: 'WSL: {{distro}}',
        notFound: 'この環境には ~/.claude.json が見つかりません',
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
        title: 'Claude Code クリーンアップ',
        description:
            '~/.claude 配下の履歴・キャッシュ・一時ファイル・ログを削除します。ディスク容量の回収に加え、動作速度の改善や、一時的な内容がメモリーに残って挙動が不可解になった状態の解消にも役立ちます。',
        wslSection: 'WSL: {{distro}}',
        deleteSelected: '選択済みを削除',
        cancel: 'キャンセル',
        confirmTitle: 'クリーンアップの確認',
        confirmBody: '選択した {{count}} 件を削除します。元に戻せません。よろしいですか？',
        reclaimable: '{{count}} 件選択中、回収可能 {{size}}',
        noCandidates: 'クリーンアップ対象が見つかりません',
        inUseWarning:
            '実行中の Claude Code セッションがあると一部ディレクトリの削除に失敗することがあります。削除前にセッションを終了してください。',
        deleteSuccess: 'クリーンアップが完了しました',
        deletePartial: '使用中のファイルがあったため、一部をスキップしました',
        deleteError: '一部の項目の削除に失敗しました',
        columnName: 'ディレクトリ',
        columnDescription: '説明',
        columnFiles: 'ファイル数',
        columnSize: 'サイズ',
        dir: {
            projects: 'projects',
            plans: 'plans',
            fileHistory: 'file-history',
            history: 'history.jsonl',
            shellSnapshots: 'shell-snapshots',
            cache: 'cache',
            debug: 'debug',
            sessions: 'sessions',
            sessionEnv: 'session-env',
            tasks: 'tasks',
            backups: 'backups',
        },
        desc: {
            projects: 'プロジェクトごとの会話履歴・メモリー（過去セッションの記録）。',
            plans: 'プランモードで作成したプランファイル（過去の計画の記録）。',
            fileHistory: 'Claude Code が編集したファイルの履歴・差分。元に戻す用の保存データ。',
            history: '入力したプロンプトの履歴（↑キーで遡れる入力履歴）。',
            shellSnapshots: 'コマンド実行のために取得したシェル環境のスナップショット。',
            cache: 'changelog や各種データの一時キャッシュ。',
            debug: '不具合調査用のデバッグログ。',
            sessions: '実行中・過去セッションの状態ファイル。',
            sessionEnv: 'セッションごとに保存される環境変数などのデータ。',
            tasks: 'バックグラウンドタスクの状態・一時ファイル。',
            backups: '自動保存された旧 ~/.claude.json のバックアップ。',
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
        title: 'Claude Code Agent・Skill管理',
        description:
            'Claude Code のエージェント・スキルを一覧表示し、選択したものを ZIP でまとめてダウンロード、または ZIP をアップロードして取り込みます。',
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
            'Anthropic 公式リポジトリ（anthropics/skills）のスキルです。取り込むスキルを選択してください。同名の既存スキルは置き換えられます。',
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
            'agent-into-skill':
                'このアーカイブはエージェント（.md ファイル）のようです。スキルタブには取り込めません。エージェントタブを使用してください。',
            'skill-into-agent':
                'このアーカイブはスキル（SKILL.md を含むフォルダ）のようです。エージェントタブには取り込めません。スキルタブを使用してください。',
            'no-md': 'このアーカイブには .md ファイルが含まれておらず、エージェントとして取り込めません。',
        },
    },
    settings: {
        title: 'Claude Code 設定',
        description: '~/.claude/settings.json の設定項目をテーブルで編集、または直接編集します。',
        wslSection: 'WSL: {{distro}}',
        colItem: '項目',
        colValue: '値',
        directEdit: '直接編集',
        directEditTitle: 'settings.json を直接編集',
        directEditDesc:
            'settings.json の内容をそのまま編集します。保存するとファイル全体がこの内容で上書きされます。JSON として正しい内容にしてください。',
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
        invalidJson: 'JSON の構文が正しくありません',
        invalidExisting: '既存の settings.json が壊れているため保存できません。直接編集で修正してください。',
        unavailable: 'この環境の設定にはアクセスできません。',
        group: {
            model: 'モデル・思考',
            display: '表示・通知',
            behavior: '動作・データ',
            agent: 'エージェント',
        },
        field: {
            model: {
                label: 'モデル（model）',
                desc: '既定モデルの別名または正式モデル ID。候補は現在の例で、候補外の ID も入力できます。',
            },
            language: {
                label: '応答言語（language）',
                desc: '応答や音声入力の優先言語。任意の言語名を入力できます（例: japanese, english, spanish）。空欄で未設定。',
            },
            outputStyle: {
                label: '出力スタイル（outputStyle）',
                desc: '応答の出力スタイル。組み込み（default / Explanatory / Learning）のほかカスタムも指定可。空欄で未設定。',
            },
            effortLevel: {
                label: '思考の労力（effortLevel）',
                desc: '思考にかける労力。高いほど品質が上がりコストも増えます。',
            },
            advisorModel: {
                label: 'アドバイザーモデル（advisorModel）',
                desc: 'アドバイザーツールが使用するモデルの別名または正式モデル ID。',
            },
            alwaysThinkingEnabled: {
                label: '常に拡張思考（alwaysThinkingEnabled）',
                desc: 'すべてのセッションで拡張思考を既定で有効にします。',
            },
            autoMemoryEnabled: {
                label: '自動メモリ（autoMemoryEnabled）',
                desc: '自動メモリの読み書きを有効にします。',
            },
            editorMode: {
                label: '入力モード（editorMode）',
                desc: '入力欄のキーバインド。',
            },
            preferredNotifChannel: {
                label: '通知方法（preferredNotifChannel）',
                desc: '通知の届け方。',
            },
            spinnerTipsEnabled: {
                label: 'スピナーTips（spinnerTipsEnabled）',
                desc: '処理中のスピナーに Tips を表示します。',
            },
            showTurnDuration: {
                label: 'ターン時間表示（showTurnDuration）',
                desc: '応答後に処理時間を表示します。',
            },
            autoScrollEnabled: {
                label: '自動スクロール（autoScrollEnabled）',
                desc: '全画面表示で新しい出力に追従します。',
            },
            awaySummaryEnabled: {
                label: '離席要約（awaySummaryEnabled）',
                desc: '少し離席して戻ったときに要約を表示します。',
            },
            autoUpdatesChannel: {
                label: '更新チャンネル（autoUpdatesChannel）',
                desc: '自動更新のチャンネル。latest は最新（既定）、stable は約1週間遅れの安定版。',
            },
            cleanupPeriodDays: {
                label: 'セッション保持日数（cleanupPeriodDays）',
                desc: 'この日数より古いセッションファイルを削除します（最小 1、未設定で既定 30）。',
            },
            autoCompactEnabled: {
                label: '自動コンパクト（autoCompactEnabled）',
                desc: 'コンテキスト上限が近づいたとき会話を自動で要約圧縮します。',
            },
            fileCheckpointingEnabled: {
                label: 'ファイルチェックポイント（fileCheckpointingEnabled）',
                desc: '/rewind で戻せるようファイル変更のスナップショットを保存します。',
            },
            agentTeams: {
                label: 'エージェントチーム（CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS）',
                desc: '実験的なエージェントチーム機能を有効にします。ONで env に "1" を設定、OFFで設定を削除します。',
            },
            teammateMode: {
                label: 'チームメイトモード（teammateMode）',
                desc: 'チームメイトの表示モード。in-process=メイン端末内、auto=環境に応じて分割、tmux / iterm2=分割ペイン。既定は in-process。',
            },
            agentPushNotifEnabled: {
                label: 'エージェント通知（agentPushNotifEnabled）',
                desc: 'Remote Control 接続中、長いタスクの完了などをスマートフォンへプッシュ通知します。既定は無効です。',
            },
            fastMode: {
                label: '高速モード（fastMode）',
                desc: '利用可能なセッションを高速モードで開始します。/fast で有効にした設定もここへ保存されます。',
            },
            fastModePerSessionOptIn: {
                label: '高速モードを毎回選択（fastModePerSessionOptIn）',
                desc: '高速モードをセッション間で引き継がず、各セッションで /fast による明示的な有効化を求めます。',
            },
            inputNeededNotifEnabled: {
                label: '入力待ち通知（inputNeededNotifEnabled）',
                desc: 'Remote Control 接続中、権限確認や質問への入力が必要になったときスマートフォンへ通知します。既定は無効です。',
            },
            agent: {
                label: '既定エージェント（agent）',
                desc: 'メインスレッドを指定した名前のサブエージェントとして実行し、そのプロンプト・ツール制限・モデルを適用します。',
            },
            axScreenReader: {
                label: 'スクリーンリーダー表示（axScreenReader）',
                desc: '装飾枠やアニメーションを省いた平坦なテキスト表示にして、スクリーンリーダーで読みやすくします。',
            },
            prefersReducedMotion: {
                label: '動きを減らす（prefersReducedMotion）',
                desc: 'スピナー、シマー、点滅などのUIアニメーションを減らすか無効にします。',
            },
            showThinkingSummaries: {
                label: '思考要約を表示（showThinkingSummaries）',
                desc: '対話セッションで拡張思考の要約を表示できるようにします。生成量や料金自体は変わりません。既定は無効です。',
            },
            syntaxHighlightingDisabled: {
                label: '構文強調を無効化（syntaxHighlightingDisabled）',
                desc: '差分、コードブロック、ファイルプレビューのシンタックスハイライトを無効にします。',
            },
            terminalProgressBarEnabled: {
                label: '端末プログレスバー（terminalProgressBarEnabled）',
                desc: '対応端末のタブやウィンドウに進捗バーを表示します。既定は有効です。',
            },
            theme: {
                label: 'カラーテーマ（theme）',
                desc: '組み込みテーマまたは custom:<slug> 形式のカスタムテーマを選びます。候補外の保存済みテーマも保持できます。',
            },
            tui: {
                label: 'TUIレンダラー（tui）',
                desc: 'default は通常画面、fullscreen は代替画面を使うちらつきの少ない全画面レンダラーです。',
            },
            verbose: {
                label: '詳細出力（verbose）',
                desc: '切り詰めた要約ではなく、ツール出力を完全に表示します。既定は無効です。',
            },
            viewMode: {
                label: '起動時の表示モード（viewMode）',
                desc: '起動時のトランスクリプト表示を default、verbose、focus から選びます。',
            },
            wheelScrollAccelerationEnabled: {
                label: 'ホイール加速（wheelScrollAccelerationEnabled）',
                desc: '全画面表示で速くホイールを回したときスクロール量を加速します。既定は有効です。',
            },
            autoMemoryDirectory: {
                label: '自動メモリ保存先（autoMemoryDirectory）',
                desc: '自動メモリの保存先を絶対パスまたは ~/ で始まるパスに変更します。',
            },
            askUserQuestionTimeout: {
                label: '質問の自動続行時間（askUserQuestionTimeout）',
                desc: 'AskUserQuestion が未回答のまま自動続行するまでの時間です。never は回答まで待機します。',
            },
            defaultShell: {
                label: '既定シェル（defaultShell）',
                desc: '入力欄で ! コマンドを実行するときのシェルを bash または powershell から選びます。',
            },
            feedbackSurveyRate: {
                label: 'フィードバック調査率（feedbackSurveyRate）',
                desc: '条件を満たしたセッションで品質アンケートを表示する確率を 0～1 で指定します。0 で完全に抑止します。',
            },
            includeGitInstructions: {
                label: 'Git指示を含める（includeGitInstructions）',
                desc: '組み込みのコミット・PR手順と git status のスナップショットをシステムプロンプトへ含めます。既定は有効です。',
            },
            minimumVersion: {
                label: '更新の最低バージョン（minimumVersion）',
                desc: '自動更新や claude update がこの値より古いバージョンをインストールしないようにします。起動自体は制限しません。',
            },
            plansDirectory: {
                label: 'プラン保存先（plansDirectory）',
                desc: 'プランファイルを保存するディレクトリをプロジェクトルートからの相対パスで指定します。既定は ~/.claude/plans です。',
            },
            respectGitignore: {
                label: 'gitignoreを尊重（respectGitignore）',
                desc: '@ ファイル選択で .gitignore に一致するファイルを候補から除外します。既定は有効です。',
            },
            respondToBashCommands: {
                label: 'シェル実行後に応答（respondToBashCommands）',
                desc: '入力欄の ! コマンド実行後に Claude が応答します。無効時は出力を文脈へ追加するだけです。',
            },
            showClearContextOnPlanAccept: {
                label: 'プラン承認時に文脈消去（showClearContextOnPlanAccept）',
                desc: 'プラン承認画面に「コンテキストを消去」する選択肢を表示します。既定は無効です。',
            },
            skipWebFetchPreflight: {
                label: 'WebFetch事前確認を省略（skipWebFetchPreflight）',
                desc: 'WebFetch の各ホスト名を Anthropic の安全確認へ送る事前チェックを省略します。制限されたネットワーク向けです。',
            },
            useAutoModeDuringPlan: {
                label: 'プラン中も自動モード（useAutoModeDuringPlan）',
                desc: '自動モードが利用可能な場合、プランモードにも同じ実行判定を適用します。既定は有効です。',
            },
            workflowKeywordTriggerEnabled: {
                label: 'Ultracodeキーワード（workflowKeywordTriggerEnabled）',
                desc: 'プロンプト内の ultracode を動的ワークフローの起動語として扱います。既定は有効です。',
            },
            disableWorkflows: {
                label: 'ワークフローを無効化（disableWorkflows）',
                desc: '動的ワークフローと同梱のワークフローコマンドを無効にします。既定は無効です。',
            },
            disableBundledSkills: {
                label: '同梱スキルを無効化（disableBundledSkills）',
                desc: 'Claude Code 同梱のスキルとワークフローを取り除きます。プラグインや .claude 配下のスキルには影響しません。',
            },
            disableAllHooks: {
                label: '全フックを無効化（disableAllHooks）',
                desc: 'すべてのフックとカスタムステータスラインを無効にします。',
            },
            disableAgentView: {
                label: 'エージェントビューを無効化（disableAgentView）',
                desc: 'バックグラウンドエージェント、claude agents、--bg、/background、オンデマンド監督機能を無効にします。',
            },
            disableArtifact: {
                label: 'Artifactを無効化（disableArtifact）',
                desc: 'セッション出力を claude.ai の非公開ページとして公開する Artifact ツールを強制的に無効にします。',
            },
            disableClaudeAiConnectors: {
                label: 'Claude.aiコネクタを無効化（disableClaudeAiConnectors）',
                desc: 'claude.ai の MCP コネクタを自動取得・接続しないようにします。明示的な --mcp-config には影響しません。',
            },
            disableRemoteControl: {
                label: 'Remote Controlを無効化（disableRemoteControl）',
                desc: 'Remote Control のコマンド、起動オプション、自動接続、セッション内切り替えをすべて無効にします。',
            },
            remoteControlAtStartup: {
                label: '起動時Remote Control（remoteControlAtStartup）',
                desc: '対話セッション開始時に Remote Control へ自動接続します。未設定時は組織の既定に従います。',
            },
            skillListingBudgetFraction: {
                label: 'スキル一覧の文脈比率（skillListingBudgetFraction）',
                desc: '各ターンでモデルへ渡すスキル一覧に予約するコンテキスト比率です。既定は 0.01（1%）です。',
            },
            skillListingMaxDescChars: {
                label: 'スキル説明の最大文字数（skillListingMaxDescChars）',
                desc: 'モデルへ渡す各スキルの description と when_to_use の合計文字数上限です。既定は 1536 です。',
            },
            apiKeyHelper: {
                label: 'APIキー生成コマンド（apiKeyHelper）',
                desc: '認証値を生成するコマンドをシステムシェルで実行し、その値を API キーと Bearer 認証ヘッダーへ使用します。',
            },
            awsAuthRefresh: {
                label: 'AWS認証更新コマンド（awsAuthRefresh）',
                desc: 'AWS 認証の更新時に .aws ディレクトリを更新するカスタムコマンドです。',
            },
            awsCredentialExport: {
                label: 'AWS資格情報出力コマンド（awsCredentialExport）',
                desc: 'AWS 資格情報を JSON で標準出力するカスタムコマンドです。',
            },
            gcpAuthRefresh: {
                label: 'GCP認証更新コマンド（gcpAuthRefresh）',
                desc: 'GCP Application Default Credentials が期限切れまたは読込不能のとき実行する更新コマンドです。',
            },
            otelHeadersHelper: {
                label: 'OTelヘッダー生成コマンド（otelHeadersHelper）',
                desc: 'OpenTelemetry の動的ヘッダーを起動時と定期更新時に生成するスクリプトです。',
            },
            prUrlTemplate: {
                label: 'PRリンク書式（prUrlTemplate）',
                desc: 'PRバッジのURLテンプレートです。{host}、{owner}、{repo}、{number}、{url} を置換できます。',
            },
            enableAllProjectMcpServers: {
                label: '全プロジェクトMCPを承認（enableAllProjectMcpServers）',
                desc: 'プロジェクトの .mcp.json に定義されたすべての MCP サーバーを自動承認します。',
            },
            enableArtifact: {
                label: 'Artifactを有効化（enableArtifact）',
                desc: 'ユーザー設定で Artifact ツールを明示的に有効または無効にします。管理側の disableArtifact が優先します。',
            },
            disableAutoMode: {
                label: '自動モードを禁止（disableAutoMode）',
                desc: '値を disable にすると自動モードを選択肢から除外し、--permission-mode auto も拒否します。',
            },
            disableDeepLinkRegistration: {
                label: 'ディープリンク登録を禁止（disableDeepLinkRegistration）',
                desc: '値を disable にすると起動時の claude-cli:// プロトコルハンドラー登録を停止します。',
            },
            disableSkillShellExecution: {
                label: 'スキル内シェル実行を無効化（disableSkillShellExecution）',
                desc: 'ユーザー・プロジェクト・プラグイン等のスキルやカスタムコマンドに含まれるインラインシェル実行を禁止します。',
            },
            availableModels: {
                label: '利用可能モデル（availableModels）',
                desc: 'メインセッション、サブエージェント、スキル、Advisor で選択できるモデルの許可リストです。',
            },
            fallbackModel: {
                label: '代替モデル（fallbackModel）',
                desc: '主モデルが過負荷または利用不能な場合に順番に試すモデル ID の配列です。最大 3 モデルです。',
            },
            modelOverrides: {
                label: 'モデルID上書き（modelOverrides）',
                desc: 'Anthropic のモデル ID を Bedrock などプロバイダー固有のモデル ID へ対応付けるマップです。',
            },
            footerLinksRegexes: {
                label: 'フッターリンク規則（footerLinksRegexes）',
                desc: '出力の正規表現一致をクリック可能なフッターバッジへ変換する規則の配列です。',
            },
            spinnerTipsOverride: {
                label: 'スピナーヒント上書き（spinnerTipsOverride）',
                desc: '処理中に表示する独自ヒントと、既定ヒントを除外するかを指定するオブジェクトです。',
            },
            spinnerVerbs: {
                label: 'スピナー動詞（spinnerVerbs）',
                desc: '処理中の動詞一覧と、既定へ追加するか置き換えるかを指定するオブジェクトです。',
            },
            vimInsertModeRemaps: {
                label: 'Vim挿入モード割り当て（vimInsertModeRemaps）',
                desc: 'Vim の INSERT モードで 2 文字の入力列を Escape へ割り当てるマップです。',
            },
            voice: {
                label: '音声入力（voice）',
                desc: '音声入力の有効化、hold/tap モード、自動送信をまとめて指定するオブジェクトです。',
            },
            attribution: {
                label: '帰属表記（attribution）',
                desc: 'Git コミット、プルリクエスト、セッション URL の帰属表記を個別に設定するオブジェクトです。',
            },
            autoMode: {
                label: '自動モード規則（autoMode）',
                desc: '自動モード分類器の環境条件と許可・ソフト拒否・ハード拒否規則を指定するオブジェクトです。',
            },
            companyAnnouncements: {
                label: '組織のお知らせ（companyAnnouncements）',
                desc: '起動時にユーザーへ表示し、複数ある場合はランダムに切り替えるお知らせの配列です。',
            },
            env: {
                label: '環境変数（env）',
                desc: 'Claude Code の各セッションと、そのセッションが起動する子プロセスへ渡す環境変数のマップです。',
            },
            fileSuggestion: {
                label: 'ファイル候補コマンド（fileSuggestion）',
                desc: '@ ファイル補完の候補を生成するコマンドと方式を指定するオブジェクトです。',
            },
            hooks: {
                label: 'ライフサイクルフック（hooks）',
                desc: 'Claude Code の各ライフサイクルイベントで実行するコマンド、HTTP、プロンプト等のフック定義です。',
            },
            permissions: {
                label: '権限規則（permissions）',
                desc: 'ツール利用の allow、ask、deny、追加ディレクトリ、既定権限モードをまとめたオブジェクトです。',
            },
            sandbox: {
                label: 'サンドボックス詳細（sandbox）',
                desc: 'Bash サンドボックスの有効化、除外コマンド、読書き可能パスなどを指定するオブジェクトです。',
            },
            skillOverrides: {
                label: 'スキル表示上書き（skillOverrides）',
                desc: 'スキル名ごとに表示状態を on、name-only、user-invocable-only、off から指定するマップです。',
            },
            sshConfigs: {
                label: 'SSH接続（sshConfigs）',
                desc: 'Desktop の環境選択に表示する SSH 接続先を定義するオブジェクトの配列です。',
            },
            worktreeSymlinkDirectories: {
                label: 'Worktree共有ディレクトリ（worktree.symlinkDirectories）',
                desc: '新しい worktree へ複製せず、元リポジトリからシンボリックリンクするディレクトリの配列です。',
            },
            worktreeSparsePaths: {
                label: 'Worktree sparse対象（worktree.sparsePaths）',
                desc: '新しい worktree で sparse-checkout するディレクトリの配列です。',
            },
            enabledPlugins: {
                label: 'プラグイン有効状態（enabledPlugins）',
                desc: 'plugin-name@marketplace-name ごとにプラグインの有効・無効を指定するマップです。',
            },
            pluginConfigs: {
                label: 'プラグイン設定（pluginConfigs）',
                desc: 'プラグインごとの設定値を保持するオブジェクトです。各プラグインが定義する形式に従います。',
            },
            extraKnownMarketplaces: {
                label: '追加マーケットプレイス（extraKnownMarketplaces）',
                desc: 'Claude Code が認識する追加マーケットプレイス名と取得元を定義するオブジェクトです。',
            },
        },
    },
    pluginManager: {
        title: 'Claude Code プラグイン管理',
        description:
            'Claude Code のプラグインを一覧・追加・削除し、マーケットプレイスを管理します。操作には claude コマンドを使用します。',
    },
    nav: {
        claudeDesktop: 'Claude Desktop MCP 管理',
        claudeCode: 'Claude Code MCP 管理',
        assetManager: 'Claude Code Agent・Skill管理',
        pluginManager: 'Claude Code プラグイン管理',
        cleanup: 'Claude Code クリーンアップ',
        claudeSettings: 'Claude Code 設定',
    },
    dashboard: {
        claudeDesktopDesc: 'Claude Desktop の MCP サーバーを有効化/無効化/並べ替えします。',
        claudeCodeDesc: 'Claude Code（CLI）のプロファイル MCP を管理します。',
        assetManagerDesc: 'Claude Code のエージェント・スキルを ZIP でダウンロード／アップロードします。',
        pluginManagerDesc: 'Claude Code のプラグインとマーケットプレイスを管理します。',
        cleanupDesc: '~/.claude 配下のディレクトリをクリーンアップして容量を回収します。',
        claudeSettingsDesc: '~/.claude/settings.json の設定項目を編集します。',
    },
};
