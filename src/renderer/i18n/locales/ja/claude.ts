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
        inUseNotice:
            '実行中の Claude Code セッションがあると一部ディレクトリの削除に失敗することがあります。削除前にセッションを終了してください。',
        deleteSuccess: 'クリーンアップが完了しました',
        deleteError: '一部の項目の削除に失敗しました',
        columnName: '項目',
        columnDescription: '説明',
        columnFiles: 'ファイル数',
        columnSize: 'サイズ',
        childOrphan: '会話履歴なし（一時物のみ）',
        childMayBeInUse: '使用中の可能性あり（会話記録・一時物など {{count}} 件）',
        approvalTitle: '使用中の可能性があるプロジェクト',
        dir: {
            projects: 'projects',
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
                'プロジェクトごとの会話記録（過去セッションの再開・巻き戻しに使用）。各プロジェクトの memory/（自動メモリ）と、同じプロジェクトの一時物（OS の一時フォルダにあるセッションの作業フォルダ・bash-edit-diff、MCP サーバーのログ）も含めて削除します。会話記録を削除した後に一時物だけが残ったプロジェクトも選べます。実行中のセッションがあるプロジェクトでは、そのセッションの会話記録・作業フォルダ・bash-edit-diff と、プロジェクトの memory/・MCP サーバーのログを残します。実行中のセッションを確認できないときは、会話記録と一時物を削除しません。',
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
            skillsTrash: 'claude.ai の同期で取り除かれたスキルの退避先（復元できなくなります）。',
            pluginsTrash: 'claude.ai の同期で取り除かれたプラグインの退避先（復元できなくなります）。',
            backups: '自動保存された旧 ~/.claude.json のバックアップ。',
            tempBundledSkills:
                'OS の一時フォルダに展開された組み込みスキル（Claude Code のバージョンごと）。実行中のセッションと同じバージョンのものは対象外です。',
            tempBashEditDiff:
                'OS の一時フォルダにある、シェルコマンドによる編集の差分記録のうち、どのプロジェクトの会話記録にも対応しないもの。実行中のセッションのものは対象外です。',
            imageCache: '旧版の Claude Code が保存した添付画像（現行版は書き込みません）。',
            todos: '旧版の Claude Code が使用した TODO データ（現行版は書き込みません）。',
            statsig: '旧版の Claude Code が使用した機能フラグのキャッシュ（現行版は書き込みません）。',
            logs: '旧版の Claude Code が出力したログ（現行版は書き込みません）。',
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
        syncedReserved:
            '「synced」は Claude Code が claude.ai のスキルを同期するフォルダのため、この名前のスキルはアップロードできません',
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
            maxEffortLevel: {
                label: '思考の労力の上限（maxEffortLevel）',
                desc: 'セッションで使える思考の労力の上限です。上限を超える指定はこの値で実行されます。max は上限なしです。',
            },
            ultracode: {
                label: 'Ultracode で開始（ultracode）',
                desc: 'セッションを ultracode 有効で開始し、実質的な作業ごとに Claude が動的ワークフローを計画します。思考の労力は変わりません。',
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
                desc: 'false にするとすべてのセッションで拡張思考を無効にします。未設定時は対応モデルで有効なため、true は効果がありません。',
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
            emojiCompletionEnabled: {
                label: '絵文字補完（emojiCompletionEnabled）',
                desc: 'プロンプト入力で「:」＋ショートコードを打つと絵文字候補を表示し、:heart: などを絵文字へ置換します。既定は有効です（v2.1.217 以降）。',
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
            minimumVersion: {
                label: '更新の下限バージョン（minimumVersion）',
                desc: '自動更新と claude update がこのバージョンより古い版をインストールしないようにします（例: 2.1.100）。',
            },
            cleanupPeriodDays: {
                label: 'セッション保持日数（cleanupPeriodDays）',
                desc: 'この日数より古いセッションファイルを削除します（最小 1、未設定で既定 30）。',
            },
            desktopSessionCleanupPeriodDays: {
                label: 'Desktop セッション保持日数（desktopSessionCleanupPeriodDays）',
                desc: 'Claude Desktop や Cowork で使ったセッションの記録を削除する日数。cleanupPeriodDays とこの値の両方より古いものを削除します。0 は無期限です。',
            },
            autoCompactEnabled: {
                label: '自動コンパクト（autoCompactEnabled）',
                desc: 'コンテキスト上限が近づいたとき会話を自動で要約圧縮します。',
            },
            idleCompaction: {
                label: '離席中のコンパクト（idleCompaction）',
                desc: '長い会話を離席中、プロンプトキャッシュが切れる直前に自動でコンパクトします。false で無効にします。',
            },
            autoCompactWindow: {
                label: '自動コンパクト閾値（autoCompactWindow）',
                desc: '自動コンパクトを開始するコンテキスト量（トークン、100000〜1000000）。未設定ならモデルに応じた既定値を使います。',
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
            switchModelsOnFlag: {
                label: '警告時に自動でモデル切替（switchModelsOnFlag）',
                desc: '安全性分類でリクエストが検出されたとき、代替モデルへ自動で切り替えて継続します。無効にすると一時停止して選択を求めます。既定は有効です。',
            },
            inputNeededNotifEnabled: {
                label: '入力待ち通知（inputNeededNotifEnabled）',
                desc: 'Remote Control 接続中、権限確認や質問への入力が必要になったときスマートフォンへ通知します。既定は無効です。',
            },
            agent: {
                label: '既定エージェント（agent）',
                desc: 'メインスレッドを指定した名前のサブエージェントとして実行し、そのプロンプト・ツール制限・モデルを適用します。',
            },
            crossSessionInbound: {
                label: '他セッションからのメッセージ（crossSessionInbound）',
                desc: '自分の他の Claude Code セッションから届いたメッセージの扱い。accept=Claude へ渡す、hold=通知のみで保留、refuse=破棄。未設定時はメッセージごとに判断します。',
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
                desc: '入力欄に次の入力の予測をグレー表示します。false で非表示にします。',
            },
            terminalTitleFromRename: {
                label: 'セッション名を端末タイトルに（terminalTitleFromRename）',
                desc: '/rename や --name で付けたセッション名を端末タブのタイトルに表示します。false にすると会話から生成したタイトルのままにします。',
            },
            timeFormat: {
                label: '時刻の表示形式（timeFormat）',
                desc: '画面に表示する時刻の形式。auto=ロケールに従う、12-hour / 24-hour / 24-hour-utc のほか、%H:%M などの strftime パターンも指定できます。',
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
            dialogExpiry: {
                label: 'リモートダイアログの期限（dialogExpiry）',
                desc: 'Remote Control などリモートへ転送したダイアログの応答期限。期限が過ぎると取り消して既定の動作で続行します。never は期限なしです。',
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
                desc: '成功したコマンドの出力を Claude へそのまま渡す文字数（4000〜128000）。超えた分はファイルに保存してプレビューだけを渡します。未設定時は 30000 です。',
            },
            defaultShell: {
                label: '既定シェル（defaultShell）',
                desc: '入力欄で ! コマンドを実行するときのシェルを bash または powershell から選びます。',
            },
            feedbackSurveyRate: {
                label: 'フィードバック調査率（feedbackSurveyRate）',
                desc: '条件を満たしたセッションで品質アンケートを表示する確率を 0～1 で指定します。0 で完全に抑止します。',
            },
            feedbackDrafts: {
                label: 'Claude によるフィードバック下書き（feedbackDrafts）',
                desc: 'Claude が送信前のフィードバック下書きを作成するか。notify=作成時にカード表示、quiet=カードなしで作成、off=作成しない。',
            },
            includeGitInstructions: {
                label: 'Git指示を含める（includeGitInstructions）',
                desc: '組み込みのコミット・PR手順と git status のスナップショットをシステムプロンプトへ含めます。既定は有効です。',
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
            workflowSizeGuideline: {
                label: 'ワークフロー規模の目安（workflowSizeGuideline）',
                desc: '動的ワークフローで目標とするエージェント数の目安。unrestricted=無制限、small / medium（既定）/ large の順に大きくなります。',
            },
            enableWorkflows: {
                label: 'ワークフローを有効化（enableWorkflows）',
                desc: '動的ワークフローを自分だけ有効または無効にします。未設定時はプランの既定に従います（Pro プランは無効）。',
            },
            disableWorkflows: {
                label: 'ワークフローを無効化（disableWorkflows）',
                desc: '動的ワークフローと同梱のワークフローコマンドを無効にします。既定は無効です。',
            },
            disableBundledSkills: {
                label: '同梱スキルを無効化（disableBundledSkills）',
                desc: 'Claude Code 同梱のスキルとワークフローを取り除きます。プラグインや .claude 配下のスキルには影響しません。',
            },
            syncClaudeAiSkills: {
                label: 'claude.ai のスキル同期（syncClaudeAiSkills）',
                desc: 'false にすると claude.ai のアカウントで有効なスキルの同期と読み込みを止め、同期済みのスキルを ~/.claude/skills/.trash へ移します。',
            },
            syncClaudeAiPlugins: {
                label: 'claude.ai のプラグイン同期（syncClaudeAiPlugins）',
                desc: 'false にすると claude.ai のアカウントで有効なプラグインの同期と読み込みを止め、同期済みのプラグインを ~/.claude/plugins/.trash へ移します。',
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
                desc: '各ターンでモデルへ渡すスキル一覧に予約するコンテキスト比率です。0 より大きく 1 以下で指定します。既定は 0.01（1%）です。',
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
            processWrapper: {
                label: 'プロセス起動ラッパー（processWrapper）',
                desc: 'Claude Code が起動するバックグラウンドプロセスの前に差し込む企業向けランチャーコマンドです。',
            },
            prUrlTemplate: {
                label: 'PRリンク書式（prUrlTemplate）',
                desc: 'PRバッジのURLテンプレートです。{host}、{owner}、{repo}、{number}、{url} を置換できます。',
            },
            forceLoginMethod: {
                label: 'ログイン方法の限定（forceLoginMethod）',
                desc: 'ログインできるアカウント種別を限定します。claudeai=Claude.ai、console=Claude Console、gateway=クラウドゲートウェイ。',
            },
            forceLoginGatewayUrl: {
                label: 'ログイン先ゲートウェイ URL（forceLoginGatewayUrl）',
                desc: '/login のクラウドゲートウェイ画面が接続するゲートウェイの URL（スキームを含む完全な URL）。',
            },
            remoteDefaultEnvironmentId: {
                label: '既定クラウド環境（remote.defaultEnvironmentId）',
                desc: 'claude --cloud などで作成するクラウドセッションの既定環境 ID です。/remote-env で選ぶとここへ保存されます。',
            },
            worktreeBaseRef: {
                label: 'Worktree分岐元（worktree.baseRef）',
                desc: '新しい worktree の分岐元。fresh=origin の既定ブランチ（既定）、head=現在のローカル HEAD。',
            },
            worktreeBgIsolation: {
                label: 'バックグラウンド分離（worktree.bgIsolation）',
                desc: 'バックグラウンドセッションの分離方法。worktree=EnterWorktree まで本体の編集を禁止（既定）、none=作業コピーを直接編集。',
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
                desc: 'false にすると、セッション出力を claude.ai の非公開ページとして公開する Artifact ツールを無効にします。true は未設定と同じです。',
            },
            disableAutoMode: {
                label: '自動モードを禁止（disableAutoMode）',
                desc: '値を disable にすると自動モードを Shift+Tab の切り替えから外し、自動モードで始まるはずのセッションも default モードで開始します。',
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
            modelPicker: {
                label: 'モデル選択肢（modelPicker）',
                desc: '/model の選択肢に表示するモデルと表示名を指定し、組み込みの選択肢に追加または置き換えます。',
            },
            modelSettings: {
                label: 'モデルごとの設定（modelSettings）',
                desc: 'モデルごとに保存した思考の労力、労力の上限、自動コンパクト閾値です。/effort や /model で選んだ労力がここへ保存されます。',
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
                desc: '@ ファイル補完の候補を生成する外部コマンドの設定です。type（"command"）と command が必須です。',
            },
            hooks: {
                label: 'ライフサイクルフック（hooks）',
                desc: 'Claude Code の各ライフサイクルイベントで実行するコマンド、HTTP、プロンプト等のフック定義です。',
            },
            permissionsDefaultMode: {
                label: '既定の権限モード（permissions.defaultMode）',
                desc: 'セッション開始時の権限モード。default=初回使用時に確認、acceptEdits=ファイル編集を自動承認、plan=プランモードで開始、auto=自動モードで開始、dontAsk=確認が必要な操作を自動で拒否、bypassPermissions=すべての権限確認をスキップ、manual=default の別名。',
            },
            permissionsDisableBypassPermissionsMode: {
                label: 'bypassPermissions の禁止（permissions.disableBypassPermissionsMode）',
                desc: '"disable" を設定すると bypassPermissions モードを使用できなくします。',
            },
            permissionsBlockReadsOutsideWorkingDirectories: {
                label: '作業ディレクトリ外の読み取りを禁止（permissions.blockReadsOutsideWorkingDirectories）',
                desc: 'すべての権限モードで、Read / Grep / Glob / LSP による作業ディレクトリ外の読み取りを拒否します。',
            },
            skipDangerousModePermissionPrompt: {
                label: 'bypassPermissions の確認を省略（skipDangerousModePermissionPrompt）',
                desc: '--dangerously-skip-permissions や defaultMode: bypassPermissions で危険モードに入る際の確認画面を省略します。',
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
                desc: 'ツール使用を拒否する権限ルールの配列です。機密ファイルへのアクセス制限にも使えます。',
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
                desc: 'サンドボックスの依存機構が使えない場合、起動を失敗させます。',
            },
            sandboxAllowUnsandboxedCommands: {
                label: '非サンドボックス実行許可（sandbox.allowUnsandboxedCommands）',
                desc: 'サンドボックス外での実行を許可します。無効にすると厳格サンドボックスになります。',
            },
            sandboxAutoAllowBashIfSandboxed: {
                label: 'サンドボックス時に自動許可（sandbox.autoAllowBashIfSandboxed）',
                desc: 'サンドボックス内で実行される Bash コマンドを自動承認します。',
            },
            sandboxAllowAppleEvents: {
                label: 'Apple Events 許可（sandbox.allowAppleEvents）',
                desc: 'macOS の Apple Events 送信を許可します。サンドボックス内のコマンドが他アプリを起動できるようになります。',
            },
            sandboxEnableWeakerNetworkIsolation: {
                label: '弱いネットワーク分離（sandbox.enableWeakerNetworkIsolation）',
                desc: 'ネットワーク分離を弱いモードで動作させます。',
            },
            sandboxEnableWeakerNestedSandbox: {
                label: '弱いネストサンドボックス（sandbox.enableWeakerNestedSandbox）',
                desc: 'Docker コンテナ内などネスト環境向けに弱いサンドボックスを使用します。',
            },
            sandboxFilesystemDisabled: {
                label: 'ファイルシステム分離無効（sandbox.filesystem.disabled）',
                desc: 'サンドボックスのファイルシステム分離を無効にし、読み書きを制限しなくなります。ネットワーク分離は維持されます（v2.1.216 以降）。',
            },
            sandboxNetworkHttpProxyPort: {
                label: 'HTTP プロキシポート（sandbox.network.httpProxyPort）',
                desc: 'サンドボックスのネットワーク分離が使う HTTP プロキシのポート番号。',
            },
            sandboxNetworkSocksProxyPort: {
                label: 'SOCKS プロキシポート（sandbox.network.socksProxyPort）',
                desc: 'サンドボックスのネットワーク分離が使う SOCKS プロキシのポート番号。',
            },
            sandboxNetworkStrictAllowlist: {
                label: '許可ドメイン外を拒否（sandbox.network.strictAllowlist）',
                desc: '許可リスト外のホストへの接続を確認せずに拒否します。既定は無効（確認を表示）です。',
            },
            sandboxNetworkAllowAllUnixSockets: {
                label: 'Unix ソケットを全許可（sandbox.network.allowAllUnixSockets）',
                desc: 'サンドボックス内からすべての Unix ソケット接続を許可します。Linux / WSL2 で Unix ソケットを使う唯一の方法です。既定は無効です。',
            },
            sandboxNetworkAllowLocalBinding: {
                label: 'localhost バインド許可（sandbox.network.allowLocalBinding）',
                desc: 'サンドボックス内から localhost のポートを待ち受けできるようにします（macOS のみ）。既定は無効です。',
            },
            sandboxCredentialsAllowPlaintextInject: {
                label: '平文 HTTP への値差し込み許可（sandbox.credentials.allowPlaintextInject）',
                desc: 'マスクした資格情報の実値を平文 HTTP リクエストにも差し込みます。信頼できる試験環境以外では無効のままにしてください。既定は無効です。',
            },
            sandbox: {
                label: 'サンドボックス詳細（sandbox）',
                desc: '除外コマンド、読書き可能パス、許可ドメイン、資格情報など上記以外の構造設定を含むオブジェクトです。',
            },
            statusLine: {
                label: 'ステータスライン（statusLine）',
                desc: 'ステータスラインに表示する内容を出力するコマンドの設定です。type（"command"）と command が必須で、padding（水平方向の余白）、refreshInterval（再実行する間隔の秒数）、hideVimModeIndicator（Vim モード表示の抑制）も指定できます。',
            },
            subagentStatusLine: {
                label: 'サブエージェント用ステータスライン（subagentStatusLine）',
                desc: 'サブエージェント表示用のステータスラインを出力するコマンドの設定です。type（"command"）と command が必須です。',
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
                desc: '追加できる MCP サーバーをサーバー名・起動コマンド・URL パターンで許可します。一致しないサーバーは定義元にかかわらずブロックされます。',
            },
            deniedMcpServers: {
                label: 'MCP サーバー拒否リスト（deniedMcpServers）',
                desc: 'サーバー名・起動コマンド・URL パターンに一致する MCP サーバーの読み込みを拒否します。許可リストより優先されます。',
            },
            allowedHttpHookUrls: {
                label: 'HTTPフック許可URL（allowedHttpHookUrls）',
                desc: 'HTTP フックが対象にできる URL パターンの許可リストです。* をワイルドカードとして使えます。',
            },
            httpHookAllowedEnvVars: {
                label: 'HTTPフック許可環境変数（httpHookAllowedEnvVars）',
                desc: 'HTTP フックがヘッダーへ展開できる環境変数名の許可リストです。',
            },
            claudeMdExcludes: {
                label: 'CLAUDE.md除外（claudeMdExcludes）',
                desc: 'メモリ読み込み時にスキップする CLAUDE.md のグロブパターンまたは絶対パスです。',
            },
            forceLoginOrgUUID: {
                label: 'ログイン許可組織（forceLoginOrgUUID）',
                desc: 'ログインを許可する Anthropic 組織の UUID です。単一の文字列でも配列でも指定できます。',
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
