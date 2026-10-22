import defaultRestaurant from '../src/data/restaurants/furn-elhara';
import type { Restaurant } from '../src/data/types';

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(query: string): D1Statement;
}

export interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
}

export interface PagesContext {
  request: Request;
  env: Env;
}

export type PagesHandler = (context: PagesContext) => Response | Promise<Response>;

export const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });

export async function getRestaurant(db: D1Database): Promise<Restaurant> {
  let row = await db.prepare('SELECT data_json FROM restaurant_data WHERE slug = ?')
    .bind(defaultRestaurant.slug)
    .first<{ data_json: string }>();
  if (!row) {
    await db.prepare(
      'INSERT OR IGNORE INTO restaurant_data (slug, data_json, updated_at) VALUES (?, ?, ?)',
    ).bind(defaultRestaurant.slug, JSON.stringify(defaultRestaurant), new Date().toISOString()).run();
    row = await db.prepare('SELECT data_json FROM restaurant_data WHERE slug = ?')
      .bind(defaultRestaurant.slug)
      .first<{ data_json: string }>();
  }
  if (!row) throw new Error('Restaurant data is missing from D1');
  return JSON.parse(row.data_json) as Restaurant;
}

function base64UrlEncode(value: Uint8Array): string {
  let binary = '';
  value.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return buffer;
}

async function sessionKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createSession(secret: string): Promise<string> {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
  })));
  const signature = await crypto.subtle.sign('HMAC', await sessionKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function isAdmin(request: Request, secret: string | undefined): Promise<boolean> {
  if (!secret || secret.length < 32) return false;
  const cookieHeader = request.headers.get('Cookie') || '';
  const token = cookieHeader.split(';').map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('mat3am_admin='))?.slice('mat3am_admin='.length);
  if (!token) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await sessionKey(secret),
      toArrayBuffer(base64UrlDecode(signature)),
      new TextEncoder().encode(payload),
    );
    if (!valid) return false;
    const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as { exp?: number };
    return typeof claims.exp === 'number' && claims.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function requireAdmin(context: PagesContext): Promise<Response | null> {
  if (await isAdmin(context.request, context.env.ADMIN_SESSION_SECRET)) return null;
  return json({ error: 'يلزم تسجيل الدخول كأدمن.' }, 401);
}

export function sessionCookie(request: Request, value: string, maxAge: number): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `mat3am_admin=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

export async function readJson(request: Request, maxBytes = 65536): Promise<unknown> {
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > maxBytes) throw new Error('حجم البيانات أكبر من المسموح.');
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new Error('حجم البيانات أكبر من المسموح.');
  return JSON.parse(text) as unknown;
}

export function isRestaurant(value: unknown): value is Restaurant {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Restaurant>;
  return candidate.slug === defaultRestaurant.slug
    && typeof candidate.name === 'string'
    && Array.isArray(candidate.categories)
    && Array.isArray(candidate.menu)
    && Array.isArray(candidate.combos)
    && candidate.menu.length <= 500
    && candidate.categories.length <= 50;
}
