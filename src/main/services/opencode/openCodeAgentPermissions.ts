import { parseYamlScalars } from '../../utils/frontmatter';

const PERMISSIONS_KEY_LINE = /^permissions\s*:\s*(?:#.*)?$/;
const ITEM_LINE = /^(\s*)-(\s+|$)/;
// フロー形式の項目を読むときに付ける仮のキー。
const FLOW_ITEM_KEY = 'rule';

function indentOf(line: string): number {
    return line.length - line.trimStart().length;
}

/**
 * 1 項目（`- ` の後ろの行と、その続きの行）をスカラーの組として読む。
 * フロー形式のマップ（`- { action: …, resource: …, effect: … }`）は仮のキーの値として読み、その子キーを返す。
 */
function readRule(lines: string[]): Record<string, string> {
    if (!lines[0].startsWith('{')) return parseYamlScalars(lines.join('\n'));
    const text = [`${FLOW_ITEM_KEY}: ${lines[0]}`, ...lines.slice(1).map(line => `  ${line}`)].join('\n');
    const prefix = `${FLOW_ITEM_KEY}.`;
    const rule: Record<string, string> = {};
    for (const [key, value] of Object.entries(parseYamlScalars(text))) {
        if (key.startsWith(prefix)) rule[key.slice(prefix.length)] = value;
    }
    return rule;
}

/**
 * エージェント定義の frontmatter（生テキスト）にある permissions（{ action, resource, effect } の並び）を
 * 「action:resource=effect」のカンマ区切り 1 行にまとめる。
 * ブロック形式（`- action: ...` の項目を並べる書き方）を対象とし、各項目はフロー形式のマップでもよい。
 * 該当が無ければ空文字列を返す。
 */
export function summarizeAgentPermissions(frontmatterRaw: string): string {
    const lines = frontmatterRaw.split(/\r?\n/);
    const start = lines.findIndex(line => PERMISSIONS_KEY_LINE.test(line));
    if (start < 0) return '';

    // permissions の値の範囲: 字下げされた行か、キーと同じ字下げの `- ` 行が続く間（コメント行は除く）。
    const block: string[] = [];
    for (const line of lines.slice(start + 1)) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) continue;
        if (trimmed.length > 0 && indentOf(line) === 0 && !ITEM_LINE.test(line)) break;
        block.push(line);
    }

    // `- ` で始まる行ごとに項目へ分け、項目の中身の開始位置までの字下げを除いてスカラーとして読む
    // （それより深い字下げはブロックスカラーの本文などのために残す）。
    const items: string[][] = [];
    let contentIndent = 0;
    for (const line of block) {
        const item = ITEM_LINE.exec(line);
        if (item) {
            contentIndent = item[0].length;
            items.push([line.slice(contentIndent)]);
            continue;
        }
        if (items.length === 0) continue;
        items[items.length - 1].push(line.slice(Math.min(contentIndent, indentOf(line))));
    }

    return items
        .map(readRule)
        .filter(rule => rule.action && rule.resource && rule.effect)
        .map(rule => `${rule.action}:${rule.resource}=${rule.effect}`)
        .join(', ');
}
