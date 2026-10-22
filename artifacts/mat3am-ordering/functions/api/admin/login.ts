import { createSession, json, readJson, sessionCookie, type PagesHandler } from '../../_lib';

async function passwordMatches(input: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [inputHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(input)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const inputBytes = new Uint8Array(inputHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < inputBytes.length; index += 1) difference |= inputBytes[index] ^ expectedBytes[index];
  return difference === 0;
}

export const onRequestPost: PagesHandler = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET.length < 32) {
    return json({ error: 'إعدادات دخول الإدارة غير مكتملة على الخادم.' }, 503);
  }
  let body: { password?: unknown };
  try {
    body = await readJson(request, 4096) as { password?: unknown };
  } catch {
    return json({ error: 'بيانات تسجيل الدخول غير صالحة.' }, 400);
  }
  if (typeof body.password !== 'string' || body.password.length > 512
    || !await passwordMatches(body.password, env.ADMIN_PASSWORD)) {
    return json({ error: 'كلمة المرور غير صحيحة.' }, 401);
  }
  const token = await createSession(env.ADMIN_SESSION_SECRET);
  return json({ authenticated: true }, 200, { 'Set-Cookie': sessionCookie(request, token, 60 * 60 * 12) });
};
