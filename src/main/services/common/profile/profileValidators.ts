/**
 * プロファイル設定の保存前の検証と、一覧の表示名の算出。
 * errors は保存を拒否する内容（JSON として読めない、Codex が起動できなくなると確認済みの形）だけに使う。
 * それ以外の CLI の挙動は確認できていないので warnings にとどめ、確認のうえで保存できるようにする。
 * 結果はコードだけを返し、入力の本文を含めない。コードの引数はキーの名前や要素の位置だけにする。
 */
import { parseFrontmatter } from '../../../utils/frontmatter';
import { parseJsonc } from '../../../utils/jsoncEdit';
import { renderTomlArrayItem, validateCodexHooksFragment, type CodexHooksIssue } from '../../../utils/tomlSubtree';
import { analyzeHookDocuments } from './hookOverview';

export interface ProfileValidationInput {
    // 検証する本文（BOM を除く）。
    text: string;
    // ファイル名。ファイル以外の内容では持たない。
    fileName?: string;
    // 元のファイルや入力に BOM があった。
    hadBom?: boolean;
}

export interface ProfileValidationResult {
    errors: string[];
    warnings: string[];
}

export interface ProfileNameInput {
    relPath: string;
    name: string;
    text: string | null;
    frontmatter: Record<string, string> | null;
}

type Validator = (input: ProfileValidationInput) => ProfileValidationResult;
type LiteralValue = string | number | boolean | null | LiteralValue[] | { [key: string]: LiteralValue };

// Claude のワークフローの上限（バイト）。
const CLAUDE_WORKFLOW_MAX_BYTES = 524288;
const CLAUDE_RESERVED_NAME = 'anthropic-skills';
const AGY_PERMISSION_RULE = /^(command|read_file|write_file|read_url|execute_url|mcp|unsandboxed)\(.*\)$/;
const AGY_RULE_TRIGGERS = new Set(['always_on', 'model_decision', 'glob', 'manual']);
const GROK_NAME_MAX = 64;
const GROK_DESCRIPTION_MAX = 1024;
const GROK_WHEN_TO_USE_MAX = 2048;
const GROK_PHASES_MAX = 64;
const GROK_RHAI_MAX_BYTES = 1024 * 1024;
const GROK_RHAI_KEYS = new Set(['name', 'description', 'when_to_use', 'phases']);
const GROK_JS_KEYS = new Set(['name', 'description', 'when_to_use', 'phase']);
const GROK_WORKFLOW_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GROK_COMMAND_NAME = /^[a-z0-9-]+$/;
const CODEX_HOOKS_JSON_KEYS = new Set(['description', 'hooks']);
// リテラルの入れ子の上限（これより深い値は解析しない）。
const LITERAL_MAX_DEPTH = 32;

function warningsOnly(warnings: string[]): ProfileValidationResult {
    return { errors: [], warnings };
}

function byteLength(text: string): number {
    return Buffer.byteLength(text, 'utf8');
}

function stemOf(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
}

// ------------------------------------------------------------
// リテラルの読み取り
// ------------------------------------------------------------

class LiteralSyntaxError extends Error {}

/** 空白とコメントを読み飛ばした位置を返す。 */
function skipTrivia(text: string, start: number): number {
    let pos = start;
    while (pos < text.length) {
        if (/\s/.test(text[pos])) {
            pos += 1;
        } else if (text.startsWith('//', pos)) {
            const end = text.indexOf('\n', pos);
            pos = end === -1 ? text.length : end + 1;
        } else if (text.startsWith('/*', pos)) {
            const end = text.indexOf('*/', pos + 2);
            pos = end === -1 ? text.length : end + 2;
        } else {
            break;
        }
    }
    return pos;
}

/** 先頭の `#!` 行と空白、コメントを読み飛ばした位置を返す。 */
function firstStatementAt(text: string): number {
    if (!text.startsWith('#!')) return skipTrivia(text, 0);
    const end = text.indexOf('\n');
    return end === -1 ? text.length : skipTrivia(text, end + 1);
}

/**
 * start の位置の純粋なリテラルを読む。関数呼び出し、スプレッド、補間など、リテラルでないものがあれば null を返す。
 * rhai なら `#{...}` をマップ、それ以外は `{...}` をオブジェクトとして読む。
 */
function readLiteralAt(text: string, start: number, rhai: boolean): { value: LiteralValue; end: number } | null {
    let pos = start;
    const fail = (): never => {
        throw new LiteralSyntaxError();
    };
    const readString = (): string => {
        const quote = text[pos];
        let out = '';
        pos += 1;
        while (pos < text.length) {
            const ch = text[pos];
            if (ch === quote) {
                pos += 1;
                return out;
            }
            if (ch === '\\') {
                const next = text[pos + 1];
                out += next === 'n' ? '\n' : next === 't' ? '\t' : (next ?? '');
                pos += 2;
                continue;
            }
            if (quote === '`' ? ch === '$' && text[pos + 1] === '{' : ch === '\n') fail();
            out += ch;
            pos += 1;
        }
        return fail();
    };
    const readKey = (): string => {
        if (text[pos] === '"' || text[pos] === "'") return readString();
        const match = /^[A-Za-z_$][\w$]*/.exec(text.slice(pos, pos + 256));
        if (!match) return fail();
        pos += match[0].length;
        return match[0];
    };
    const readValue = (depth: number): LiteralValue => {
        if (depth > LITERAL_MAX_DEPTH) fail();
        pos = skipTrivia(text, pos);
        const ch = text[pos];
        if (ch === '"' || ch === "'" || ch === '`') return readString();
        if (ch === '[') {
            pos += 1;
            const items: LiteralValue[] = [];
            for (;;) {
                pos = skipTrivia(text, pos);
                if (text[pos] === ']') {
                    pos += 1;
                    return items;
                }
                items.push(readValue(depth + 1));
                pos = skipTrivia(text, pos);
                if (text[pos] === ',') pos += 1;
                else if (text[pos] !== ']') fail();
            }
        }
        const opensMap = rhai ? ch === '#' && text[pos + 1] === '{' : ch === '{';
        if (opensMap) {
            pos += rhai ? 2 : 1;
            const map: { [key: string]: LiteralValue } = Object.create(null);
            for (;;) {
                pos = skipTrivia(text, pos);
                if (text[pos] === '}') {
                    pos += 1;
                    return map;
                }
                const key = readKey();
                pos = skipTrivia(text, pos);
                if (text[pos] !== ':') fail();
                pos += 1;
                map[key] = readValue(depth + 1);
                pos = skipTrivia(text, pos);
                if (text[pos] === ',') pos += 1;
                else if (text[pos] !== '}') fail();
            }
        }
        const bare = /^(?:-?\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)(?![\w$])/.exec(
            text.slice(pos, pos + 64)
        );
        if (!bare) return fail();
        pos += bare[0].length;
        if (bare[0] === 'true') return true;
        if (bare[0] === 'false') return false;
        if (bare[0] === 'null') return null;
        return Number(bare[0].replace(/_/g, ''));
    };
    try {
        const value = readValue(0);
        return { value, end: pos };
    } catch (error) {
        if (error instanceof LiteralSyntaxError) return null;
        throw error;
    }
}

function isLiteralMap(value: LiteralValue | undefined): value is { [key: string]: LiteralValue } {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type MetaRead =
    { status: 'missing' } | { status: 'not-literal' } | { status: 'ok'; meta: { [key: string]: LiteralValue } };

/** 先頭の文の `<keyword> meta = <リテラル>` を読む。 */
function readLeadingMeta(text: string, keyword: RegExp, rhai: boolean): MetaRead {
    const start = firstStatementAt(text);
    const head = keyword.exec(text.slice(start, start + 256));
    if (!head) return { status: 'missing' };
    const literal = readLiteralAt(text, start + head[0].length, rhai);
    if (!literal || !isLiteralMap(literal.value)) return { status: 'not-literal' };
    if (text[skipTrivia(text, literal.end)] === ',') return { status: 'not-literal' };
    return { status: 'ok', meta: literal.value };
}

function nonEmptyString(value: LiteralValue | undefined): value is string {
    return typeof value === 'string' && value.trim() !== '';
}

// ------------------------------------------------------------
// Claude
// ------------------------------------------------------------

function readClaudeWorkflowMeta(text: string): MetaRead {
    return readLeadingMeta(text, /^export\s+const\s+meta\s*=\s*/, false);
}

const validateClaudeWorkflow: Validator = ({ text }) => {
    const warnings: string[] = [];
    if (byteLength(text) > CLAUDE_WORKFLOW_MAX_BYTES) warnings.push('claude-workflow-too-large');
    const read = readClaudeWorkflowMeta(text);
    if (read.status === 'missing') warnings.push('claude-workflow-meta-missing');
    else if (read.status === 'not-literal') warnings.push('claude-workflow-meta-not-literal');
    else {
        if (!nonEmptyString(read.meta.name)) warnings.push('claude-workflow-name-missing');
        else if (read.meta.name === CLAUDE_RESERVED_NAME) warnings.push('claude-reserved-name');
        if (!nonEmptyString(read.meta.description)) warnings.push('claude-workflow-description-missing');
    }
    return warningsOnly(warnings);
};

const validateClaudeReservedName: Validator = ({ text, fileName }) => {
    const declared = parseFrontmatter(text)?.fields.name?.trim();
    const reserved = declared === CLAUDE_RESERVED_NAME || (fileName && stemOf(fileName) === CLAUDE_RESERVED_NAME);
    return warningsOnly(reserved ? ['claude-reserved-name'] : []);
};

// ------------------------------------------------------------
// Agy
// ------------------------------------------------------------

const validateAgyPermissionRule: Validator = ({ text }) =>
    warningsOnly(AGY_PERMISSION_RULE.test(text) ? [] : ['agy-permission-rule-format']);

const validateAgyRuleFrontmatter: Validator = ({ text }) => {
    const parsed = parseFrontmatter(text);
    if (!parsed) return warningsOnly(['agy-rule-frontmatter-missing']);
    const trigger = parsed.fields.trigger?.trim();
    if (!trigger) return warningsOnly(['agy-rule-trigger-missing']);
    if (!AGY_RULE_TRIGGERS.has(trigger)) return warningsOnly(['agy-rule-trigger-invalid']);
    const warnings: string[] = [];
    if (trigger === 'manual') warnings.push('agy-rule-trigger-manual');
    if (trigger === 'model_decision' && !parsed.fields.description?.trim()) {
        warnings.push('agy-rule-description-missing');
    }
    if (trigger === 'glob' && !parsed.fields.globs?.trim() && !parsed.fields.glob?.trim()) {
        warnings.push('agy-rule-globs-missing');
    }
    return warningsOnly(warnings);
};

// ------------------------------------------------------------
// Grok
// ------------------------------------------------------------

/** Grok のコマンド名の正規化（空白と `_` を `-` にする）。 */
function grokCommandStem(name: string): string {
    return stemOf(name).replace(/[\s_]/g, '-');
}

const validateGrokCommand: Validator = ({ text, fileName }) => {
    const warnings: string[] = [];
    const stem = fileName ? grokCommandStem(fileName) : null;
    const validName = (value: string) => GROK_COMMAND_NAME.test(value) && value.length <= GROK_NAME_MAX;
    const declared = parseFrontmatter(text)?.fields.name?.trim();
    if (stem !== null && !validName(stem)) warnings.push('grok-command-stem-invalid');
    if (declared) {
        if (!validName(declared)) warnings.push('grok-command-name-invalid');
        else if (stem !== null && declared !== stem) warnings.push('grok-command-name-differs');
    }
    return warningsOnly(warnings);
};

/** Grok の `.js` ワークフローの先頭の front matter のキーと値を読む。形が違えば null。 */
function readGrokJsFrontMatter(text: string): [string, string][] | null {
    const lines = text.split(/\r?\n/);
    let index = 0;
    while (index < lines.length && (lines[index].trim() === '' || lines[index].startsWith('#!'))) index += 1;
    if (lines[index] !== '/**') return null;
    const body: string[] = [];
    for (index += 1; index < lines.length; index += 1) {
        const trimmed = lines[index].trim();
        if (trimmed.startsWith('*/')) break;
        if (!trimmed.startsWith('*')) return null;
        body.push(trimmed.slice(1).trim());
    }
    if (index >= lines.length) return null;
    const open = body.indexOf('---');
    const close = body.indexOf('---', open + 1);
    if (open === -1 || close === -1) return null;
    const pairs: [string, string][] = [];
    for (const line of body.slice(open + 1, close)) {
        if (line === '') continue;
        const colon = line.indexOf(':');
        if (colon <= 0) return null;
        pairs.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
    }
    return pairs;
}

function grokWorkflowLimits(
    fields: { name?: string; description?: string; whenToUse?: string },
    stem: string | null,
    checkStem: boolean
): string[] {
    const warnings: string[] = [];
    const { name, description, whenToUse } = fields;
    if (!name) warnings.push('grok-workflow-name-missing');
    else if (!GROK_WORKFLOW_NAME.test(name) || byteLength(name) > GROK_NAME_MAX) {
        warnings.push('grok-workflow-name-invalid');
    } else if (checkStem && stem !== null && name !== stem) warnings.push('grok-workflow-name-mismatch');
    if (!description) warnings.push('grok-workflow-description-missing');
    else if (byteLength(description) > GROK_DESCRIPTION_MAX) warnings.push('grok-workflow-description-too-long');
    if (whenToUse && byteLength(whenToUse) > GROK_WHEN_TO_USE_MAX) warnings.push('grok-workflow-when-to-use-too-long');
    return warnings;
}

function validateGrokJsWorkflow(input: ProfileValidationInput): string[] {
    const warnings: string[] = input.hadBom ? ['grok-workflow-bom'] : [];
    const pairs = readGrokJsFrontMatter(input.text);
    if (!pairs) return [...warnings, 'grok-workflow-front-matter-missing'];
    const single = new Map<string, string>();
    const phases: string[] = [];
    for (const [key, value] of pairs) {
        if (!GROK_JS_KEYS.has(key)) {
            warnings.push(`grok-workflow-unknown-key:${key}`);
        } else if (key === 'phase') {
            phases.push(value.split('--')[0].trim());
        } else if (single.has(key)) {
            warnings.push(`grok-workflow-duplicate-key:${key}`);
        } else {
            single.set(key, value);
        }
    }
    warnings.push(
        ...grokWorkflowLimits(
            { name: single.get('name'), description: single.get('description'), whenToUse: single.get('when_to_use') },
            input.fileName ? stemOf(input.fileName) : null,
            true
        )
    );
    warnings.push(...grokPhaseWarnings(phases));
    if (!/export\s+default\s+async\b/.test(input.text)) warnings.push('grok-workflow-no-default-export');
    return warnings;
}

function grokPhaseWarnings(titles: string[]): string[] {
    const warnings: string[] = [];
    if (titles.length > GROK_PHASES_MAX) warnings.push('grok-workflow-too-many-phases');
    if (new Set(titles).size !== titles.length) warnings.push('grok-workflow-duplicate-phase');
    return warnings;
}

function readGrokRhaiMeta(text: string): MetaRead {
    return readLeadingMeta(text, /^let\s+meta\s*=\s*/, true);
}

function validateGrokRhaiWorkflow(text: string): string[] {
    const warnings: string[] = byteLength(text) > GROK_RHAI_MAX_BYTES ? ['grok-workflow-too-large'] : [];
    const read = readGrokRhaiMeta(text);
    if (read.status === 'missing') return [...warnings, 'grok-workflow-meta-missing'];
    if (read.status === 'not-literal') return [...warnings, 'grok-workflow-meta-not-literal'];
    const { meta } = read;
    for (const key of Object.keys(meta)) {
        if (!GROK_RHAI_KEYS.has(key)) warnings.push(`grok-workflow-unknown-key:${key}`);
    }
    const asText = (value: LiteralValue | undefined) => (typeof value === 'string' ? value : undefined);
    warnings.push(
        ...grokWorkflowLimits(
            { name: asText(meta.name), description: asText(meta.description), whenToUse: asText(meta.when_to_use) },
            null,
            false
        )
    );
    if (Array.isArray(meta.phases)) {
        warnings.push(
            ...grokPhaseWarnings(
                meta.phases.map(phase => (isLiteralMap(phase) ? String(phase.title ?? '') : String(phase)))
            )
        );
    }
    return warnings;
}

const validateGrokWorkflow: Validator = input => {
    const lower = input.fileName?.toLowerCase() ?? '';
    if (lower.endsWith('.rhai')) return warningsOnly(validateGrokRhaiWorkflow(input.text));
    return warningsOnly(validateGrokJsWorkflow(input));
};

const validateGrokLspJson: Validator = ({ text }) => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return { errors: ['json-invalid'], warnings: [] };
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return warningsOnly(['grok-lsp-not-object']);
    }
    const warnings: string[] = [];
    for (const [name, server] of Object.entries(parsed)) {
        if (typeof server !== 'object' || server === null || Array.isArray(server)) {
            warnings.push(`grok-lsp-server-not-object:${name}`);
        } else if (typeof (server as { command?: unknown }).command !== 'string') {
            warnings.push(`grok-lsp-command-missing:${name}`);
        }
    }
    return warningsOnly(warnings);
};

/** Grok の hook の定義を検証する。ファイル名があれば JSON のファイル、無ければ TOML の断片として読む。 */
const validateGrokHooks: Validator = ({ text, fileName }) => {
    const isJsonFile = fileName !== undefined;
    if (isJsonFile) {
        try {
            JSON.parse(text);
        } catch {
            return { errors: ['json-invalid'], warnings: [] };
        }
    }
    const rows = analyzeHookDocuments(
        { parser: 'claudeStyle', knownEvents: [], hookNaming: { scheme: 'grok', disableListRel: '' } },
        [{ label: '', dir: '', format: isJsonFile ? 'json' : 'toml', path: ['hooks'], text, naming: 'user' }],
        null
    );
    const unknown = [...new Set(rows.filter(entry => entry.row.unknownEvent).map(entry => entry.row.event))];
    return warningsOnly([
        ...(rows.some(entry => entry.row.invalid) ? ['grok-hooks-invalid'] : []),
        ...unknown.map(event => `grok-hooks-unknown-event:${event}`),
    ]);
};

// ------------------------------------------------------------
// Codex
// ------------------------------------------------------------

/** Codex の hooks.json を検証する。CLI は description と hooks 以外のキーがあるファイルを読み飛ばす。 */
const validateCodexHooksJson: Validator = ({ text }) => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return { errors: ['json-invalid'], warnings: [] };
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return warningsOnly(['codex-hooks-json-not-object']);
    }
    return warningsOnly(
        Object.keys(parsed)
            .filter(key => !CODEX_HOOKS_JSON_KEYS.has(key))
            .map(key => `codex-hooks-json-unknown-key:${key}`)
    );
};

// ------------------------------------------------------------
// OpenCode
// ------------------------------------------------------------

/** frontmatter を除いた本文を返す。frontmatter が閉じていなければ全文を返す。 */
function markdownBody(text: string): string {
    const lines = text.split(/\r?\n/);
    let start = 0;
    while (start < lines.length && lines[start].trim() === '') start += 1;
    if (lines[start]?.trim() !== '---') return text;
    const end = lines.findIndex((line, index) => index > start && line.trim() === '---');
    return end === -1 ? text : lines.slice(end + 1).join('\n');
}

/** OpenCode は本文が空のコマンドも登録するので、空の本文を警告する。 */
const validateOpenCodeCommand: Validator = ({ text }) =>
    warningsOnly(markdownBody(text).trim() === '' ? ['opencode-command-empty-body'] : []);

// ------------------------------------------------------------
// 共通
// ------------------------------------------------------------

const validateJsonStrict: Validator = ({ text }) => {
    try {
        JSON.parse(text);
        return { errors: [], warnings: [] };
    } catch {
        return { errors: ['json-invalid'], warnings: [] };
    }
};

const validateJsonc: Validator = ({ text }) => {
    try {
        parseJsonc(text);
        return { errors: [], warnings: [] };
    } catch {
        return { errors: ['json-invalid'], warnings: [] };
    }
};

function issueCode(issue: CodexHooksIssue): string {
    return issue.path ? `${issue.code}:${issue.path}` : issue.code;
}

const validateCodexHooks: Validator = ({ text }) => {
    const result = validateCodexHooksFragment(text);
    return { errors: result.errors.map(issueCode), warnings: result.warnings.map(issueCode) };
};

/**
 * hooks.json に書く 1 件（`{ hooks: { <event>: [<group>] } }` の JSON）を検証する。
 * config.toml の [hooks] の起動エラーにあたる形は、hooks.json ではファイルごと読み飛ばされるので警告にする。
 */
const validateCodexHookEntryJson: Validator = ({ text }) => {
    const parsed = JSON.parse(text) as { hooks: Record<string, Record<string, unknown>[]> };
    const [[event, groups]] = Object.entries(parsed.hooks);
    let fragment: string;
    try {
        fragment = renderTomlArrayItem(['hooks', event], groups[0]);
    } catch {
        return warningsOnly(['hook-entry-null-value']);
    }
    const result = validateCodexHooksFragment(fragment);
    return warningsOnly([...result.errors, ...result.warnings].map(issueCode));
};

const VALIDATORS: Record<string, Validator> = {
    'json-strict': validateJsonStrict,
    jsonc: validateJsonc,
    'codex-hooks': validateCodexHooks,
    'codex-hooks-json': validateCodexHooksJson,
    'codex-hook-entry-json': validateCodexHookEntryJson,
    'agy-permission-rule': validateAgyPermissionRule,
    'agy-rule-frontmatter': validateAgyRuleFrontmatter,
    'claude-workflow': validateClaudeWorkflow,
    'claude-reserved-name': validateClaudeReservedName,
    'grok-command': validateGrokCommand,
    'grok-workflow': validateGrokWorkflow,
    'grok-lsp-json': validateGrokLspJson,
    'grok-hooks': validateGrokHooks,
    'opencode-command': validateOpenCodeCommand,
};

/** 登録された検証処理を実行する。id が無ければ何も検証しない。 */
export function runProfileValidator(id: string | undefined, input: ProfileValidationInput): ProfileValidationResult {
    const validator = id !== undefined && Object.hasOwn(VALIDATORS, id) ? VALIDATORS[id] : undefined;
    return validator ? validator(input) : { errors: [], warnings: [] };
}

// ------------------------------------------------------------
// 表示名
// ------------------------------------------------------------

function pathWithoutExtension(relPath: string): string {
    const dot = relPath.lastIndexOf('.');
    return dot > relPath.lastIndexOf('/') + 1 ? relPath.slice(0, dot) : relPath;
}

type NameRule = (input: ProfileNameInput) => string | undefined;

const NAME_RULES: Record<string, NameRule> = {
    // `/a:b`。`skill.md` はフォルダ名を名前にする。
    'claude-command': ({ relPath, name }) => {
        const segments = pathWithoutExtension(relPath).split('/');
        if (name.toLowerCase() === 'skill.md' && segments.length > 1) segments.pop();
        return `/${segments.join(':')}`;
    },
    // `/a/b`。
    'slash-path': ({ relPath }) => `/${pathWithoutExtension(relPath)}`,
    // ファイルのあるフォルダの名前。
    'folder-name': ({ relPath, name }) => relPath.split('/').slice(-2, -1)[0] ?? stemOf(name),
    // frontmatter の name。無ければファイル名から拡張子を除いたもの。
    'frontmatter-name': ({ frontmatter, name }) => frontmatter?.name?.trim() || stemOf(name),
    'claude-workflow': ({ text }) => {
        const read = text === null ? null : readClaudeWorkflowMeta(text);
        return read?.status === 'ok' && nonEmptyString(read.meta.name) ? read.meta.name : undefined;
    },
    'grok-command': ({ frontmatter, name }) => `/${frontmatter?.name?.trim() || grokCommandStem(name)}`,
    'grok-workflow': ({ text, name }) => {
        if (text === null) return undefined;
        if (name.toLowerCase().endsWith('.rhai')) {
            const read = readGrokRhaiMeta(text);
            return read.status === 'ok' && nonEmptyString(read.meta.name) ? read.meta.name : undefined;
        }
        return readGrokJsFrontMatter(text)?.find(([key]) => key === 'name')?.[1];
    },
};

/** 登録された処理で表示名を算出する。算出できなければ undefined。 */
export function computeEntryName(ruleId: string | undefined, input: ProfileNameInput): string | undefined {
    const rule = ruleId !== undefined && Object.hasOwn(NAME_RULES, ruleId) ? NAME_RULES[ruleId] : undefined;
    return rule ? rule(input) : undefined;
}
