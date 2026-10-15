import { win32 } from 'path';

/**
 * Windows の System32 にあるコマンドの絶対パス。PATH や作業ディレクトリにある同名のファイルではなく、
 * Windows 付属のものを起動するために使う。
 */
export function system32Command(name: string): string {
    return win32.join(process.env.SystemRoot || process.env.windir || 'C:\\Windows', 'System32', name);
}
