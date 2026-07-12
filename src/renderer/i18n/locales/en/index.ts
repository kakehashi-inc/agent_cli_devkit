// 英語ロケール。アプリ共通の文言と agent 別の文言（claude.* / codex.*）を合成する。
// agent を追加する場合は <agent>.ts を作成し、ここに 1 行追加する。
import app from './app';
import claude from './claude';
import codex from './codex';

export default {
    ...app,
    claude,
    codex,
};
