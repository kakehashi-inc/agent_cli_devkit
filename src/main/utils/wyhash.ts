// wyhash（final3）の 64 ビットハッシュ。Bun.hash と同じ値を返す。

const MASK64 = (1n << 64n) - 1n;
const SECRET = [0xa0761d6478bd642fn, 0xe7037ed1a0b428dbn, 0x8ebc6af09c88c6e3n, 0x589965cc75374cc3n];

/** 64 ビット同士の積を下位・上位 64 ビットに分けて返す。 */
function mum(a: bigint, b: bigint): [bigint, bigint] {
    const product = a * b;
    return [product & MASK64, product >> 64n];
}

/** 64 ビット同士の積の下位と上位の排他的論理和。 */
function mix(a: bigint, b: bigint): bigint {
    const [low, high] = mum(a, b);
    return low ^ high;
}

function read64(buf: Buffer, offset: number): bigint {
    return buf.readBigUInt64LE(offset);
}

function read32(buf: Buffer, offset: number): bigint {
    return BigInt(buf.readUInt32LE(offset));
}

/** 文字列（UTF-8）の wyhash を符号なし 64 ビット整数で返す。 */
export function wyhash64(text: string, seed = 0n): bigint {
    const input = Buffer.from(text, 'utf8');
    const len = input.length;
    let state0 = seed ^ mix(seed ^ SECRET[0], SECRET[1]);
    let a: bigint;
    let b: bigint;
    if (len <= 16) {
        if (len >= 4) {
            const end = len - 4;
            const quarter = (len >> 3) << 2;
            a = (read32(input, 0) << 32n) | read32(input, quarter);
            b = (read32(input, end) << 32n) | read32(input, end - quarter);
        } else if (len > 0) {
            a = (BigInt(input[0]) << 16n) | (BigInt(input[len >> 1]) << 8n) | BigInt(input[len - 1]);
            b = 0n;
        } else {
            a = 0n;
            b = 0n;
        }
    } else {
        let i = 0;
        if (len >= 48) {
            let state1 = state0;
            let state2 = state0;
            while (i + 48 < len) {
                state0 = mix(read64(input, i) ^ SECRET[1], read64(input, i + 8) ^ state0);
                state1 = mix(read64(input, i + 16) ^ SECRET[2], read64(input, i + 24) ^ state1);
                state2 = mix(read64(input, i + 32) ^ SECRET[3], read64(input, i + 40) ^ state2);
                i += 48;
            }
            state0 ^= state1 ^ state2;
        }
        while (i + 16 < len) {
            state0 = mix(read64(input, i) ^ SECRET[1], read64(input, i + 8) ^ state0);
            i += 16;
        }
        a = read64(input, len - 16);
        b = read64(input, len - 8);
    }
    [a, b] = mum(a ^ SECRET[1], b ^ state0);
    return mix(a ^ SECRET[0] ^ BigInt(len), b ^ SECRET[1]);
}
