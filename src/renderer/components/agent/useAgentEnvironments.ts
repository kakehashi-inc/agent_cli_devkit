import { useCallback, useEffect, useRef, useState } from 'react';

interface EnvironmentsApi<T> {
    getEnvironments(refresh?: boolean): Promise<T[]>;
}

/**
 * 画面の環境の一覧を読み込む。scope（エージェントなど画面の対象）か api が変わると、前の対象の一覧を描画せずに読み直す。
 * 最後に始めた読み込みの結果だけを使う。reloadNonce は読み込みが成功するたびに変わる。
 */
export function useAgentEnvironments<T>(scope: string, api: EnvironmentsApi<T>, failureMessage: string) {
    const [owner, setOwner] = useState({ scope, api });
    const [environments, setEnvironments] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [reloadNonce, setReloadNonce] = useState(0);

    if (owner.scope !== scope || owner.api !== api) {
        setOwner({ scope, api });
        setEnvironments([]);
        setLoading(true);
        setRefreshing(true);
        setLoadFailed(false);
    }

    const latestRequest = useRef(0);
    const load = useCallback(
        async (refresh = false) => {
            const request = ++latestRequest.current;
            setRefreshing(true);
            try {
                const next = await api.getEnvironments(refresh);
                if (request !== latestRequest.current) return;
                setEnvironments(next);
                setLoadFailed(false);
                setReloadNonce(value => value + 1);
            } catch (error) {
                if (request !== latestRequest.current) return;
                console.error(failureMessage, error);
                setLoadFailed(true);
            } finally {
                if (request === latestRequest.current) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        },
        [api, failureMessage]
    );

    useEffect(() => {
        void load();
        return () => {
            latestRequest.current += 1;
        };
    }, [scope, load]);

    return { environments, loading, refreshing, loadFailed, reloadNonce, load };
}
