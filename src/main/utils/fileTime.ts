import { statSync, utimesSync } from 'fs';
import type AdmZip from 'adm-zip';

/**
 * ファイルの更新日時（mtime）に関するユーティリティ。
 *
 * アセット（エージェント / スキル）の取り込みでは、取り込み元の日時を引き継ぐ。
 * - ZIP 展開: ZIP エントリに記録された日時を展開後のファイルへ適用する。
 * - 単一ファイル取り込み: 取り込み元ファイルの mtime を配置後のファイルへ適用する。
 *
 * ZIP の標準タイムスタンプ（MS-DOS 形式）は 2 秒粒度・ローカル時刻のため、
 * 復元後の日時は元ファイルに対して最大 2 秒の誤差が生じうる。
 */

/**
 * ZIP 書き出し（archiver）の共通オプションを生成する。
 *
 * forceLocalTime: ZIP の標準タイムスタンプ（MS-DOS 形式）は仕様上「書庫作成マシンのローカル時刻」だが、
 * archiver の既定は UTC で書き込むため、エクスプローラや一般的な展開ツール・本アプリの展開処理
 * （ローカル時刻として解釈）ではタイムゾーン分ずれてしまう。ローカル時刻で書き出して整合させる。
 *
 * 定数ではなく都度生成する。archiver は渡したオプションオブジェクトへ既定値を直接書き込む
 * （lodash defaults）ため、共有インスタンスを使い回すと他の ZIP 生成へ影響が波及しうる。
 */
export function zipArchiveOptions(): { zlib: { level: number }; forceLocalTime: boolean } {
    return { zlib: { level: 9 }, forceLocalTime: true };
}

/** 有効な mtime（エポックミリ秒）か。0 や負値・NaN は「不明」として扱う。 */
function isValidMtimeMs(mtimeMs: number | null | undefined): mtimeMs is number {
    return typeof mtimeMs === 'number' && Number.isFinite(mtimeMs) && mtimeMs > 0;
}

/**
 * ファイル / ディレクトリの更新日時を設定する（実 OS パス）。
 * 日時の引き継ぎは付加的な処理のため、失敗しても取り込み自体は継続する（例外は投げない）。
 */
export function applyMtime(absPath: string, mtimeMs: number | null | undefined): void {
    if (!isValidMtimeMs(mtimeMs)) {
        return;
    }
    const time = new Date(mtimeMs);
    try {
        utimesSync(absPath, time, time);
    } catch (error) {
        console.warn(`Failed to apply mtime to ${absPath}:`, error);
    }
}

/** 取り込み元ファイルの更新日時（エポックミリ秒）。取得できない場合は null。 */
export function fileMtimeMs(absPath: string): number | null {
    try {
        const stats = statSync(absPath);
        return isValidMtimeMs(stats.mtimeMs) ? stats.mtimeMs : null;
    } catch (error) {
        console.warn(`Failed to read mtime of ${absPath}:`, error);
        return null;
    }
}

/** ZIP エントリに記録された更新日時（エポックミリ秒）。取得できない場合は null。 */
export function zipEntryMtimeMs(entry: AdmZip.IZipEntry): number | null {
    const time = entry.header.time;
    const mtimeMs = time instanceof Date ? time.getTime() : NaN;
    return isValidMtimeMs(mtimeMs) ? mtimeMs : null;
}
