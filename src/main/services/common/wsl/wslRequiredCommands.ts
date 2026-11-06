// distro のスクリプトが使う、無いと機能が動かないコマンド。
const REQUIRED_COMMANDS = [
    'awk',
    'base64',
    'cat',
    'chmod',
    'cp',
    'cut',
    'find',
    'head',
    'id',
    'mkdir',
    'mktemp',
    'mv',
    'readlink',
    'rm',
    'rmdir',
    'sha256sum',
    'stat',
    'tail',
    'touch',
    'tr',
];

// GNU 版が前提のオプションの確認。コマンドはあるが動かなければ、この名前で報告する。
const GNU_CHECKS: readonly { name: string; command: string; test: string }[] = [
    { name: 'find (GNU)', command: 'find', test: "find /dev/null -maxdepth 0 -printf ''" },
    { name: 'stat (GNU)', command: 'stat', test: 'stat -c %s /dev/null' },
    { name: 'readlink (GNU)', command: 'readlink', test: 'readlink -f /' },
];

const MISSING_PREFIX = 'MISSING ';

/** エージェントを使っている distro のときだけ、足りないコマンドを 1 行ずつ出力するスクリプト。 */
export function buildMissingCommandsScript(agentTests: readonly string[]): string {
    const anyAgent = agentTests.map(test => `( ${test} ) >/dev/null 2>&1`).join(' || ');
    return [
        `if ${anyAgent}; then`,
        `    for c in ${REQUIRED_COMMANDS.join(' ')}; do`,
        `        command -v "$c" >/dev/null 2>&1 || printf '${MISSING_PREFIX}%s\\n' "$c"`,
        '    done',
        ...GNU_CHECKS.map(
            check =>
                `    if command -v ${check.command} >/dev/null 2>&1 && ! ${check.test} >/dev/null 2>&1; then printf '${MISSING_PREFIX}%s\\n' '${check.name}'; fi`
        ),
        'fi',
        ':',
    ].join('\n');
}

/** スクリプトの出力から足りないコマンドの名前を取り出す。 */
export function parseMissingCommandsOutput(out: Buffer): string[] {
    return out
        .toString('utf8')
        .split(/\r?\n/)
        .filter(line => line.startsWith(MISSING_PREFIX))
        .map(line => line.slice(MISSING_PREFIX.length));
}
