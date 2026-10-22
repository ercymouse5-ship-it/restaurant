import { isAdmin, json, type PagesHandler } from '../../_lib';

export const onRequestGet: PagesHandler = async ({ request, env }) => {
  return json({ authenticated: await isAdmin(request, env.ADMIN_SESSION_SECRET) });
};
