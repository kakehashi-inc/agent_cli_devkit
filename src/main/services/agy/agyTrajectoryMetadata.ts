import { isUtf8 } from 'buffer';
import { BinaryReader, WireType } from '@bufbuild/protobuf/wire';

// CortexTrajectoryMetadata のうち読み取るフィールドの番号。
const FIELD_PARENT_CONVERSATION_ID = 5;
const FIELD_ROOT_CONVERSATION_ID = 6;
const FIELD_WORKSPACE_URIS = 7;
const FIELD_PROJECT_ID = 18;

/** 会話 DB の trajectory_metadata_blob の data から読み取った値。 */
export interface AgyTrajectoryMetadata {
    // フィールド 7（記録された順）
    workspaceUris: string[];
    // フィールド 5。無ければ null。
    parentConversationId: string | null;
    // フィールド 6。無ければ null。
    rootConversationId: string | null;
    // フィールド 18。無ければ null。
    projectId: string | null;
    // 全体をワイヤ形式として読み切れたか。false のときの値は、壊れた位置より前で読めた分だけ。
    complete: boolean;
}

/**
 * protobuf のバイト列から、フィールド 7（repeated string）、5、6、18 の文字列だけを読む。
 * ほかのフィールドは内容を解釈せずに読み飛ばす。同じ番号の単一値は最後の値を使う（protobuf の規則）。
 * 例外は投げず、タグ、長さ、ワイヤ形式、UTF-8 のいずれかが不正なら、そこで読むのをやめて complete を false にする。
 */
export function readAgyTrajectoryMetadata(data: Uint8Array): AgyTrajectoryMetadata {
    const result: AgyTrajectoryMetadata = {
        workspaceUris: [],
        parentConversationId: null,
        rootConversationId: null,
        projectId: null,
        complete: false,
    };
    const reader = new BinaryReader(data);
    try {
        while (reader.pos < reader.len) {
            const [field, wire] = reader.tag();
            if (wire === WireType.LengthDelimited) {
                const bytes = reader.bytes();
                if (
                    field === FIELD_WORKSPACE_URIS ||
                    field === FIELD_PARENT_CONVERSATION_ID ||
                    field === FIELD_ROOT_CONVERSATION_ID ||
                    field === FIELD_PROJECT_ID
                ) {
                    if (!isUtf8(bytes)) return result;
                    const text = Buffer.from(bytes).toString('utf8');
                    if (field === FIELD_WORKSPACE_URIS) result.workspaceUris.push(text);
                    else if (field === FIELD_PARENT_CONVERSATION_ID) result.parentConversationId = text;
                    else if (field === FIELD_ROOT_CONVERSATION_ID) result.rootConversationId = text;
                    else result.projectId = text;
                }
            } else if (wire === WireType.Varint || wire === WireType.Bit64 || wire === WireType.Bit32) {
                reader.skip(wire, field);
            } else {
                return result;
            }
            if (reader.pos > reader.len) return result;
        }
    } catch {
        return result;
    }
    result.complete = true;
    return result;
}
