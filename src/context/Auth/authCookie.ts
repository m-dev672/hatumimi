import type { User } from "./AuthContext";

/**
 * 学内ポータルのセッションを有効化／認証クッキーを取得。
 * クッキーはブラウザによって自動的に管理されるのでここでは認証情報をPOSTするだけ。
 */

export async function activateSession(userCredentials: User): Promise<boolean> {
  const response = await fetch('/amserver/UI/Login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      IDToken0: '',
      IDToken1: userCredentials.id,
      IDToken2: userCredentials.pass
    })
  })

  const html = await response.text();

  const match = html.match(/<title>(.*?)<\/title>/i);
  if (match) {
    const title = match[1];
    if (title.includes('Please Wait While Redirecting to console')) {
      await fetch('/campusweb/portal.do?page=main', {
          credentials: 'include'
        });
      return true;
    }
  }

  return false;
}

/**
 * セッションを無効化。
 */
export async function deactivateSession(): Promise<boolean> {
  const response = await fetch('/amserver/identity/logout');
  
  return response.ok
}