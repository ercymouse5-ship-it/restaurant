import { getRestaurant, json, readJson, type PagesHandler } from '../_lib';

type IncomingLine = { itemId: string; quantity: number; note?: string; size?: string; extras?: string[] };
type IncomingOrder = {
  customer: { name: string; phone: string; address: string };
  zone: string;
  payment: string;
  items: IncomingLine[];
};

const validText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export const onRequestPost: PagesHandler = async ({ request, env }) => {
  let body: IncomingOrder;
  try {
    body = await readJson(request) as IncomingOrder;
  } catch {
    return json({ error: 'بيانات الطلب غير صالحة.' }, 400);
  }

  if (!body || !body.customer || !validText(body.customer.name, 120)
    || !validText(body.customer.phone, 30) || !validText(body.customer.address, 500)
    || !validText(body.zone, 100) || !['كاش عند الاستلام', 'فودافون كاش', 'انستاباي'].includes(body.payment)
    || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) {
    return json({ error: 'راجع بيانات العميل والطلب وحاول مرة تانية.' }, 400);
  }

  const phoneDigits = body.customer.phone.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[^\d+]/g, '');
  if (!/^(?:(?:\+?20)|0)?1[0125]\d{8}$/.test(phoneDigits)) {
    return json({ error: 'رقم الموبايل غير صالح.' }, 400);
  }

  try {
    const restaurant = await getRestaurant(env.DB);
    const zone = restaurant.deliveryZones.find((entry) => entry.name === body.zone);
    if (!zone) return json({ error: 'منطقة التوصيل غير متاحة.' }, 400);

    const lines = [];
    let subtotal = 0;
    for (const line of body.items) {
      if (!line || !validText(line.itemId, 100) || !Number.isInteger(line.quantity)
        || line.quantity < 1 || line.quantity > 20 || (line.note && line.note.length > 300)
        || (line.extras !== undefined && (!Array.isArray(line.extras) || line.extras.length > 20))) {
        return json({ error: 'أحد أصناف الطلب غير صالح.' }, 400);
      }

      const menuItem = restaurant.menu.find((item) => item.id === line.itemId);
      const combo = restaurant.combos.find((item) => item.id === line.itemId);
      const isUpsell = line.itemId === 'upsell-fries-drink';
      if (!menuItem && !combo && !isUpsell) return json({ error: 'أحد الأصناف لم يعد متاحاً.' }, 400);
      if (menuItem && line.size && !menuItem.sizes?.some((size) => size.name === line.size)) {
        return json({ error: `حجم ${menuItem.name} غير صالح.` }, 400);
      }
      if (!menuItem?.sizes?.length && line.size) return json({ error: 'حجم الصنف غير صالح.' }, 400);
      const extras = (line.extras || []).map((name) => {
        if (typeof name !== 'string' || !menuItem?.extras?.some((extra) => extra.name === name)) {
          throw new Error('Invalid item extra');
        }
        const extra = menuItem.extras.find((entry) => entry.name === name);
        return { name: extra!.name, price: extra!.price };
      });
      const size = menuItem?.sizes?.find((entry) => entry.name === line.size) || menuItem?.sizes?.[0];
      const unitPrice = menuItem?.price ?? combo?.price ?? 30;
      const lineTotal = (unitPrice + (size?.price || 0) + extras.reduce((sum, extra) => sum + extra.price, 0)) * line.quantity;
      subtotal += lineTotal;
      lines.push({
        itemId: line.itemId,
        name: menuItem?.name || combo?.name || 'بطاطس ومشروب — عرض السلة',
        quantity: line.quantity,
        note: (line.note || '').trim(),
        size: size?.name || null,
        extras,
        unitPrice: unitPrice + (size?.price || 0) + extras.reduce((sum, extra) => sum + extra.price, 0),
        total: lineTotal,
      });
    }

    if (subtotal < zone.minOrder) {
      return json({ error: `الحد الأدنى للطلب في المنطقة ${zone.minOrder} ج.م.` }, 400);
    }
    const createdAt = new Date().toISOString();
    const id = crypto.randomUUID();
    const deliveryFee = zone.fee;
    const order = {
      id, status: 'new', createdAt, customer: body.customer, zone: zone.name,
      payment: body.payment, lines, subtotal, deliveryFee, total: subtotal + deliveryFee,
    };
    await env.DB.prepare(
      'INSERT INTO orders (id, slug, status, order_json, created_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(id, restaurant.slug, order.status, JSON.stringify(order), createdAt).run();
    return json({ id, status: order.status }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid item extra') {
      return json({ error: 'إضافة أحد الأصناف غير صالحة.' }, 400);
    }
    return json({ error: 'تعذر حفظ الطلب حالياً.' }, 500);
  }
};
