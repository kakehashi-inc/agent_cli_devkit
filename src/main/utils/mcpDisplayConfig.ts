import type { MCPServerConfig, MCPServerDisplayConfig } from '../../shared/agents/types';

/** 文字列なら返す。数値などのスカラーは文字列にする。配列やオブジェクトは undefined。 */
function scalarText(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    return typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean'
        ? String(value)
        : undefined;
}

/** 配列の要素のうちスカラーだけを文字列にして返す。配列でなければ undefined。 */
function textList(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    return value.map(scalarText).filter((item): item is string => item !== undefined);
}

/**
 * MCP サーバーの設定から一覧に出す項目（コマンド、引数、種別、URL）だけを取り出す。
 * 環境変数、ヘッダー、そのほかの項目は含めない。形の合わない値も含めない。
 */
export function mcpDisplayConfig(config: MCPServerConfig): MCPServerDisplayConfig {
    const display: MCPServerDisplayConfig = {};
    const command = Array.isArray(config.command) ? textList(config.command) : scalarText(config.command);
    if (command !== undefined) display.command = command;
    const args = textList(config.args);
    if (args !== undefined) display.args = args;
    const type = scalarText(config.type);
    if (type !== undefined) display.type = type;
    const url = scalarText(config.url);
    if (url !== undefined) display.url = url;
    const serverUrl = scalarText(config.serverUrl);
    if (serverUrl !== undefined) display.serverUrl = serverUrl;
    return display;
}
