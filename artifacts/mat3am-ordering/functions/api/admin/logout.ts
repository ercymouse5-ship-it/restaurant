import { json, sessionCookie, type PagesHandler } from '../../_lib';

export const onRequestPost: PagesHandler = async ({ request }) =>
  json({ authenticated: false }, 200, { 'Set-Cookie': sessionCookie(request, '', 0) });
