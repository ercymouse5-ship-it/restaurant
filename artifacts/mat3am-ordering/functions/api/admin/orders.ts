import { json, requireAdmin, type PagesHandler } from '../../_lib';

type StoredOrder = { id: string; status: string; [key: string]: unknown };
const statuses = ['new', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'];

export const onRequestGet: PagesHandler = async (context) => {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  try {
    const rows = await context.env.DB.prepare(
      'SELECT order_json FROM orders WHERE slug = ? ORDER BY created_at DESC LIMIT 200',
    ).bind('furn-elhara').all<{ order_json: string }>();
    const orders = (rows.results || []).map((row) => JSON.parse(row.order_json) as StoredOrder);
    return json({ orders });
  } catch {
    return json({ error: 'تعذر تحميل الطلبات.' }, 500);
  }
};

export const onRequestPatch: PagesHandler = async (context) => {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  let body: { id?: unknown; status?: unknown };
  try {
    body = await context.request.json() as { id?: unknown; status?: unknown };
  } catch {
    return json({ error: 'بيانات تحديث الطلب غير صالحة.' }, 400);
  }
  if (typeof body.id !== 'string' || typeof body.status !== 'string' || !statuses.includes(body.status)) {
    return json({ error: 'معرّف الطلب أو الحالة غير صالح.' }, 400);
  }
  try {
    const row = await context.env.DB.prepare('SELECT order_json FROM orders WHERE id = ? AND slug = ?')
      .bind(body.id, 'furn-elhara')
      .first<{ order_json: string }>();
    if (!row) return json({ error: 'الطلب غير موجود.' }, 404);
    const order = JSON.parse(row.order_json) as StoredOrder;
    order.status = body.status;
    await context.env.DB.prepare('UPDATE orders SET status = ?, order_json = ? WHERE id = ?')
      .bind(body.status, JSON.stringify(order), body.id)
      .run();
    return json({ updated: true });
  } catch {
    return json({ error: 'تعذر تحديث حالة الطلب.' }, 500);
  }
};
