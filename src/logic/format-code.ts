import * as estreePlugin from 'prettier/plugins/estree';
import * as tsPlugin from 'prettier/plugins/typescript';
import { format } from 'prettier/standalone';

export type FormatResult = { ok: true; code: string } | { ok: false; code: string; error: string };

/** Cleans up artifacts that pasting from browsers / chats tends to introduce. */
export function normalizePasted(code: string): string {
  return (
    code
      .replace(/\r\n?/g, '\n')
      // non-breaking and zero-width spaces break the parser
      .replace(/[   ]/g, ' ')
      .replace(/[​-‍﻿]/g, '')
      .replace(/^\n+|\s+$/g, '')
  );
}

/** Formats pasted TypeScript/JavaScript with Prettier; on a syntax error returns the normalized input. */
export async function formatTs(raw: string): Promise<FormatResult> {
  const code = normalizePasted(raw);
  try {
    const formatted = await format(code, {
      parser: 'typescript',
      plugins: [estreePlugin, tsPlugin],
      singleQuote: true,
      printWidth: 80,
      tabWidth: 2,
    });
    return { ok: true, code: formatted.trimEnd() + '\n' };
  } catch (e) {
    const message = e instanceof Error ? e.message.split('\n')[0] : String(e);
    return { ok: false, code: code + '\n', error: message };
  }
}
