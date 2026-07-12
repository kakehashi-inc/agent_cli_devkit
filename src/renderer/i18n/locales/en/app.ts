// アプリ共通（agent 非依存）の文言。
// agent 固有の文言は claude.ts / codex.ts に置く。
export default {
    app: {
        title: 'Agent CLI DevKit',
    },
    nav: {
        dashboard: 'Dashboard',
    },
    dashboard: {
        title: 'Dashboard',
        subtitle: 'Select a feature to use.',
    },
    theme: {
        light: 'Light',
        dark: 'Dark',
    },
    language: {
        en: 'English',
        ja: '日本語',
    },
    menu: {
        exit: 'Exit',
    },
    common: {
        error: 'Error',
        success: 'Success',
        loading: 'Loading...',
        refresh: 'Refresh',
    },
    updater: {
        confirm: 'A new version v{{version}} is available. Update now?',
        update: 'Update',
        later: 'Later',
        downloading: 'Downloading... {{progress}}%',
        installing: 'Applying the update...',
        error: 'Update failed: {{error}}',
        retry: 'Retry',
        dismiss: 'Dismiss',
    },
};
