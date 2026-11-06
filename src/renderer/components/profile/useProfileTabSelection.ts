import { useCallback, useState } from 'react';
import type { AgentEnvironment } from '@shared/agents/types';
import { envId } from '../../utils/format';

/** エージェントと環境ごとの選択中のタブを持つ。環境の一覧の更新の前後で値を保つ。 */
export function useProfileTabSelection(agentId: string) {
    const [selected, setSelected] = useState<Record<string, string>>({});
    const get = useCallback(
        (env: AgentEnvironment): string | undefined => selected[`${agentId}:${envId(env)}`],
        [agentId, selected]
    );
    const set = useCallback(
        (env: AgentEnvironment, tabId: string) => {
            setSelected(previous => ({ ...previous, [`${agentId}:${envId(env)}`]: tabId }));
        },
        [agentId]
    );
    return { get, set };
}
