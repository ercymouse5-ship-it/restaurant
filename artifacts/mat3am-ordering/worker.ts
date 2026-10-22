import { onRequestGet as getRestaurant } from './functions/api/restaurant';
import { onRequestPost as createOrder } from './functions/api/orders';
import { onRequestGet as getAdminSession } from './functions/api/admin/session';
import { onRequestPost as adminLogin } from './functions/api/admin/login';
import { onRequestPost as adminLogout } from './functions/api/admin/logout';
import { onRequestPost as uploadAdminImage } from './functions/api/admin/images';
import { onRequestPut as updateRestaurant } from './functions/api/admin/restaurant';
import { onRequestGet as listOrders, onRequestPatch as updateOrder } from './functions/api/admin/orders';
import { json, type D1Database, type R2Bucket } from './functions/_lib';

interface WorkerEnv {
  DB: D1Database;
  IMAGES: R2Bucket;
  ASSETS: { fetch(request: Request): Promise<Response> };
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
}

const routes: Record<string, Record<string, (context: { request: Request; env: WorkerEnv }) => Response | Promise<Response>>> = {
  '/api/restaurant': { GET: getRestaurant },
  '/api/orders': { POST: createOrder },
  '/api/admin/session': { GET: getAdminSession },
  '/api/admin/login': { POST: adminLogin },
  '/api/admin/logout': { POST: adminLogout },
  '/api/admin/images': { POST: uploadAdminImage },
  '/api/admin/restaurant': { PUT: updateRestaurant },
  '/api/admin/orders': { GET: listOrders, PATCH: updateOrder },
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const route = routes[url.pathname]?.[request.method];
    if (route) return route({ request, env });
    if (url.pathname.startsWith('/uploads/')) {
      if (request.method !== 'GET') return json({ error: 'الطريقة غير مدعومة.' }, 405);
      const key = url.pathname.slice('/uploads/'.length);
      if (!/^[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.test(key)) {
        return json({ error: 'الصورة غير موجودة.' }, 404);
      }
      const image = await env.IMAGES.get(key);
      if (!image) return json({ error: 'الصورة غير موجودة.' }, 404);
      return new Response(image.body, {
        headers: {
          'Content-Type': image.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'المسار غير موجود.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
