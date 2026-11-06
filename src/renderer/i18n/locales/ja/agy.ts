export default {
    nav: {
        group: 'Agy',
        mcp: 'Agy CLI MCP 管理',
        assets: 'Agy CLI Agent・Skill 管理',
        plugins: 'Agy CLI プラグイン管理',
        settings: 'Agy CLI 設定',
        cleanup: 'Agy CLI クリーンアップ',
    },
    noEnvironment:
        'Agy CLI が見つかりません。Windows または WSL で agy コマンドを使えるように Antigravity CLI を導入してから、「再取得」を押してください。',
    dashboard: {
        group: 'Agy（Antigravity CLI）',
        mcpDesc: 'Agy CLI が使うグローバル MCP サーバーを有効化/無効化/並べ替えします。',
        assetsDesc: 'Agy CLI のカスタムエージェントと、グローバルスキルディレクトリを管理します。',
        pluginsDesc: 'Agy CLI と Gemini 共通のプラグインディレクトリでプラグインを管理します。',
        settingsDesc: 'Agy CLI の設定を項目別または JSON の直接編集で変更します。',
        cleanupDesc: 'Agy CLI のキャッシュ、ログ、履歴、会話データを選択して削除します。',
    },
    mcp: {
        title: 'Agy CLI MCP 管理',
        wslSection: 'WSL: {{distro}}',
        notFound: '~/.gemini/config/mcp_config.json がありません。',
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
        title: 'Agy CLI Agent・Skill 管理',
        descriptionText:
            'Agy CLI のカスタムエージェント・スキルを一覧表示し、選択したものを ZIP でまとめてダウンロード、または ZIP／md をアップロードして取り込みます。',
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
        noEntryFile:
            'このアーカイブには取り込む対象がありません。各フォルダーに SKILL.md（スキル）または agent.md（エージェント）が必要です。',
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
            overriddenBy: '使われません（{{origin}} が優先されます）',
            overriddenByHint: '{{origin}} にある同じ名前のスキルがこのスキルより優先されます。',
            sameNameIn: '{{origin}} にも同じ名前があります',
            sameNameInHint: '{{origin}} にも同じ名前のスキルがあります。',
        },
        origin: {
            cli: '~/.gemini/antigravity-cli/skills',
            shared: '~/.gemini/skills',
            config: '~/.gemini/config/skills',
        },
        overwriteTitle: '同名の項目を上書きしますか？',
        overwriteBody: '次の {{count}} 件は既に存在します。削除して置き換えます: {{names}}。続行しますか？',
    },
    plugins: {
        title: 'Agy CLI プラグイン管理',
        description: 'Agy CLI のプラグインを一覧・追加・削除し、有効と無効を切り替えます。',
        invalidNameNote:
            'プラグイン名（plugin.json の name、無ければフォルダー名）が「-」で始まるか、CLI に渡せない文字を含むため、この画面では有効化・無効化・削除できません。',
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
        },
        sharedNotice: 'このファイルは Antigravity の App や IDE と共有しています。',
        externalCommands: {
            sidecarsTitle: 'サイドカー',
        },
        permissions: {
            allow: '許可（allow）',
            ask: '確認（ask）',
            deny: '拒否（deny）',
        },
        rules: {
            filesTitle: 'ファイル',
            manifestTitle: 'rules.json',
        },
    },
    settings: {
        title: 'Agy CLI 設定',
        description:
            'Agy CLI の設定、フック、権限、指示ファイルなどを編集します。主な設定ファイルは ~/.gemini/antigravity-cli/settings.json です。',
        wslSection: 'WSL: {{distro}}',
        item: '項目',
        value: '値',
        directEdit: '直接編集',
        directTitle: 'settings.json を直接編集',
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
        invalidJson: 'JSON の構文が正しくありません',
        invalidExisting: '既存の JSON が壊れています。先に直接編集で修正してください。',
        verifyFailed:
            '編集結果の検証に失敗したため保存を中止しました。ファイルは変更されていません。この項目は「直接編集」で変更してください。',
        unavailable: 'この環境の設定へアクセスできません。',
        group: {
            appearance: '表示',
            behavior: '動作',
            security: 'セキュリティ',
            data: 'アカウント・データ',
            advanced: '直接編集',
        },
        field: {
            colorScheme: {
                label: 'カラースキーム（colorScheme）',
                desc: 'ターミナル UI の配色です。terminal はターミナルの配色を使います。',
            },
            altScreenMode: {
                label: '描画モード（altScreenMode）',
                desc: 'TUI がターミナルの代替画面を使う範囲です。default は全画面表示だけ、always は TUI 全体で使い、never は使いません。',
            },
            notifications: {
                label: '通知（notifications）',
                desc: 'エージェントが承認や回答を待つときとターンを終えたときに、ターミナルのベルを鳴らしてデスクトップ通知を表示します。',
            },
            showTips: { label: 'ヒント表示（showTips）', desc: '応答の生成中に操作ヒントを表示します。' },
            showFeedbackSurvey: {
                label: 'フィードバック調査（showFeedbackSurvey）',
                desc: 'タスクの完了後に、ときどき簡単なフィードバック調査を表示します。',
            },
            verbosity: {
                label: '詳細度（verbosity）',
                desc: '会話に表示する作業の量です。high はツール呼び出しと思考をすべて表示し、medium は関連する手順を要約し、low は応答だけを表示してツールの動作をトークン使用量の要約にまとめます。',
            },
            runningLightSpeed: {
                label: 'アニメーション速度（runningLightSpeed）',
                desc: '進行状況インジケーターのアニメーション速度です。off はアニメーションを止めます。',
            },
            hideActiveItems: {
                label: '実行中の項目を隠す（hideActiveItems）',
                desc: 'プロンプト入力欄の下に出る、実行中のサブエージェントとバックグラウンドタスクの一覧を隠します。',
            },
            useTerminalCursor: {
                label: 'ターミナルのカーソルを使う（useTerminalCursor）',
                desc: 'ブロックカーソルの代わりに、ターミナル自身のカーソル形状を使います。',
            },
            clearScrollbackOnResize: {
                label: '再描画時にスクロールバックを消去（clearScrollbackOnResize）',
                desc: 'ウィンドウのリサイズ後など、CLI が会話を再描画するときにターミナルのスクロールバックを消去します。無効は以前の出力を残します。',
            },
            editor: {
                label: 'エディター（editor）',
                desc: '成果物やファイルを開くときと、Ctrl+G でプロンプトを作成するときに使う外部エディターです。auto は $EDITOR を使います。',
            },
            editorMode: {
                label: 'エディターモード（editorMode）',
                desc: 'プロンプトの編集方式です。default は通常のテキスト編集、vim はモーダル編集です。',
            },
            vimInsertFirst: {
                label: 'Insert モードで開始（vimInsertFirst）',
                desc: 'Vim 編集で各プロンプトを Insert モードから始め、Enter だけで送信します。',
            },
            copyOnSelect: {
                label: '選択時にコピー（copyOnSelect）',
                desc: 'マウスの選択を離したときに、選択した文字列をクリップボードへコピーします。',
            },
            queuedMessages: {
                label: '待機メッセージ（queuedMessages）',
                desc: 'エージェントの作業中に送ったメッセージの扱いです。queue は現在のターンが終わるまで待機させ、send-immediately はエージェントを中断してすぐに送ります。',
            },
            pickerGrouping: {
                label: '会話一覧のまとめ方（pickerGrouping）',
                desc: '/resume の会話一覧の並べ方です。none は新しい順の 1 つの一覧、grouped はワークスペースごとにまとめます。',
            },
            historySize: {
                label: 'プロンプト履歴の保存件数（historySize）',
                desc: 'ディスクに残すプロンプト履歴の件数です。-1 はすべて残し、0 は履歴を消します。',
            },
            disableSlashCommands: {
                label: 'スラッシュコマンドを無効化（disableSlashCommands）',
                desc: 'ヘッドレスモード（-p）で / から始まるプロンプトを、入力したとおりモデルへ送ります。',
            },
            toolPermission: {
                label: 'ツール権限（toolPermission）',
                desc: 'エージェントがツールを使う前に確認する範囲です。request-review は書き込み、シェル、Web、MCP のツールの前に確認し、proceed-in-sandbox はサンドボックス内のコマンドを確認なしで実行し、always-proceed はコマンド、Web 要求、MCP ツールを確認なしで実行し、strict はファイルの読み取りを含むすべての操作の前に確認します。',
            },
            agentMode: {
                label: 'エージェントモード（agentMode）',
                desc: 'CLI が起動するときの実行モードです。未設定はファイル編集の前に確認し、accept-edits はワークスペースのファイル編集を自動で承認し、auto は編集と安全なコマンドを自動で承認して取り消せない操作の前に確認し、plan は変更の前に調査と計画を行います。',
            },
            artifactReviewPolicy: {
                label: '成果物レビューポリシー（artifactReviewPolicy）',
                desc: '実装計画などの成果物についてフィードバックを求めるときに、エージェントがレビューを待つかどうかです。asks-for-review と agent-decides は待ち、always-proceed は待たずに続けます。',
            },
            allowNonWorkspaceAccess: {
                label: 'ワークスペース外アクセス（allowNonWorkspaceAccess）',
                desc: 'ワークスペースフォルダーの外にあるファイルの読み取りと編集をエージェントに許可します。',
            },
            enableTerminalSandbox: {
                label: 'サンドボックスモード（enableTerminalSandbox）',
                desc: 'エージェントのターミナルコマンドをターミナルサンドボックス内で実行します。',
            },
            model: {
                label: 'モデル（model）',
                desc: '/model で選んだモデルの表示名です。',
            },
            modelProvider: {
                label: 'モデルプロバイダー（modelProvider）',
                desc: 'モデルへの要求の送信先です。gemini は環境変数 GEMINI_API_KEY のキーで Gemini API へ直接送り、未設定はサインインしたアカウントで送ります。',
            },
            useG1Credits: {
                label: 'AI クレジットの使用（useG1Credits）',
                desc: 'プランのクォータを使い切った後のモデルへの要求に AI クレジットを使います。',
            },
            permissions: {
                label: '権限定義（permissions）',
                desc: 'エージェントのツールに対する許可、確認、拒否のルールです。',
            },
            statusLine: {
                label: 'ステータスライン（statusLine）',
                desc: 'プロンプト入力欄の下にステータスラインを描画する独自のスクリプトです。',
            },
            title: {
                label: 'ターミナルタイトル（title）',
                desc: 'ターミナルのウィンドウタイトルを設定する独自のスクリプトです。',
            },
            hooks: {
                label: 'フック（hooks）',
                desc: 'エージェントの操作の直前と直後に実行するスクリプトです。',
            },
            customModelsConfig: {
                label: 'カスタムモデル（customModelsConfig）',
                desc: '/model に追加する Gemini API のカスタムモデルです。',
            },
            sandboxProxy: {
                label: 'サンドボックスのプロキシ（sandboxProxy）',
                desc: 'サンドボックス内のターミナルコマンドの通信を、組み込みのプロキシの代わりに自分の HTTP プロキシへ送ります。',
            },
        },
    },
    cleanup: {
        title: 'Agy CLI クリーンアップ',
        description:
            '~/.gemini/antigravity-cli 配下のキャッシュ・ログ・クラッシュ・履歴・会話データと、自動更新で退避された旧バージョンの agy 実行ファイルを削除します。',
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
        item: {
            projects: {
                label: 'プロジェクト（ワークスペースのパス）',
                desc: 'ワークスペースのパスごとの会話。一緒に消えるもの: サブエージェントの会話と付随データ、入力履歴の該当行、直近の会話の記録、プロジェクト定義の該当フォルダ。',
            },
            'trusted-workspaces': {
                label: '信頼済みフォルダ（trustedWorkspaces）',
                desc: 'settings.json の trustedWorkspaces に登録された信頼済みフォルダ。',
            },
            cache: {
                label: 'cache',
                desc: 'Agy CLI のキャッシュ（ワークスペースごとの直近の会話など）。',
            },
            log: { label: 'log', desc: 'Agy CLI のログ（cli.log が指す最新ログを含む）。' },
            crashes: { label: 'crashes', desc: 'Agy CLI が生成したクラッシュレポート。' },
            conversations: {
                label: 'conversations',
                desc: '保存済みの会話。一緒に消えるもの: その会話の brain、annotations、chapter_titles、voice_chats、browser_recordings、worktrees、会話要約 DB の該当行、要約キャッシュの該当項目。',
            },
            annotations: {
                label: 'annotations',
                desc: '会話が無くなった後に残った注釈データ。',
            },
            'chapter-titles': {
                label: 'chapter_titles',
                desc: '会話が無くなった後に残ったチャプターのタイトル。',
            },
            'voice-chats': {
                label: 'voice_chats',
                desc: '会話が無くなった後に残った音声チャットの記録。',
            },
            'browser-recordings': {
                label: 'browser_recordings',
                desc: '会話が無くなった後に残ったブラウザの録画。',
            },
            brain: {
                label: 'brain',
                desc: '会話ごとの成果物と作業データ（トランスクリプトを含む）。',
            },
            scratch: {
                label: 'scratch',
                desc: 'エージェントの作業用ディレクトリ（生成した画像などの出力を含む）。',
            },
            worktrees: {
                label: 'worktrees',
                desc: 'サブエージェントが作業に使う Git worktree。一緒に消えるもの: 未コミットの変更。',
            },
            'conversation-summaries': {
                label: 'conversation_summaries.db',
                desc: '会話一覧（/resume）に使う会話要約データベース。',
            },
            'conversation-summaries-wal': {
                label: 'conversation_summaries.db-wal',
                desc: '会話要約 DB の WAL ファイル。',
            },
            'conversation-summaries-shm': {
                label: 'conversation_summaries.db-shm',
                desc: '会話要約 DB の共有メモリファイル。',
            },
            history: { label: 'history.jsonl', desc: 'プロンプトとコマンドの入力履歴。' },
            'update-lock': {
                label: 'updater/update.lock',
                desc: '停止した更新処理が残したロックファイル。',
            },
            'old-binaries': {
                label: '旧バージョンの agy 実行ファイル（*.old）',
                desc: '自動更新で退避された旧バージョンの実行ファイル。',
            },
        },
    },
};
