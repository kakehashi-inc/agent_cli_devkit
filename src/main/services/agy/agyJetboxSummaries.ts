import { isUtf8 } from 'buffer';
import { BinaryReader, BinaryWriter, WireType } from '@bufbuild/protobuf/wire';

// 要約キャッシュの項目のフィールド番号。
const FIELD_ENTRY = 1;
const FIELD_ENTRY_KEY = 1;
const FIELD_ENTRY_VALUE = 2;

const CONVERSATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 項目を取り除いた結果。形が想定と違うファイルは unrecognized で、内容を変えない。 */
export type JetboxRemoval = { kind: 'unrecognized' } | { kind: 'unchanged' } | { kind: 'changed'; bytes: Uint8Array };

/** 項目のキー（会話 ID）を読む。キーと値を 1 つずつ持つ形でなければ null。 */
function entryKey(entry: Uint8Array): string | null {
    const reader = new BinaryReader(entry);
    let key: string | null = null;
    let hasValue = false;
    while (reader.pos < reader.len) {
        const [field, wire] = reader.tag();
        if (wire !== WireType.LengthDelimited) return null;
        const bytes = reader.bytes();
        if (field === FIELD_ENTRY_KEY && key === null) {
            if (!isUtf8(bytes)) return null;
            key = Buffer.from(bytes).toString('utf8');
        } else if (field === FIELD_ENTRY_VALUE && !hasValue) {
            hasValue = true;
        } else {
            return null;
        }
    }
    return hasValue && key !== null && CONVERSATION_ID.test(key) ? key : null;
}

/**
 * jetbox_summaries_proto.pb のバイト列から、ids の会話の項目を取り除く。
 * ファイル全体が会話 ID をキーとする項目の並びとして読めるときだけ処理する。残す項目の中身はそのまま書き戻す。
 */
export function removeJetboxEntries(data: Uint8Array, ids: ReadonlySet<string>): JetboxRemoval {
    const kept: Uint8Array[] = [];
    let removed = 0;
    try {
        const reader = new BinaryReader(data);
        while (reader.pos < reader.len) {
            const [field, wire] = reader.tag();
            if (field !== FIELD_ENTRY || wire !== WireType.LengthDelimited) return { kind: 'unrecognized' };
            const entry = reader.bytes();
            const key = entryKey(entry);
            if (key === null) return { kind: 'unrecognized' };
            if (ids.has(key)) removed += 1;
            else kept.push(entry);
        }
    } catch {
        return { kind: 'unrecognized' };
    }
    if (removed === 0) return { kind: 'unchanged' };
    const writer = new BinaryWriter();
    for (const entry of kept) writer.tag(FIELD_ENTRY, WireType.LengthDelimited).bytes(entry);
    return { kind: 'changed', bytes: writer.finish() };
}
