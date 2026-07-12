// アプリ共通（agent 非依存）の文言。
// agent 固有の文言は claude.ts / codex.ts に置く。
export default {
    app: {
        title: 'Agent CLI DevKit',
    },
    nav: {
        dashboard: 'ダッシュボード',
    },
    dashboard: {
        title: 'ダッシュボード',
        subtitle: '利用する機能を選択してください。',
    },
    theme: {
        light: 'ライト',
        dark: 'ダーク',
    },
    language: {
        en: 'English',
        ja: '日本語',
    },
    menu: {
        exit: '終了',
    },
    common: {
        error: 'エラー',
        success: '成功',
        loading: '読み込み中...',
        refresh: '再取得',
    },
    updater: {
        confirm: '新しいバージョン v{{version}} が利用可能です。アップデートしますか？',
        update: 'アップデート',
        later: '後で',
        downloading: 'ダウンロード中… {{progress}}%',
        installing: 'アップデートを適用しています…',
        error: 'アップデートに失敗しました: {{error}}',
        retry: '再試行',
        dismiss: '閉じる',
    },
};
