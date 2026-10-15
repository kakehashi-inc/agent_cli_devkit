/**
 * エージェントのモデルと推論レベル（モデルバリアント）を解決する。
 * - 文字列形式 `provider/model#variant`: `#` より前をモデル、後をバリアントとする。
 * - 文字列形式に `#` が無いとき: 別キー variant（`#` を含まないもの）をバリアントとする（OpenCode が model に連結して扱う書き方）。
 * - オブジェクト形式 `model: { providerID, model, variant }`: `providerID/model` をモデル、variant をバリアントとする。
 */
export function resolveOpenCodeModel(fm: Record<string, string>): { value: string; effort?: string } {
    const raw = fm.model ?? '';
    if (raw) {
        const hash = raw.indexOf('#');
        if (hash >= 0) return { value: raw.slice(0, hash), effort: raw.slice(hash + 1) };
        const variant = fm.variant ?? '';
        return variant && !variant.includes('#') ? { value: raw, effort: variant } : { value: raw };
    }
    const model = fm['model.model'] ?? '';
    const provider = fm['model.providerID'];
    return { value: provider && model ? `${provider}/${model}` : model, effort: fm['model.variant'] };
}
