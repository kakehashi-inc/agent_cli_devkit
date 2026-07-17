// 英語ロケール。アプリ共通の文言と agent 別の文言を合成する。
// agent を追加する場合は <agent>.ts を作成し、ここに 1 行追加する。
import app from './app';
import claude from './claude';
import codex from './codex';
import agy from './agy';
import grok from './grok';
import opencode from './opencode';

export default {
    ...app,
    claude,
    codex,
    agy,
    grok,
    opencode,
};
