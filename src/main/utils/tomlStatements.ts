/**
 * TOML テキストの見出しと代入の位置を列挙する読み取り専用の走査（値の解釈と書き込みは行わない）。
 * 文字列（複数行を含む）・配列・インラインテーブル・コメントを読み飛ばすため、配列の要素行や
 * 文字列の中の `[` を見出しと取り違えず、引用符付き・空白入り・ドット記法のキーも完全パスで扱える。
 */

// 代入 1 つの位置。path は見出しのテーブルパスとキーを連結した完全パス（インラインテーブルの内側も含む）。
export interface TomlAssignment {
    path: string[];
    // 値の範囲（valueEnd は値の直後。値の後ろの空白・コメントは含まない）
    valueStart: number;
    valueEnd: number;
    // 値がインラインテーブルのときの `{` の位置
    inlineOpen: number | null;
    // 行単位の代入のときの所属テーブル（見出しのパス）と行の終端（改行の直後。最終行なら末尾）。
    // インラインテーブルの内側の代入は null。
    table: string[] | null;
    lineEnd: number | null;
}

// テーブル見出し（`[a.b]` / `[[a.b]]`）。lineEnd は行の終端（改行の直後。最終行なら末尾）。
export interface TomlHeader {
    path: string[];
    array: boolean;
    lineEnd: number;
}

export interface TomlStatements {
    headers: TomlHeader[];
    assignments: TomlAssignment[];
}

// basic string のエスケープ（\x と \u / \U は別に扱う）
const ESCAPES: Record<string, string> = {
    b: '\b',
    t: '\t',
    n: '\n',
    f: '\f',
    r: '\r',
    e: '\x1b',
    '"': '"',
    '\\': '\\',
};

/** 2 つのキーのパスが同じか。 */
export function sameTomlPath(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((part, i) => part === b[i]);
}

/**
 * TOML テキストの見出しと代入（配列の要素の内側を除く）を出現順に列挙する。先頭の BOM は読み飛ばす。
 * 想定外の構文では例外を投げる。
 */
export function scanTomlStatements(text: string): TomlStatements {
    return new TomlStatementScanner(text).scan();
}

class TomlStatementScanner {
    private pos: number;
    private readonly headers: TomlHeader[] = [];
    private readonly assignments: TomlAssignment[] = [];

    constructor(private readonly text: string) {
        this.pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
    }

    scan(): TomlStatements {
        let table: string[] = [];
        for (;;) {
            this.skipTrivia();
            if (this.pos >= this.text.length) {
                return { headers: this.headers, assignments: this.assignments };
            }
            if (this.text[this.pos] === '[') {
                const array = this.text[this.pos + 1] === '[';
                this.pos += array ? 2 : 1;
                const path = this.key();
                this.expect(array ? ']]' : ']');
                table = path;
                this.headers.push({ path, array, lineEnd: this.lineEnd() });
            } else {
                const assignment = this.assignment(table, table);
                assignment.lineEnd = this.lineEnd();
            }
        }
    }

    private fail(message: string): never {
        throw new Error(`${message} at offset ${this.pos}`);
    }

    private skipSpaces(): void {
        while (this.text[this.pos] === ' ' || this.text[this.pos] === '\t') {
            this.pos++;
        }
    }

    /** 空白・改行・コメントを読み飛ばす。 */
    private skipTrivia(): void {
        for (;;) {
            const c = this.text[this.pos];
            if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
                this.pos++;
            } else if (c === '#') {
                while (this.pos < this.text.length && this.text[this.pos] !== '\n') {
                    this.pos++;
                }
            } else {
                return;
            }
        }
    }

    private expect(token: string): void {
        this.skipSpaces();
        if (!this.text.startsWith(token, this.pos)) {
            this.fail(`expected ${token}`);
        }
        this.pos += token.length;
    }

    /** 文の後ろ（空白とコメント）を読み飛ばし、行の終端（改行の直後。最終行なら末尾）を返す。 */
    private lineEnd(): number {
        this.skipSpaces();
        if (this.text[this.pos] === '#') {
            while (this.pos < this.text.length && this.text[this.pos] !== '\n') {
                this.pos++;
            }
        }
        if (this.text[this.pos] === '\r') {
            this.pos++;
        }
        if (this.pos >= this.text.length) {
            return this.pos;
        }
        if (this.text[this.pos] !== '\n') {
            this.fail('expected end of line');
        }
        this.pos++;
        return this.pos;
    }

    /** ドット区切りのキーを読む（bare / "basic" / 'literal'）。 */
    private key(): string[] {
        const parts: string[] = [];
        for (;;) {
            this.skipSpaces();
            const c = this.text[this.pos];
            if (c === '"') {
                parts.push(this.basicString());
            } else if (c === "'") {
                parts.push(this.literalString());
            } else {
                const start = this.pos;
                while (/[A-Za-z0-9_-]/.test(this.text[this.pos] ?? '')) {
                    this.pos++;
                }
                if (this.pos === start) {
                    this.fail('expected key');
                }
                parts.push(this.text.slice(start, this.pos));
            }
            this.skipSpaces();
            if (this.text[this.pos] !== '.') {
                return parts;
            }
            this.pos++;
        }
    }

    private basicString(): string {
        let result = '';
        this.pos++;
        for (;;) {
            const c = this.text[this.pos];
            if (c === undefined || c === '\n') {
                this.fail('unterminated string');
            }
            this.pos++;
            if (c === '"') {
                return result;
            }
            if (c !== '\\') {
                result += c;
                continue;
            }
            const e = this.text[this.pos++];
            const digits = e === 'u' ? 4 : e === 'U' ? 8 : e === 'x' ? 2 : 0;
            if (digits > 0) {
                const hex = this.text.slice(this.pos, this.pos + digits);
                if (!/^[0-9A-Fa-f]+$/.test(hex) || hex.length !== digits) {
                    this.fail('invalid escape');
                }
                result += String.fromCodePoint(parseInt(hex, 16));
                this.pos += digits;
            } else if (e in ESCAPES) {
                result += ESCAPES[e];
            } else {
                this.fail('invalid escape');
            }
        }
    }

    private literalString(): string {
        const end = this.text.indexOf("'", this.pos + 1);
        const newline = this.text.indexOf('\n', this.pos + 1);
        if (end === -1 || (newline !== -1 && newline < end)) {
            this.fail('unterminated string');
        }
        const value = this.text.slice(this.pos + 1, end);
        this.pos = end + 1;
        return value;
    }

    /** 複数行文字列（""" / '''）を読み飛ばす。閉じ記号の直前に引用符を 2 つまで含められる。 */
    private skipMultilineString(quote: string): void {
        const delimiter = quote.repeat(3);
        this.pos += 3;
        for (;;) {
            if (this.pos >= this.text.length) {
                this.fail('unterminated string');
            }
            if (quote === '"' && this.text[this.pos] === '\\') {
                this.pos += 2;
            } else if (this.text.startsWith(delimiter, this.pos)) {
                let end = this.pos + 3;
                while (this.text[end] === quote && end - this.pos < 5) {
                    end++;
                }
                this.pos = end;
                return;
            } else {
                this.pos++;
            }
        }
    }

    /** key = value を読み、代入を記録して返す。prefix は所属テーブル（インラインテーブルなら外側の完全パス）。 */
    private assignment(prefix: string[], table: string[] | null): TomlAssignment {
        const path = [...prefix, ...this.key()];
        this.expect('=');
        this.skipSpaces();
        const valueStart = this.pos;
        const inlineOpen = this.text[this.pos] === '{' ? this.pos : null;
        this.value(path);
        const assignment: TomlAssignment = {
            path,
            valueStart,
            valueEnd: this.pos,
            inlineOpen,
            table: table === null ? null : [...table],
            lineEnd: null,
        };
        this.assignments.push(assignment);
        return assignment;
    }

    /** 値を 1 つ読み飛ばす。path を渡したインラインテーブルは内側の代入も記録する。 */
    private value(path: string[] | null): void {
        const c = this.text[this.pos];
        if (c === '"' || c === "'") {
            if (this.text.startsWith(c.repeat(3), this.pos)) {
                this.skipMultilineString(c);
            } else if (c === '"') {
                this.basicString();
            } else {
                this.literalString();
            }
            return;
        }
        if (c === '[') {
            this.pos++;
            for (;;) {
                this.skipTrivia();
                if (this.text[this.pos] === ']') {
                    this.pos++;
                    return;
                }
                this.value(null);
                this.skipTrivia();
                if (this.text[this.pos] === ',') {
                    this.pos++;
                } else if (this.text[this.pos] !== ']') {
                    this.fail('expected , or ]');
                }
            }
        }
        if (c === '{') {
            this.pos++;
            for (;;) {
                this.skipTrivia();
                if (this.text[this.pos] === '}') {
                    this.pos++;
                    return;
                }
                if (path === null) {
                    this.key();
                    this.expect('=');
                    this.skipSpaces();
                    this.value(null);
                } else {
                    this.assignment(path, null);
                }
                this.skipTrivia();
                if (this.text[this.pos] === ',') {
                    this.pos++;
                } else if (this.text[this.pos] !== '}') {
                    this.fail('expected , or }');
                }
            }
        }
        // 数値・真偽値・日時: 区切り文字までを値とし、末尾の空白（日時の区切りの空白ではないもの）は含めない。
        const start = this.pos;
        while (this.pos < this.text.length && !/[,\]}#\r\n]/.test(this.text[this.pos])) {
            this.pos++;
        }
        while (this.pos > start && /[ \t]/.test(this.text[this.pos - 1])) {
            this.pos--;
        }
        if (this.pos === start) {
            this.fail('expected value');
        }
    }
}
