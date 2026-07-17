// 記録トークンのクライアント側の取り回し。
// トークンは URL の fragment（#k=<token>）で渡す。fragment はサーバーに送信されない
// ため、アクセスログや Referer にトークンが残らない。読み取ったら localStorage に
// 退避し、URL からは即座に消す（履歴やスクリーンショット経由の漏洩を防ぐ）。

const STORAGE_PREFIX = "mahjong:write-token:";

export function parseTokenFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const token = params.get("k");
  return token ? token : null;
}

export function saveWriteToken(tournamentId: string, token: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + tournamentId, token);
  } catch {
    // プライベートブラウズ等で localStorage が使えない場合は退避を諦める
    // （その場合もページを開いている間は state 上のトークンで記録できる）
  }
}

export function loadWriteToken(tournamentId: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + tournamentId);
  } catch {
    return null;
  }
}

export function buildRecordUrl(origin: string, tournamentId: string, token: string): string {
  return `${origin}/record/${encodeURIComponent(tournamentId)}#k=${encodeURIComponent(token)}`;
}
