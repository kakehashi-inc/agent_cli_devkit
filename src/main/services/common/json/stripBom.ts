/**
 * テキストの先頭にある UTF-8 BOM（U+FEFF）を除く。先頭が BOM でないテキストと null はそのまま返す。
 */
export function stripBom(text: string): string;
export function stripBom(text: string | null): string | null;
export function stripBom(text: string | null): string | null {
    return text !== null && text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
