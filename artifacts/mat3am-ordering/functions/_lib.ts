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
  batch<T = unknown>(statements: D1Statement[]): Promise<T[]>;
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
  const profile = await db.prepare('SELECT * FROM restaurant_profile WHERE slug = ?')
    .bind(defaultRestaurant.slug)
    .first<Record<string, unknown>>();
  if (!profile) {
    const legacy = await db.prepare('SELECT data_json FROM restaurant_data_backup WHERE slug = ?')
      .bind(defaultRestaurant.slug)
      .first<{ data_json: string }>();
    await saveRestaurant(db, legacy ? JSON.parse(legacy.data_json) as Restaurant : defaultRestaurant);
  }

  const [restaurantProfile, hours, zones, categories, menuRows, sizes, extras, comboRows, comboItems, reviews, links] =
    await Promise.all([
      db.prepare('SELECT * FROM restaurant_profile WHERE slug = ?').bind(defaultRestaurant.slug).first<Record<string, unknown>>(),
      db.prepare('SELECT day, open, close FROM restaurant_hours WHERE slug = ? ORDER BY sort_order').bind(defaultRestaurant.slug).all<Record<string, unknown>>(),
      db.prepare('SELECT name, fee, min_order FROM delivery_zones WHERE slug = ? ORDER BY sort_order').bind(defaultRestaurant.slug).all<Record<string, unknown>>(),
      db.prepare('SELECT id, name, description FROM restaurant_categories WHERE slug = ? ORDER BY sort_order').bind(defaultRestaurant.slug).all<Record<string, unknown>>(),
      db.prepare('SELECT id, name, description, price, category_id, image, badge, popular, spicy FROM menu_items WHERE slug = ? ORDER BY sort_order').bind(defaultRestaurant.slug).all<Record<string, unknown>>(),
      db.prepare('SELECT item_id, name, price FROM menu_item_sizes WHERE slug = ? ORDER BY item_id, sort_order').bind(defaultRestaurant.slug).all<Record<string, unknown>>(),
      db.prepare('SELECT item_id, name, price FROM menu_item_extras WHERE slug = ? ORDER BY item_id, sort_order').bind(defaultRestaurant.slug).all<Record<string, unknown>>(),
      db.prepare('SELECT id, name, description, price, saving, image FROM combo_offers WHERE slug = ? ORDER BY sort_order').bind(defaultRestaurant.slug).all<Record<string, unknown>>(),
      db.prepare('SELECT combo_id, name FROM combo_items WHERE slug = ? ORDER BY combo_id, sort_order').bind(defaultRestaurant.slug).all<Record<string, unknown>>(),
      db.prepare('SELECT name, rating, text FROM restaurant_reviews WHERE slug = ? ORDER BY sort_order').bind(defaultRestaurant.slug).all<Record<string, unknown>>(),
      db.prepare('SELECT platform, url FROM restaurant_social_links WHERE slug = ?').bind(defaultRestaurant.slug).all<Record<string, unknown>>(),
    ]);
  if (!restaurantProfile) throw new Error('Restaurant data is missing from D1');

  const rows = <T>(result: { results?: T[] }) => result.results || [];
  const optionsFor = (result: { results?: Record<string, unknown>[] }, itemId: string) =>
    rows(result).filter((option) => option.item_id === itemId)
      .map((option) => ({ name: String(option.name), price: Number(option.price) }));
  const comboItemsFor = (id: string) =>
    rows(comboItems).filter((item) => item.combo_id === id).map((item) => String(item.name));
  const social = Object.fromEntries(rows(links).map((link) => [String(link.platform), String(link.url)]));

  return {
    slug: String(restaurantProfile.slug),
    name: String(restaurantProfile.name),
    logoText: String(restaurantProfile.logo_text),
    tagline: String(restaurantProfile.tagline),
    description: String(restaurantProfile.description),
    whatsappNumber: String(restaurantProfile.whatsapp_number),
    phone: String(restaurantProfile.phone),
    address: String(restaurantProfile.address),
    mapsLink: String(restaurantProfile.maps_link),
    estimatedDeliveryMinutes: Number(restaurantProfile.estimated_delivery_minutes),
    ordersDelivered: Number(restaurantProfile.orders_delivered),
    offerBanner: { text: String(restaurantProfile.offer_text), endsAt: String(restaurantProfile.offer_ends_at) },
    theme: { primary: String(restaurantProfile.theme_primary), accent: String(restaurantProfile.theme_accent) },
    workingHours: rows(hours).map((row) => ({ day: String(row.day), open: String(row.open), close: String(row.close) })),
    deliveryZones: rows(zones).map((row) => ({ name: String(row.name), fee: Number(row.fee), minOrder: Number(row.min_order) })),
    categories: rows(categories).map((row) => ({
      id: String(row.id), name: String(row.name),
      ...(row.description == null ? {} : { description: String(row.description) }),
    })),
    menu: rows(menuRows).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: String(row.description),
      price: Number(row.price),
      category: String(row.category_id),
      image: String(row.image),
      ...(row.badge == null ? {} : { badge: String(row.badge) }),
      popular: Boolean(row.popular),
      spicy: Boolean(row.spicy),
      ...(optionsFor(sizes, String(row.id)).length ? { sizes: optionsFor(sizes, String(row.id)) } : {}),
      ...(optionsFor(extras, String(row.id)).length ? { extras: optionsFor(extras, String(row.id)) } : {}),
    })),
    combos: rows(comboRows).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: String(row.description),
      items: comboItemsFor(String(row.id)),
      price: Number(row.price),
      saving: Number(row.saving),
      image: String(row.image),
    })),
    reviews: rows(reviews).map((row) => ({ name: String(row.name), rating: Number(row.rating), text: String(row.text) })),
    socialLinks: {
      instagram: social.instagram || '',
      facebook: social.facebook || '',
    },
  };
}

function insertRows(
  db: D1Database,
  table: string,
  columns: string[],
  rows: unknown[][],
): D1Statement[] {
  const statements: D1Statement[] = [];
  const chunkSize = 20;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const tuple = `(${columns.map(() => '?').join(', ')})`;
    const placeholders = chunk.map(() => tuple).join(', ');
    statements.push(db.prepare(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`,
    ).bind(...chunk.flat()));
  }
  return statements;
}

export async function saveRestaurant(db: D1Database, restaurant: Restaurant): Promise<void> {
  const { slug } = restaurant;
  const deletes = [
    'DELETE FROM menu_item_sizes WHERE slug = ?',
    'DELETE FROM menu_item_extras WHERE slug = ?',
    'DELETE FROM combo_items WHERE slug = ?',
    'DELETE FROM restaurant_hours WHERE slug = ?',
    'DELETE FROM delivery_zones WHERE slug = ?',
    'DELETE FROM restaurant_reviews WHERE slug = ?',
    'DELETE FROM restaurant_social_links WHERE slug = ?',
    'DELETE FROM menu_items WHERE slug = ?',
    'DELETE FROM combo_offers WHERE slug = ?',
    'DELETE FROM restaurant_categories WHERE slug = ?',
  ].map((query) => db.prepare(query).bind(slug));

  const statements: D1Statement[] = [
    ...deletes,
    db.prepare(`INSERT INTO restaurant_profile (
      slug, name, logo_text, tagline, description, whatsapp_number, phone, address,
      maps_link, estimated_delivery_minutes, orders_delivered, offer_text, offer_ends_at,
      theme_primary, theme_accent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name, logo_text = excluded.logo_text, tagline = excluded.tagline,
      description = excluded.description, whatsapp_number = excluded.whatsapp_number,
      phone = excluded.phone, address = excluded.address, maps_link = excluded.maps_link,
      estimated_delivery_minutes = excluded.estimated_delivery_minutes,
      orders_delivered = excluded.orders_delivered, offer_text = excluded.offer_text,
      offer_ends_at = excluded.offer_ends_at, theme_primary = excluded.theme_primary,
      theme_accent = excluded.theme_accent`).bind(
      slug, restaurant.name, restaurant.logoText, restaurant.tagline, restaurant.description,
      restaurant.whatsappNumber, restaurant.phone, restaurant.address, restaurant.mapsLink,
      restaurant.estimatedDeliveryMinutes, restaurant.ordersDelivered, restaurant.offerBanner.text,
      restaurant.offerBanner.endsAt, restaurant.theme.primary, restaurant.theme.accent,
    ),
    ...insertRows(db, 'restaurant_categories', ['slug', 'id', 'name', 'description', 'sort_order'],
      restaurant.categories.map((row, index) => [slug, row.id, row.name, row.description ?? null, index])),
    ...insertRows(db, 'menu_items', [
      'slug', 'id', 'name', 'description', 'price', 'category_id', 'image', 'badge', 'popular', 'spicy', 'sort_order',
    ], restaurant.menu.map((row, index) => [
      slug, row.id, row.name, row.description, row.price, row.category, row.image,
      row.badge ?? null, row.popular ? 1 : 0, row.spicy ? 1 : 0, index,
    ])),
    ...insertRows(db, 'menu_item_sizes', ['slug', 'item_id', 'sort_order', 'name', 'price'],
      restaurant.menu.flatMap((item) => (item.sizes || []).map((option, index) => [slug, item.id, index, option.name, option.price]))),
    ...insertRows(db, 'menu_item_extras', ['slug', 'item_id', 'sort_order', 'name', 'price'],
      restaurant.menu.flatMap((item) => (item.extras || []).map((option, index) => [slug, item.id, index, option.name, option.price]))),
    ...insertRows(db, 'combo_offers', [
      'slug', 'id', 'name', 'description', 'price', 'saving', 'image', 'sort_order',
    ], restaurant.combos.map((combo, index) => [
      slug, combo.id, combo.name, combo.description, combo.price, combo.saving, combo.image, index,
    ])),
    ...insertRows(db, 'combo_items', ['slug', 'combo_id', 'sort_order', 'name'],
      restaurant.combos.flatMap((combo) => combo.items.map((item, index) => [slug, combo.id, index, item]))),
    ...insertRows(db, 'restaurant_hours', ['slug', 'sort_order', 'day', 'open', 'close'],
      restaurant.workingHours.map((row, index) => [slug, index, row.day, row.open, row.close])),
    ...insertRows(db, 'delivery_zones', ['slug', 'sort_order', 'name', 'fee', 'min_order'],
      restaurant.deliveryZones.map((row, index) => [slug, index, row.name, row.fee, row.minOrder])),
    ...insertRows(db, 'restaurant_reviews', ['slug', 'sort_order', 'name', 'rating', 'text'],
      restaurant.reviews.map((row, index) => [slug, index, row.name, row.rating, row.text])),
    ...insertRows(db, 'restaurant_social_links', ['slug', 'platform', 'url'], [
      [slug, 'instagram', restaurant.socialLinks.instagram],
      [slug, 'facebook', restaurant.socialLinks.facebook],
    ]),
  ];
  await db.batch(statements);
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
