export default {
    nav: {
        group: 'OpenCode',
        mcp: 'OpenCode MCP 管理',
        assets: 'OpenCode Agent・Skill 管理',
        plugins: 'OpenCode プラグイン管理',
        settings: 'OpenCode 設定',
        cleanup: 'OpenCode クリーンアップ',
    },
    noEnvironment:
        'OpenCode 2 が見つかりません。この端末で OpenCode 2 を利用できることを確認してから、「再取得」を押してください。',
    dashboard: {
        group: 'OpenCode 2',
        mcpDesc: 'OpenCode のグローバル設定にある MCP サーバー（mcp.servers）を有効化/無効化/並べ替えします。',
        assetsDesc: 'OpenCode のエージェントとスキルを管理します。',
        pluginsDesc:
            'npm・Git のパッケージプラグインと、ローカルの TypeScript・JavaScript プラグイン（ファイル・フォルダー）を管理します。',
        settingsDesc: 'OpenCode の設定を編集します。',
        cleanupDesc:
            'OpenCode のキャッシュ、ログ、ツール出力、シェル出力、スナップショット、参照リポジトリ、入力履歴、セッション履歴を選択して削除します。',
    },
    mcp: {
        title: 'OpenCode MCP 管理',
        wslSection: 'WSL: {{distro}}',
        notFound: '~/.config/opencode/opencode.json と opencode.jsonc のどちらもありません。',
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
            'OpenCode のカスタムエージェント・スキルを一覧表示し、選択したものを ZIP でまとめてダウンロード、または ZIP／md をアップロードして取り込みます。',
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
        uploadSuccess: '{{count}} 件を取り込みました',
        uploadError: '取り込みに失敗しました',
        mdNoName: 'ファイルから name を取得できませんでした',
        invalidArchive: 'このアーカイブは取り込めません。壊れているか、取り込む対象が含まれていません。',
        noEntryFile: 'このアーカイブには取り込む対象がありません。各フォルダーに SKILL.md が必要です。',
        kindWarnTitle: '取り込まれないフォルダーがあります',
        kindWarnContinue: '残りを取り込む',
        kindWarnNoEntryFile:
            '次のフォルダーには定義ファイルがないため取り込みません: {{names}}。他の項目を取り込みますか？',
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
            overriddenBy: '{{origin}} が上書きします',
            overriddenByHint:
                '{{origin}} にある同じ名前のエージェントが後から読まれ、そこで指定した項目はこのファイルより優先されます。',
        },
        origin: {
            agents: 'agents/',
            agent: 'agent/',
            mode: 'mode/（primary）',
            modes: 'modes/（primary）',
        },
        overwriteTitle: '同名の項目を上書きしますか？',
        overwriteBody: '次の {{count}} 件は既に存在します。削除して置き換えます: {{names}}。続行しますか？',
    },
    plugins: {
        title: 'OpenCode プラグイン管理',
        description: 'OpenCode のプラグインを一覧・追加・削除し、有効と無効を切り替えます。',
        tuiNote: 'ターミナル UI 専用（cli.json）。この画面では有効化・無効化・削除できません。',
        disabledFileInvalid:
            '無効化したプラグインの退避ファイル（~/.config/opencode/opencode-disabled-plugins.json）の形式が正しくないため、無効化中のプラグインを表示できません。このファイルを修正するか削除するまで、plugins 設定のプラグインの有効化・無効化・削除とパッケージの導入は行えません。',
    },
    profile: {
        tab: {
            settings: '設定',
            externalCommands: '外部コマンド',
            permissions: '権限',
            instructions: '指示ファイル',
            commands: 'コマンド',
        },
        link: {
            commands: 'エージェント・スキル画面のコマンドタブで編集',
        },
        bothConfigFiles: 'opencode.json と opencode.jsonc の両方があり、opencode.jsonc を編集しています。',
        permissions: {
            legacyKey: '旧キー permission が残っています。',
        },
        instructions: {
            filesTitle: 'グローバル',
        },
        commands: {
            title: 'commands フォルダ',
            legacyTitle: 'command フォルダ（旧形式）',
            configTitle: '設定ファイルの commands',
            shadowedKeys: 'フォルダのファイルに隠れて使われていないコマンド: {{names}}',
        },
    },
    settings: {
        title: 'OpenCode 設定',
        description:
            'OpenCode の設定、権限、指示ファイルなどを編集します。主な設定ファイルは ~/.config/opencode/opencode.json または opencode.jsonc です。',
        wslSection: 'WSL: {{distro}}',
        item: '項目',
        value: '値',
        directEdit: '直接編集',
        directTitle: 'OpenCode の設定ファイルを直接編集',
        directDesc: '保存するとファイル全体を書き換えます。',
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
            modelObjectForm: 'オブジェクト形式で設定されています。値を変更して保存すると文字列形式になります。',
            modelUnsupported:
                'providerID・model・variant 以外のキーや想定外の値を含むため、表では編集できません（編集すると内容が失われます）。',
            jsonAlsoExists:
                'opencode.json と opencode.jsonc の両方があります。この画面は opencode.jsonc を編集します。',
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
                desc: 'セッションやエージェントでモデルを選んでいないときに使う既定モデルで、provider/model 形式です。',
            },
            defaultAgent: {
                label: '既定エージェント（default_agent）',
                desc: 'セッションでエージェントを選んでいないときに使うプライマリエージェントです。',
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
                desc: '更新の扱いです。disable は確認しない、notify はインストール前に通知、auto は自動でインストールします。',
            },
            snapshots: {
                label: 'スナップショット（snapshots）',
                desc: '元に戻す・巻き戻しに使うファイルのスナップショットを記録します。',
            },
            timezone: {
                label: 'タイムゾーン（timezone）',
                desc: 'スケジュールに使う IANA タイムゾーンです（例: America/Los_Angeles）。既定はサーバーのローカルのタイムゾーンです。',
            },
            worktreeDirectory: {
                label: 'ワークツリーの作成先（worktree.directory）',
                desc: '新しいワークツリーを作る親フォルダーです。相対パスはプロジェクトの元のチェックアウトから解決します。',
            },
            websearch: {
                label: 'Web 検索（websearch）',
                desc: 'Web 検索のプロバイダーを provider で指定し、random は使えるものを自動で選びます。false は Web 検索ツールを外します。',
            },
            warming: {
                label: 'ウォーミング（warming）',
                desc: '直近に使ったセッションを定期的な一時リクエストで温めておきます。true は 4 分間隔で 30 分間、オブジェクトは prompt・interval・duration を指定します。',
            },
            formatter: {
                label: 'フォーマッター（formatter）',
                desc: 'write・edit・patch ツールで変更したファイルを整形します。true は使える組み込みフォーマッターを有効にし、オブジェクトはさらにフォーマッターごとに設定します。',
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
                desc: 'プロバイダー・ツール・連携・MCP サーバー・スキル・プラグインを許可・拒否するポリシーを順に並べます。',
            },
            mcpTimeoutStartup: {
                label: '起動タイムアウト（mcp.timeout.startup）',
                desc: 'MCP サーバーの接続と初期化を待つ時間（ミリ秒）です。',
            },
            mcpTimeoutCatalog: {
                label: '一覧取得タイムアウト（mcp.timeout.catalog）',
                desc: 'ツール・プロンプト・リソースの一覧取得を待つ時間（ミリ秒）です。',
            },
            mcpTimeoutExecution: {
                label: '実行タイムアウト（mcp.timeout.execution）',
                desc: 'ツール呼び出し・プロンプト取得・リソース読み取りを待つ時間（ミリ秒）です。',
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
                desc: 'コンテキストが上限に近づいたとき会話を自動的に圧縮します。',
            },
            compactionKeepTokens: {
                label: '保持トークン数（compaction.keep.tokens）',
                desc: '圧縮時に要約と並べて残す直近の会話のおおよそのトークン数です。',
            },
            compactionBuffer: {
                label: 'コンテキストの空き（compaction.buffer）',
                desc: '自動圧縮を始める前にコンテキストウィンドウに空けておく量で、"20%" のような割合かトークン数です。既定は "15%" で、最低 16,000 トークンです。',
            },
            skills: {
                label: '追加スキルソース（skills）',
                desc: 'スキルを追加で探すフォルダーと HTTP カタログの URL です。',
            },
            instructions: {
                label: '追加の指示ファイル（instructions）',
                desc: '追加で読み込む指示ファイルのパス、glob、URL です。~/ で始まるパスはホーム基準で展開します。',
            },
            commands: {
                label: 'コマンド（commands）',
                desc: '名前付きのスラッシュコマンド（プロンプトのテンプレート）を定義します。',
            },
            references: {
                label: '参照（references）',
                desc: '会話で名前付きのコンテキストとして使うローカルフォルダーや Git リポジトリです。',
            },
            plugins: { label: 'プラグイン（plugins）', desc: 'プラグイン管理画面または直接編集で変更します。' },
            experimentalSubagentDepth: {
                label: 'サブエージェント深度（experimental.subagent_depth）',
                desc: 'サブエージェントの最大ネスト深度です。',
            },
            experimentalTodo: {
                label: 'ToDo ツール（experimental.todo）',
                desc: 'エージェントが複数の手順の作業を管理する todowrite ツールを有効にします。',
            },
            experimentalBackgroundCompaction: {
                label: 'バックグラウンド圧縮（experimental.background_compaction）',
                desc: '会話が圧縮のしきい値に近づくと要約をバックグラウンドで作り、圧縮が必要になったときに差し替えます。使われなかった要約にもトークンがかかります。',
            },
            experimentalMediaBlob: {
                label: 'メディアの重複排除保存（experimental.media_blob）',
                desc: '新しいセッションのメディアを、重複を除いた blob テーブルに 1 度だけ保存します。',
            },
            experimentalSchedules: {
                label: 'スケジュール（experimental.schedules）',
                desc: 'プロンプトでセッションを起こす実験的なスケジュールタスクを有効にします。',
            },
            experimentalArtifacts: {
                label: 'アーティファクト（experimental.artifacts）',
                desc: '差し替え可能なプロバイダーで動く実験的なアーティファクトを有効にします。',
            },
            experimentalImageGenerate: {
                label: '画像生成ツール（experimental.image_generate）',
                desc: 'experimental_image_generate ツールの設定です。model は既定のモデルを指定し、false はツールを無効にします。',
            },
            experimentalLocationIdleTimeout: {
                label: '場所のアイドル解放時間（experimental.location_idle_timeout）',
                desc: 'セッションの動きがない場所のサービスを解放するまでの時間で、"2 hours" のような期間です。false は解放せず、既定は "60 minutes" です。',
            },
        },
    },
    cleanup: {
        title: 'OpenCode クリーンアップ',
        description:
            'OpenCode のキャッシュ・ログ・ツール出力・シェル出力・スナップショット・参照リポジトリ・入力履歴・セッション履歴を削除します。',
        wslSection: 'WSL: {{distro}}',
        noCandidates: '削除候補はありません',
        name: '項目',
        descriptionColumn: '説明',
        files: 'ファイル数',
        size: 'サイズ',
        deleteSelected: '選択済みを削除',
        confirmTitle: 'クリーンアップの確認',
        confirmBody: '選択した {{count}} 件を削除します。この操作は元に戻せません。',
        cancel: 'キャンセル',
        deleteSuccess: 'クリーンアップが完了しました',
        deleteError: 'クリーンアップに失敗しました',
        confirmWarning: {
            projects:
                'そのパスのセッションと依存データ、パスの記録、スナップショットを削除します。統計からも減ります。',
        },
        item: {
            cache: {
                label: '~/.cache/opencode',
                desc: 'ripgrep などのツール、パッケージプラグインの導入先、リモートスキルのキャッシュ、更新に備えて保持される実行ファイルのリンク。',
            },
            logs: { label: 'log', desc: 'OpenCode のログと、CPU プロファイル・ヒープスナップショット。' },
            'tool-output': {
                label: 'tool-output',
                desc: '切り詰められたツール結果の全文。',
            },
            'shell-output': {
                label: 'shell',
                desc: 'シェルツールで実行したコマンドの出力。',
            },
            snapshot: {
                label: 'snapshot',
                desc: '変更の取り消し・巻き戻しに使うファイルのスナップショット。',
            },
            repos: {
                label: 'repos',
                desc: '参照（references）に登録した Git リポジトリのクローン。',
            },
            'prompt-history': { label: 'prompt-history.jsonl', desc: 'ターミナル UI のプロンプト入力履歴。' },
            frecency: {
                label: 'frecency.jsonl',
                desc: 'ターミナル UI でファイルの候補を並べる順序に使う利用履歴。',
            },
            sessions: {
                label: 'sessions',
                desc: 'OpenCode のセッション履歴（会話）。一緒に消えるもの: サブセッション。',
            },
            projects: {
                label: 'projects',
                desc: 'ワークスペースのパスごとのセッション。一緒に消えるもの: セッションの依存データ、パスの記録、スナップショット。',
            },
        },
    },
};
