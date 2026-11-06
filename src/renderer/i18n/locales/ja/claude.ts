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
            '~/.claude 配下の履歴・キャッシュ・一時ファイル・ログと、OS の一時フォルダ・キャッシュに Claude Code が残した一時物を削除します。ディスク容量の回収に加え、動作速度の改善や、一時的な内容がメモリーに残って挙動が不可解になった状態の解消にも役立ちます。',
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
        childOrphan: '会話履歴なし（一時物のみ）',
        childMayBeInUse: '使用中の可能性あり（会話記録・一時物など {{count}} 件）',
        approvalTitle: '使用中の可能性があるプロジェクト',
        confirmWarning: {
            projects: '会話記録と一時物を削除します。',
            projectMemory:
                '自動メモリを削除します。元に戻せません。worktree やサブフォルダと共有している場合があります。',
            projectRecords:
                '信頼の記録、local スコープの MCP 設定、MCP のオン・オフ、.mcp.json の承認、外部インポートの承認、統計を削除します。次回の起動時に信頼の確認が再び表示されることがあります。',
            recordsWithBackups:
                'backups も選択しています。プロジェクト記録の古いコピーも消えるため、復元の手段がなくなります。',
        },
        dir: {
            projects: 'projects',
            projectMemory: 'プロジェクトメモリ',
            projectRecords: 'プロジェクト記録',
            plans: 'plans',
            fileHistory: 'file-history',
            history: 'history.jsonl',
            pasteCache: 'paste-cache',
            uploads: 'uploads',
            shellSnapshots: 'shell-snapshots',
            cache: 'cache',
            debug: 'debug',
            sessionEnv: 'session-env',
            tasks: 'tasks',
            usageData: 'usage-data',
            feedbackBundles: 'feedback-bundles',
            skillsTrash: 'skills/.trash',
            pluginsTrash: 'plugins/.trash',
            backups: 'backups',
            tempBundledSkills: '一時フォルダ: bundled-skills',
            tempBashEditDiff: '一時フォルダ: bash-edit-diff',
            imageCache: 'image-cache',
            todos: 'todos',
            statsig: 'statsig',
            logs: 'logs',
        },
        desc: {
            projects:
                'ワークスペースのパスごとの会話記録（過去セッションの再開・巻き戻しに使用）。一緒に消えるもの: 同じパスの作業フォルダ（OS の一時フォルダ）、bash-edit-diff、MCP サーバーのログ。',
            projectMemory: 'ワークスペースのパスごとの自動メモリ。',
            projectRecords:
                '~/.claude.json に保存された、ワークスペースのパスごとの記録（信頼の記録、local スコープの MCP 設定、統計など）。',
            plans: 'プランモードで作成したプランファイル（過去の計画の記録）。',
            fileHistory: 'Claude Code が編集したファイルの履歴・差分。過去セッションのチェックポイント復元に使用。',
            history: '入力したプロンプトの履歴（↑キー・Ctrl+R で遡れる入力履歴）。',
            pasteCache: '大きな貼り付け内容の保存データ（履歴から呼び出したプロンプトの貼り付け部分）。',
            uploads: 'Remote Control のセッションへ Web・モバイルアプリから添付したファイル。',
            shellSnapshots: 'コマンド実行のために取得したシェル環境のスナップショット。',
            cache: 'changelog や各種データの一時キャッシュ。',
            debug: '不具合調査用のデバッグログ。',
            sessionEnv: 'セッションごとに保存される環境変数などのデータ。',
            tasks: 'タスクツールが作成したタスクリスト（再開したセッションが引き継ぐ一覧）。',
            usageData: '/insights が作成したレポートと分析用のキャッシュデータ。',
            feedbackBundles: '/feedback が作成した、まだ送信していないフィードバック・不具合報告のアーカイブ。',
            skillsTrash: 'claude.ai の同期で取り除かれたスキルの退避先。',
            pluginsTrash: 'claude.ai の同期で取り除かれたプラグインの退避先。',
            backups: '自動保存された旧 ~/.claude.json のバックアップ。',
            tempBundledSkills: 'OS の一時フォルダに展開された組み込みスキル（Claude Code のバージョンごと）。',
            tempBashEditDiff:
                'OS の一時フォルダにある、シェルコマンドによる編集の差分記録のうち、どのプロジェクトの会話記録にも対応しないもの。',
            imageCache: '旧版の Claude Code が保存した添付画像。',
            todos: '旧版の Claude Code が使用した TODO データ。',
            statsig: '旧版の Claude Code が使用した機能フラグのキャッシュ。',
            logs: '旧版の Claude Code が出力したログ。',
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
        unavailable: 'この環境のファイルに届きません。',
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
            'Anthropic 公式リポジトリ（anthropics/skills）のスキルです。同名の既存スキルは置き換えられます。',
        import: 'インポート',
        gitRequired: 'この機能には git のインストールが必要です',
        officialImportSuccess: '{{count}} 件の公式スキルをインポートしました',
        officialImportError: '公式スキルのインポートに失敗しました',
        officialListError: '公式スキルの取得に失敗しました',
        repoUpdating: '公式リポジトリを更新しています…',
        mdNoName: 'SKILL.md の name が取得できませんでした',
        syncedReserved:
            '「synced」は Claude Code が claude.ai のスキルを同期するフォルダのため、この名前のスキルはアップロードできません',
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
            outputStyles: '出力スタイル',
            rules: 'ルール',
            workflows: 'ワークフロー',
            commands: 'コマンド',
        },
        statusLine: {
            mainTitle: 'メイン',
            subagentTitle: 'サブエージェント',
        },
        externalCommands: {
            helpersTitle: '認証とテレメトリのコマンド',
            ripgrepTitle: 'サンドボックスの ripgrep（sandbox.ripgrep）',
        },
        outputStyles: {
            overridesBuiltin: '組み込みを上書きします',
        },
    },
    settings: {
        title: 'Claude Code 設定',
        description:
            'Claude Code の設定、フック、権限、指示ファイルなどを編集します。主な設定ファイルは ~/.claude/settings.json です。',
        wslSection: 'WSL: {{distro}}',
        colItem: '項目',
        colValue: '値',
        directEdit: '直接編集',
        directEditTitle: 'settings.json を直接編集',
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
        invalidJson: 'JSON の構文が正しくありません',
        invalidExisting:
            '既存の settings.json は Claude Code が読めない内容のため保存できません。直接編集で修正してください。',
        parseError:
            'settings.json が厳密な JSON ではないため、Claude Code はこのファイルを読み込めません（コメントと末尾カンマは使えません）。値を表示できませんが、すべての項目が未設定という意味ではありません。「直接編集」で修正してください。',
        verifyFailed:
            '編集結果の検証に失敗したため保存を中止しました。ファイルは変更されていません。この項目は「直接編集」で変更してください。',
        unavailable: 'この環境の設定にはアクセスできません。',
        group: {
            model: 'モデル・思考',
            display: '表示・通知',
            behavior: '動作・データ',
            agent: 'エージェント',
            permissions: '権限',
            sandbox: 'サンドボックス',
        },
        field: {
            model: {
                label: 'モデル（model）',
                desc: '新しいセッションで使うモデルの別名または正式モデル ID です。',
            },
            language: {
                label: '応答言語（language）',
                desc: 'Claude が応答する言語の名前です（japanese、spanish など）。音声入力とセッションタイトルの言語にも使います。',
            },
            outputStyle: {
                label: '出力スタイル（outputStyle）',
                desc: 'Claude の役割、口調、出力形式を決める、組み込みまたはカスタムの出力スタイルの名前です。',
            },
            effortLevel: {
                label: '思考の労力（effortLevel）',
                desc: '労力を保存していないモデルの既定の労力です。低いほど速く安価になり、高いほど深く推論します。',
            },
            advisorModel: {
                label: 'アドバイザーモデル（advisorModel）',
                desc: 'Claude がアドバイザーツールを呼び出したときに回答するモデルです。未設定ではアドバイザーを使いません。',
            },
            maxEffortLevel: {
                label: '思考の労力の上限（maxEffortLevel）',
                desc: 'セッションで実行する思考の労力の上限で、超える指定はこの値で実行します。max は上限なしです。',
            },
            ultracode: {
                label: 'Ultracode で開始（ultracode）',
                desc: 'セッションを ultracode 有効で開始し、実質的な作業ごとに Claude が動的ワークフローを計画します。',
            },
            promptCacheTtl: {
                label: 'プロンプトキャッシュ保持時間（promptCacheTtl）',
                desc: 'メイン会話のプロンプトキャッシュを保持する時間です。1h は長い中断でもキャッシュが残りますが、書き込み料金が高くなります。',
            },
            subagentPromptCacheTtl: {
                label: 'サブエージェントのキャッシュ保持時間（subagentPromptCacheTtl）',
                desc: 'サブエージェント、ワークフロー、コンパクトなどメイン会話以外のリクエストのプロンプトキャッシュを保持する時間です。',
            },
            enforceAvailableModels: {
                label: '既定モデルも許可リストに従わせる（enforceAvailableModels）',
                desc: '既定モデルが availableModels の外になる場合、許可リスト内で最初に利用可能なモデルを使います。',
            },
            alwaysThinkingEnabled: {
                label: '拡張思考（alwaysThinkingEnabled）',
                desc: 'false ですべてのセッションの拡張思考を無効にします。true は何も変えません。',
            },
            autoMemoryEnabled: {
                label: '自動メモリ（autoMemoryEnabled）',
                desc: '自動メモリの読み書きを有効にします。',
            },
            editorMode: {
                label: '入力モード（editorMode）',
                desc: '入力欄のキーバインドです。normal=標準、vim=Vim 形式の編集。',
            },
            preferredNotifChannel: {
                label: '通知方法（preferredNotifChannel）',
                desc: 'タスクの完了時や権限確認の待機時の通知方法です。auto は端末に合わせて選びます。',
            },
            spinnerTipsEnabled: {
                label: 'スピナーTips（spinnerTipsEnabled）',
                desc: '処理中のスピナーに Tips を表示します。',
            },
            emojiCompletionEnabled: {
                label: '絵文字補完（emojiCompletionEnabled）',
                desc: 'プロンプト入力で「:」＋ショートコードを打つと絵文字候補を表示し、:heart: などを絵文字へ置換します。',
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
                desc: '数分離席して戻ったときに、1 行のセッション要約を表示します。',
            },
            autoUpdatesChannel: {
                label: '更新チャンネル（autoUpdatesChannel）',
                desc: '自動更新のチャンネルです。latest=最新のリリース、stable=約 1 週間前の版で大きな不具合のあるリリースを飛ばします。',
            },
            minimumVersion: {
                label: '更新の下限バージョン（minimumVersion）',
                desc: '自動更新と claude update がこのバージョンより古い版をインストールしないようにします（例: 2.1.100）。',
            },
            cleanupPeriodDays: {
                label: 'セッション保持日数（cleanupPeriodDays）',
                desc: 'セッションの記録などのアプリケーションデータを削除するまで保持する日数です。未設定は 30 日です。',
            },
            desktopSessionCleanupPeriodDays: {
                label: 'Desktop セッション保持日数（desktopSessionCleanupPeriodDays）',
                desc: 'Claude Desktop や Cowork で使ったセッションの記録の保持上限日数で、cleanupPeriodDays より古いものに適用します。0 は無期限です。',
            },
            autoCompactEnabled: {
                label: '自動コンパクト（autoCompactEnabled）',
                desc: 'コンテキスト上限が近づいたとき会話を自動で要約圧縮します。',
            },
            idleCompaction: {
                label: '離席中のコンパクト（idleCompaction）',
                desc: '離席中の長い会話を、プロンプトキャッシュが切れる直前にコンパクトします。',
            },
            autoCompactWindow: {
                label: '自動コンパクト閾値（autoCompactWindow）',
                desc: '自動コンパクトを開始するコンテキスト量（トークン、100000〜1000000）。未設定ならモデルに応じた既定値を使います。',
            },
            fileCheckpointingEnabled: {
                label: 'ファイルチェックポイント（fileCheckpointingEnabled）',
                desc: '編集の前にファイルのスナップショットを保存し、/rewind で復元します。',
            },
            agentTeams: {
                label: 'エージェントチーム（CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS）',
                desc: '実験的なエージェントチーム機能を有効にします。',
            },
            teammateMode: {
                label: 'チームメイトモード（teammateMode）',
                desc: 'エージェントチームのチームメイトの表示先です。in-process=メイン端末のペイン内、auto=端末が対応していれば分割ペイン、tmux=tmux または iTerm2 の分割ペイン、iterm2=iTerm2 のネイティブ分割ペイン。',
            },
            agentPushNotifEnabled: {
                label: 'エージェント通知（agentPushNotifEnabled）',
                desc: 'Claude が必要と判断したときに、スマートフォンへプッシュ通知を送ります。',
            },
            fastMode: {
                label: '高速モード（fastMode）',
                desc: '新しいセッションで高速モードを有効にします。',
            },
            fastModePerSessionOptIn: {
                label: '高速モードを毎回選択（fastModePerSessionOptIn）',
                desc: '保存された fastMode をセッション開始時に適用せず、セッションごとに /fast で有効にします。',
            },
            switchModelsOnFlag: {
                label: '警告時に自動でモデル切替（switchModelsOnFlag）',
                desc: '安全性分類でリクエストが検出されたときの動作です。true=代替モデルへ切り替えて続行、false=一時停止して切り替えかプロンプトの編集を選びます。',
            },
            inputNeededNotifEnabled: {
                label: '入力待ち通知（inputNeededNotifEnabled）',
                desc: '権限確認や質問が入力を待っているときに、スマートフォンへプッシュ通知を送ります。',
            },
            agent: {
                label: '既定エージェント（agent）',
                desc: 'メインスレッドを指定した名前のサブエージェントとして実行し、そのプロンプト・ツール制限・モデルを適用します。',
            },
            crossSessionInbound: {
                label: '他セッションからのメッセージ（crossSessionInbound）',
                desc: '自分の他の Claude Code セッションから届いたメッセージの扱いです。accept=Claude へ渡す、hold=通知だけで保留、refuse=破棄、未設定=メッセージごとに判断。',
            },
            isolatePeerMachines: {
                label: '他マシンへの送信を確認（isolatePeerMachines）',
                desc: 'Claude の SendMessage がこのマシン以外のセッションへ届く前に、毎回承認を求めます。bypassPermissions モードでも確認します。',
            },
            axScreenReader: {
                label: 'スクリーンリーダー表示（axScreenReader）',
                desc: '装飾枠やアニメーションを省いた平坦なテキスト表示にして、スクリーンリーダーで読みやすくします。',
            },
            prefersReducedMotion: {
                label: '動きを減らす（prefersReducedMotion）',
                desc: 'スピナー、シマー、点滅などのUIアニメーションを減らすか無効にします。',
            },
            promptSuggestionEnabled: {
                label: 'プロンプト候補（promptSuggestionEnabled）',
                desc: '入力欄に次の入力の予測をグレー表示します。',
            },
            terminalTitleFromRename: {
                label: 'セッション名を端末タイトルに（terminalTitleFromRename）',
                desc: '/rename や --name で付けたセッション名を端末タブのタイトルに表示します。false は会話から生成したタイトルのままにします。',
            },
            timeFormat: {
                label: '時刻の表示形式（timeFormat）',
                desc: '画面に表示する時刻の形式です。auto=組み込みの形式、12-hour、24-hour、24-hour-utc、または %H:%M などの strftime パターン。',
            },
            timeZone: {
                label: '表示タイムゾーン（timeZone）',
                desc: '画面に表示する時刻のタイムゾーンを UTC や Asia/Tokyo などの IANA 名で指定します。未設定時はシステムのタイムゾーンです。',
            },
            maxProseWidth: {
                label: '本文の最大幅（maxProseWidth）',
                desc: '応答の段落・見出し・リストを折り返す桁数の上限（最小 40）。表とコードブロックは端末幅を使います。',
            },
            showThinkingSummaries: {
                label: '思考要約を表示（showThinkingSummaries）',
                desc: 'true は思考を展開したときに要約全文を表示します。false は折りたたんだ表示だけにします。',
            },
            syntaxHighlightingDisabled: {
                label: '構文強調を無効化（syntaxHighlightingDisabled）',
                desc: '差分、コードブロック、ファイルプレビューのシンタックスハイライトを無効にします。',
            },
            terminalProgressBarEnabled: {
                label: '端末プログレスバー（terminalProgressBarEnabled）',
                desc: 'Claude の作業中、端末のタブやウィンドウに進捗バーを表示します。',
            },
            theme: {
                label: 'カラーテーマ（theme）',
                desc: '組み込みテーマ、または custom:<slug> / custom:<plugin-name>:<slug> 形式のカスタムテーマです。auto は端末の背景に合わせます。',
            },
            tui: {
                label: 'TUIレンダラー（tui）',
                desc: 'ターミナルのレンダラーです。default=従来の通常画面、fullscreen=ちらつきのない代替画面、未設定=Claude Code が選択。',
            },
            verbose: {
                label: '詳細出力（verbose）',
                desc: '切り詰めた要約ではなく、ツール出力を完全に表示します。',
            },
            viewMode: {
                label: '起動時の表示モード（viewMode）',
                desc: '起動時のトランスクリプト表示です。default=ツール出力を切り詰める、verbose=ツール出力を完全に表示、focus=最後のプロンプト、ツールの要約、最終応答のみ。',
            },
            wheelScrollAccelerationEnabled: {
                label: 'ホイール加速（wheelScrollAccelerationEnabled）',
                desc: '全画面表示で速くホイールを回したときスクロール量を加速します。',
            },
            autoMemoryDirectory: {
                label: '自動メモリ保存先（autoMemoryDirectory）',
                desc: '自動メモリの保存先を絶対パスまたは ~/ で始まるパスに変更します。',
            },
            askUserQuestionTimeout: {
                label: '質問の自動続行時間（askUserQuestionTimeout）',
                desc: '未回答の AskUserQuestion が、選択済みの内容で自動続行するまでの時間です。never は回答まで待機します。',
            },
            dialogExpiry: {
                label: 'リモートダイアログの期限（dialogExpiry）',
                desc: 'Remote Control などリモートへ転送したダイアログの応答期限で、過ぎると取り消して既定の動作で続行します。never は期限なしです。',
            },
            autoContinueAtUsageLimit: {
                label: '利用上限後に自動で続行（autoContinueAtUsageLimit）',
                desc: 'claude.ai の利用上限で止まったとき、セッションを開いたまま待機し、リセット後に作業を自動で再開します。',
            },
            bashEditDiffEnabled: {
                label: 'Bash による変更の記録（bashEditDiffEnabled）',
                desc: 'Bash コマンドの実行中に Git リポジトリ内で変更されたファイルを記録し、実行後に差分を表示します。未設定時は自動モードと bypassPermissions モードでのみ記録します。',
            },
            bashOutputMaxChars: {
                label: 'Bash 出力の最大文字数（bashOutputMaxChars）',
                desc: '成功したコマンドの出力を Claude へそのまま渡す文字数で、4000〜128000 に丸めます。超えた分はファイルに保存してプレビューを渡し、未設定は 30000 です。',
            },
            defaultShell: {
                label: '既定シェル（defaultShell）',
                desc: '入力欄で入力した ! コマンドを実行するシェルです。',
            },
            feedbackSurveyRate: {
                label: 'フィードバック調査率（feedbackSurveyRate）',
                desc: 'セッションの品質アンケートを表示する確率（0〜1）です。0 は表示しません。',
            },
            feedbackDrafts: {
                label: 'Claude によるフィードバック下書き（feedbackDrafts）',
                desc: 'Claude が作成するフィードバック下書きの扱いです。notify=作成時にカードを表示、quiet=カードなしで作成、off=作成しない。',
            },
            includeGitInstructions: {
                label: 'Git指示を含める（includeGitInstructions）',
                desc: '組み込みのコミット・PR 手順と git status のスナップショットをコンテキストへ含めます。',
            },
            plansDirectory: {
                label: 'プラン保存先（plansDirectory）',
                desc: 'プランファイルの保存先で、プロジェクトルートからの相対パスです。未設定は ~/.claude/plans です。',
            },
            respectGitignore: {
                label: 'gitignoreを尊重（respectGitignore）',
                desc: '@ ファイル選択で .gitignore に一致するファイルを候補から除外します。',
            },
            respondToBashCommands: {
                label: 'シェル実行後に応答（respondToBashCommands）',
                desc: '入力欄の ! コマンドの実行後に Claude が応答します。false は出力を文脈へ追加するだけです。',
            },
            showClearContextOnPlanAccept: {
                label: 'プラン承認時に文脈消去（showClearContextOnPlanAccept）',
                desc: 'プラン承認メニューの先頭に、プランを承認して会話のコンテキストを消去する選択肢を追加します。',
            },
            skipWebFetchPreflight: {
                label: 'WebFetch事前確認を省略（skipWebFetchPreflight）',
                desc: 'リクエスト先のホスト名を api.anthropic.com へ送る WebFetch の安全確認を省略します。',
            },
            useAutoModeDuringPlan: {
                label: 'プラン中も自動モード（useAutoModeDuringPlan）',
                desc: 'プランモードのシェルコマンドを自動モードの分類器で確認します。false は組み込みの読み取り専用コマンド以外をすべて確認します。',
            },
            workflowKeywordTriggerEnabled: {
                label: 'Ultracodeキーワード（workflowKeywordTriggerEnabled）',
                desc: 'プロンプト内の ultracode を動的ワークフローの起動語として扱います。',
            },
            workflowSizeGuideline: {
                label: 'ワークフロー規模の目安（workflowSizeGuideline）',
                desc: '動的ワークフローで目標とするエージェント数です。unrestricted=目安なし、small=5 未満、medium=10 未満、large=50 未満。',
            },
            enableWorkflows: {
                label: 'ワークフローを有効化（enableWorkflows）',
                desc: '動的ワークフローを自分だけ有効または無効にします。未設定時はプランの既定に従います（Pro プランは無効）。',
            },
            disableWorkflows: {
                label: 'ワークフローを無効化（disableWorkflows）',
                desc: 'この設定が及ぶ全員について、動的ワークフローと同梱のワークフローコマンドを無効にします。',
            },
            disableBundledSkills: {
                label: '同梱スキルを無効化（disableBundledSkills）',
                desc: 'Claude Code 同梱のスキルとワークフローを取り除き、/init などの組み込みコマンドをモデルから隠します。',
            },
            syncClaudeAiSkills: {
                label: 'claude.ai のスキル同期（syncClaudeAiSkills）',
                desc: 'false は claude.ai のアカウントで有効なスキルのダウンロードと読み込みを止め、同期済みのスキルを ~/.claude/skills/.trash へ移します。',
            },
            syncClaudeAiPlugins: {
                label: 'claude.ai のプラグイン同期（syncClaudeAiPlugins）',
                desc: 'false は claude.ai のアカウントで有効なプラグインのダウンロードと読み込みを止め、同期済みのプラグインを ~/.claude/plugins/.trash へ移します。',
            },
            disableAllHooks: {
                label: '全フックを無効化（disableAllHooks）',
                desc: 'すべてのフック、カスタムステータスライン、カスタムのファイル候補コマンドを無効にします。',
            },
            disableAgentView: {
                label: 'エージェントビューを無効化（disableAgentView）',
                desc: 'バックグラウンドエージェント、claude agents、--bg、/background、オンデマンド監督機能を無効にします。',
            },
            disableClaudeAiConnectors: {
                label: 'claude.aiコネクタを無効化（disableClaudeAiConnectors）',
                desc: 'claude.ai の MCP コネクタの取得と接続を止めます。',
            },
            disableRemoteControl: {
                label: 'Remote Controlを無効化（disableRemoteControl）',
                desc: 'Remote Control のコマンド、起動オプション、自動接続、セッション内切り替えをすべて無効にします。',
            },
            remoteControlAtStartup: {
                label: '起動時Remote Control（remoteControlAtStartup）',
                desc: '対話セッションの開始時に Remote Control へ自動接続します。未設定は組織の既定、なければ Claude Code の既定に従います。',
            },
            skillListingBudgetFraction: {
                label: 'スキル一覧の文脈比率（skillListingBudgetFraction）',
                desc: '各ターンのスキル一覧に予約するコンテキストの割合で、0 より大きく 1 以下です。未設定は 0.01（1%）です。',
            },
            skillListingMaxDescChars: {
                label: 'スキル説明の最大文字数（skillListingMaxDescChars）',
                desc: 'スキル一覧に載せる各スキルの description と when_to_use の文字数上限です。未設定は 1536 です。',
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
            processWrapper: {
                label: 'プロセス起動ラッパー（processWrapper）',
                desc: 'Claude Code が起動するバックグラウンドプロセスの前に差し込む企業向けランチャーコマンドです。',
            },
            prUrlTemplate: {
                label: 'PRリンク書式（prUrlTemplate）',
                desc: 'PR バッジの URL テンプレートです。{host}、{owner}、{repo}、{number}、{url} を置換します。',
            },
            forceLoginMethod: {
                label: 'ログイン方法の限定（forceLoginMethod）',
                desc: 'ログインするアカウント種別を限定します。claudeai=claude.ai、console=Claude Console、gateway=クラウドゲートウェイ。',
            },
            forceLoginGatewayUrl: {
                label: 'ログイン先ゲートウェイ URL（forceLoginGatewayUrl）',
                desc: '/login のクラウドゲートウェイ画面が接続するゲートウェイの URL（スキームを含む完全な URL）。',
            },
            remoteDefaultEnvironmentId: {
                label: '既定クラウド環境（remote.defaultEnvironmentId）',
                desc: 'claude --cloud など CLI から作成するクラウドセッションの既定環境 ID です。',
            },
            worktreeBaseRef: {
                label: 'Worktree分岐元（worktree.baseRef）',
                desc: '新しい worktree の分岐元です。fresh=origin の既定ブランチ、head=現在のローカル HEAD。',
            },
            worktreeBgIsolation: {
                label: 'バックグラウンド分離（worktree.bgIsolation）',
                desc: 'バックグラウンドセッションの編集の分離方法です。worktree=EnterWorktree まで本体の編集を禁止、none=作業コピーを直接編集。',
            },
            worktreeLocation: {
                label: 'SSH セッションの worktree 作成先（worktree.location）',
                desc: 'Claude Desktop の SSH セッションがリモートマシン上で worktree を作成するフォルダ（絶対パスまたは ~/ で始まるパス）。未設定時はプロジェクト内に作成します。',
            },
            enableAllProjectMcpServers: {
                label: '全プロジェクトMCPを承認（enableAllProjectMcpServers）',
                desc: 'プロジェクトの .mcp.json に定義されたすべての MCP サーバーを自動承認します。',
            },
            enableArtifact: {
                label: 'Artifactを有効化（enableArtifact）',
                desc: 'false は、セッション出力を claude.ai の非公開ページとして公開する Artifact ツールを無効にします。',
            },
            disableAutoMode: {
                label: '自動モードを禁止（disableAutoMode）',
                desc: 'disable は自動モードを Shift+Tab の切り替えから外し、自動モードで始まるはずのセッションを default モードで開始します。',
            },
            disableDeepLinkRegistration: {
                label: 'ディープリンク登録を禁止（disableDeepLinkRegistration）',
                desc: 'disable は claude-cli:// プロトコルハンドラーの登録を止めます。',
            },
            disableSkillShellExecution: {
                label: 'スキル内シェル実行を無効化（disableSkillShellExecution）',
                desc: 'ユーザー・プロジェクト・プラグイン等のスキルやカスタムコマンドに含まれるインラインシェル実行を禁止します。',
            },
            availableModels: {
                label: '利用可能モデル（availableModels）',
                desc: 'メインセッション、サブエージェント、スキル、Advisor で選択を許可するモデルの一覧です。',
            },
            fallbackModel: {
                label: '代替モデル（fallbackModel）',
                desc: '主モデルが過負荷または利用不能なときに順番に試すモデルの別名または ID です。最大 3 つです。',
            },
            modelOverrides: {
                label: 'モデルID上書き（modelOverrides）',
                desc: 'Anthropic のモデル ID を Bedrock などプロバイダー固有のモデル ID へ対応付けるマップです。',
            },
            modelPicker: {
                label: 'モデル選択肢（modelPicker）',
                desc: '/model の選択肢に表示するモデルと表示名を指定し、組み込みの選択肢に追加または置き換えます。',
            },
            modelSettings: {
                label: 'モデルごとの設定（modelSettings）',
                desc: 'モデルごとに保存した思考の労力、労力の上限、自動コンパクト閾値です。',
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
            spellcheck: {
                label: 'スペルチェック（spellcheck）',
                desc: '入力欄の綴り誤りに下線を表示します。インストール済みの aspell / hunspell / ispell、辞書言語、表示色を指定します。',
            },
            voice: {
                label: '音声入力（voice）',
                desc: '音声入力の有効化、hold/tap モード、自動送信をまとめて指定するオブジェクトです。',
            },
            attribution: {
                label: '帰属表記（attribution）',
                desc: 'コミットの Co-Authored-By などの帰属表記（commit）、PR 説明の帰属表記（pr）、セッションリンクの付与（sessionUrl）を変更します。false ですべての帰属表記を省きます。',
            },
            autoModeClassifyAllShell: {
                label: '全シェルを自動分類（autoMode.classifyAllShell）',
                desc: 'すべての Bash / PowerShell コマンドを自動モード分類器に通します。',
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
                desc: '@ ファイル補完の候補を生成する外部コマンドの設定です。',
            },
            hooks: {
                label: 'ライフサイクルフック（hooks）',
                desc: 'Claude Code の各ライフサイクルイベントで実行するコマンド、HTTP、プロンプト等のフック定義です。',
            },
            permissionsDefaultMode: {
                label: '既定の権限モード（permissions.defaultMode）',
                desc: '新しいセッションの権限モードです。default=読み取り以外は確認、acceptEdits=ファイル編集も実行、plan=読み取りと計画のみ、auto=分類器が操作を確認、dontAsk=確認が必要な操作を拒否、bypassPermissions=すべて実行、manual=default と同じ。',
            },
            permissionsDisableBypassPermissionsMode: {
                label: 'bypassPermissions の禁止（permissions.disableBypassPermissionsMode）',
                desc: 'disable は bypassPermissions モードへの切り替えを禁止します。',
            },
            permissionsBlockReadsOutsideWorkingDirectories: {
                label: '作業ディレクトリ外の読み取りを禁止（permissions.blockReadsOutsideWorkingDirectories）',
                desc: 'すべての権限モードで、Read / Grep / Glob / LSP による作業ディレクトリ外の読み取りを拒否します。',
            },
            permissionsBlockWritesOutsideWorkingDirectories: {
                label: '作業ディレクトリ外の書き込みを禁止（permissions.blockWritesOutsideWorkingDirectories）',
                desc: 'すべての権限モードで、Write / Edit / NotebookEdit による作業ディレクトリ外への書き込みを拒否します（Claude Code 自身の一部のファイルを除く）。',
            },
            skipDangerousModePermissionPrompt: {
                label: 'bypassPermissions の確認を省略（skipDangerousModePermissionPrompt）',
                desc: 'セッションが bypassPermissions モードに入る前の確認画面を省略します。',
            },
            skipAutoPermissionPrompt: {
                label: '自動モードの説明を省略（skipAutoPermissionPrompt）',
                desc: '初めて自動モードに入るときに一度だけ表示される自動モードの説明を省略します。',
            },
            permissionsAllow: {
                label: '許可ルール（permissions.allow）',
                desc: 'ツール使用を確認なしで許可する権限ルールの配列です。',
            },
            permissionsAsk: {
                label: '確認ルール（permissions.ask）',
                desc: 'ツール使用前に必ず確認を求める権限ルールの配列です。',
            },
            permissionsDeny: {
                label: '拒否ルール（permissions.deny）',
                desc: 'ツール使用を拒否する権限ルールの配列です。',
            },
            permissionsAdditionalDirectories: {
                label: '追加作業ディレクトリ（permissions.additionalDirectories）',
                desc: '作業ディレクトリ以外にアクセスを許可するディレクトリの配列です。',
            },
            sandboxEnabled: {
                label: 'サンドボックス有効化（sandbox.enabled）',
                desc: 'Bash コマンドを OS のサンドボックス機構内で実行します。',
            },
            sandboxFailIfUnavailable: {
                label: '利用不可時に失敗（sandbox.failIfUnavailable）',
                desc: 'サンドボックスを開始できないとき、サンドボックスなしで実行せず、起動時にエラーで終了します。',
            },
            sandboxAllowUnsandboxedCommands: {
                label: '非サンドボックス実行許可（sandbox.allowUnsandboxedCommands）',
                desc: 'サンドボックスに止められたコマンドを Claude がサンドボックス外で再試行します。false は厳格サンドボックスモードです。',
            },
            sandboxAutoAllowBashIfSandboxed: {
                label: 'サンドボックス時に自動許可（sandbox.autoAllowBashIfSandboxed）',
                desc: 'サンドボックス内の Bash コマンドを権限確認なしで実行します。',
            },
            sandboxAllowAppleEvents: {
                label: 'Apple Events 許可（sandbox.allowAppleEvents）',
                desc: 'macOS で、サンドボックス内のコマンドに Apple Events の送信を許可します。コード実行の分離がなくなります。',
            },
            sandboxAllowNestedUserNamespaces: {
                label: 'ユーザー名前空間の作成を許可（sandbox.allowNestedUserNamespaces）',
                desc: 'サンドボックス内のコマンドにユーザー名前空間の作成を許可し、サンドボックスのセキュリティ境界を外します。',
            },
            sandboxEnableWeakerNetworkIsolation: {
                label: '弱いネットワーク分離（sandbox.enableWeakerNetworkIsolation）',
                desc: 'サンドボックス内のコマンドにシステムの TLS 信頼サービスへの接続を許可します。データ流出の経路になるおそれがあります。',
            },
            sandboxEnableWeakerNestedSandbox: {
                label: '弱いネストサンドボックス（sandbox.enableWeakerNestedSandbox）',
                desc: 'コンテナの /proc を再利用して非特権コンテナ内で Linux サンドボックスを動かし、プロセス情報が見えるようになります。',
            },
            sandboxFilesystemDisabled: {
                label: 'ファイルシステム分離無効（sandbox.filesystem.disabled）',
                desc: 'ネットワーク分離を残したままサンドボックスのファイルシステム分離を無効にし、読み書きを制限しなくなります。',
            },
            sandboxNetworkHttpProxyPort: {
                label: 'HTTP プロキシポート（sandbox.network.httpProxyPort）',
                desc: '独自の HTTP プロキシのローカル TCP ポートです。未設定は Claude Code が動かすプロキシを使います。',
            },
            sandboxNetworkSocksProxyPort: {
                label: 'SOCKS プロキシポート（sandbox.network.socksProxyPort）',
                desc: '独自の SOCKS5 プロキシのローカル TCP ポートです。未設定は Claude Code が動かすプロキシを使います。',
            },
            sandboxNetworkStrictAllowlist: {
                label: '許可ドメイン外を拒否（sandbox.network.strictAllowlist）',
                desc: '許可リスト外のホストへの接続を確認せずに拒否します。',
            },
            sandboxNetworkAllowAllUnixSockets: {
                label: 'Unix ソケットを全許可（sandbox.network.allowAllUnixSockets）',
                desc: 'サンドボックス内のコマンドにすべての Unix ソケットへの接続を許可します。',
            },
            sandboxNetworkAllowLocalBinding: {
                label: 'localhost バインド許可（sandbox.network.allowLocalBinding）',
                desc: 'macOS で、サンドボックス内のコマンドに、ネットワークポートでの待ち受けと localhost の任意のポートへの接続を許可します。',
            },
            sandboxCredentialsAllowPlaintextInject: {
                label: '平文 HTTP への値差し込み許可（sandbox.credentials.allowPlaintextInject）',
                desc: 'マスクした資格情報の実値を、TLS 終端した HTTPS に加えて平文 HTTP リクエストにも差し込みます。',
            },
            sandboxRipgrep: {
                label: 'サンドボックスの ripgrep（sandbox.ripgrep）',
                desc: 'サンドボックスで使う ripgrep のコマンドのパスと追加の引数です。',
            },
            sandbox: {
                label: 'サンドボックス詳細（sandbox）',
                desc: '除外コマンド、読書き可能パス、許可ドメイン、資格情報など上記以外の構造設定を含むオブジェクトです。',
            },
            statusLine: {
                label: 'ステータスライン（statusLine）',
                desc: 'ステータスラインに表示する内容を出力するコマンドの設定です。',
            },
            subagentStatusLine: {
                label: 'サブエージェント用ステータスライン（subagentStatusLine）',
                desc: 'タスク表示のサブエージェント行を書き換えるコマンドの設定です。',
            },
            skillOverrides: {
                label: 'スキル表示上書き（skillOverrides）',
                desc: 'スキル名ごとに表示状態を on、name-only、user-invocable-only、off から指定するマップです。',
            },
            sshHostCommands: {
                label: 'SSH ホストコマンド（sshHostCommands）',
                desc: 'Desktop の環境選択に追加する、ホストをコマンドで決める SSH 接続です。',
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
                desc: 'プラグインの設定ダイアログで回答した機密でない値を、プラグイン ID ごとに保持します。',
            },
            prependPlugins: {
                label: '先に実行するプラグイン（prependPlugins）',
                desc: 'ユーザーが導入した mod より先に、列挙した順で mod を実行するプラグイン（plugin-name@marketplace-name）です。',
            },
            appendPlugins: {
                label: '後に実行するプラグイン（appendPlugins）',
                desc: 'ユーザーが導入した mod の後に、列挙した順で mod を実行するプラグイン（plugin-name@marketplace-name）です。',
            },
            extraKnownMarketplaces: {
                label: '追加マーケットプレイス（extraKnownMarketplaces）',
                desc: 'Claude Code が認識する追加マーケットプレイス名と取得元を定義するオブジェクトです。',
            },
            enabledMcpjsonServers: {
                label: '承認する.mcp.jsonサーバー（enabledMcpjsonServers）',
                desc: '.mcp.json ファイルから承認する MCP サーバー名の一覧です。',
            },
            disabledMcpjsonServers: {
                label: '拒否する.mcp.jsonサーバー（disabledMcpjsonServers）',
                desc: '.mcp.json ファイルから拒否する MCP サーバー名の一覧です。',
            },
            allowedMcpServers: {
                label: 'MCP サーバー許可リスト（allowedMcpServers）',
                desc: 'MCP サーバーをサーバー名・起動コマンド・URL パターンで許可します。一致しないサーバーは定義元にかかわらずブロックします。',
            },
            deniedMcpServers: {
                label: 'MCP サーバー拒否リスト（deniedMcpServers）',
                desc: 'サーバー名・起動コマンド・URL パターンに一致する MCP サーバーの読み込みを拒否します。許可リストより優先されます。',
            },
            allowedHttpHookUrls: {
                label: 'HTTPフック許可URL（allowedHttpHookUrls）',
                desc: 'HTTP フックの対象にする URL パターンの許可リストです。* はワイルドカードです。',
            },
            httpHookAllowedEnvVars: {
                label: 'HTTPフック許可環境変数（httpHookAllowedEnvVars）',
                desc: 'HTTP フックがヘッダーへ展開する環境変数名の許可リストです。',
            },
            claudeMdExcludes: {
                label: 'CLAUDE.md除外（claudeMdExcludes）',
                desc: 'メモリ読み込み時にスキップする CLAUDE.md のグロブパターンまたは絶対パスです。',
            },
            forceLoginOrgUUID: {
                label: 'ログイン組織（forceLoginOrgUUID）',
                desc: 'Anthropic の組織の UUID、またはその配列です。単一の UUID はログイン時にその組織を選択しておきます。',
            },
        },
    },
    pluginManager: {
        title: 'Claude Code プラグイン管理',
        description: 'Claude Code のプラグインを一覧・追加・削除し、マーケットプレイスを管理します。',
    },
    nav: {
        group: 'Claude',
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
