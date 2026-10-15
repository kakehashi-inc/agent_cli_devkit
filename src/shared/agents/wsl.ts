// ============================================================
// WSL で agent CLI を扱うときの bash の共通断片（agent 非依存）
// wsl.exe の引数として渡すため、どの断片も二重引用符を使わない。
// ============================================================

// PATH の末尾に加える、agent CLI のユーザー単位の導入先（bun のグローバル導入先・OpenCode の公式インストーラ・
// ~/.local/bin）。`bash -lc`（非対話のログインシェル）では、インストーラが .bashrc に加えた PATH の追記が効かない
// （Ubuntu の .bashrc は非対話シェルでは先頭で抜ける）ため、これらの場所が PATH に無いことがある。
const WSL_USER_BIN_DIRS = ['~/.bun/bin', '~/.opencode/bin', '~/.local/bin'];

// WSL_USER_BIN_DIRS のうち PATH に無いものを PATH の末尾へ加える bash の断片。CLI の存在確認と実行の前に置き、
// 両者が同じ PATH を見るようにする。末尾に加えるため、PATH で既に解決できるコマンドの解決先は変わらない。
// チルダ展開の結果・代入・case の語は単語分割されないため、二重引用符が無くても空白を含むパスを扱える。
export const WSL_CLI_PATH_SETUP =
    `for d in ${WSL_USER_BIN_DIRS.join(' ')}; do` +
    ' case :$PATH: in *:$d:*) ;; *) PATH=$PATH:$d ;; esac;' +
    ' done; export PATH';

/** bash 用のシングルクオート囲み（' は '\'' に展開）。 */
export function shellQuotePosix(arg: string): string {
    return `'${arg.replace(/'/g, `'\\''`)}'`;
}

/**
 * cli の実行ファイルを PATH の順に探し、最初に見つかったもののパスを変数 c に入れる bash の断片（無ければ c は空）。
 * Windows 側のドライブ（/mnt/ 配下）にある同名のコマンドは、distro に導入された CLI ではないため除く。
 * case の語と代入の右辺は単語分割されないため、二重引用符が無くても空白を含むパスを扱える。
 */
export function wslFindCliScript(cli: string): string {
    return (
        'c=; while IFS= read -r p; do case $p in /mnt/*) ;; *) c=$p; break ;; esac; done' +
        ` < <(type -aP ${shellQuotePosix(cli)})`
    );
}

/**
 * WSL_CLI_PATH_SETUP を加えた PATH で、wslFindCliScript と同じ規則で cli が見つかるときだけ成功する bash の判定式。
 * CLI 本体は実行しない。
 */
export function wslCliTest(cli: string): string {
    return `${WSL_CLI_PATH_SETUP}; ${wslFindCliScript(cli)}; [ \${#c} -gt 0 ]`;
}
