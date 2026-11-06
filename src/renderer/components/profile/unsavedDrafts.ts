/**
 * 保存の完了後も未保存の編集として残す内容を返す。
 * 送った内容と同じ編集と、読み直した内容と同じ編集は残さない。sent に無いキーの編集は保存中に入力されたものとして扱う。
 */
export function draftsAfterSave<T>(
    current: Readonly<Record<string, T>>,
    sent: Readonly<Record<string, T>>,
    same: (a: T, b: T) => boolean,
    matchesSaved: (key: string, draft: T) => boolean
): Record<string, T> {
    const remaining: Record<string, T> = {};
    for (const [key, draft] of Object.entries(current)) {
        const wasSent = Object.hasOwn(sent, key) && same(draft, sent[key]);
        if (!wasSent && !matchesSaved(key, draft)) remaining[key] = draft;
    }
    return remaining;
}
