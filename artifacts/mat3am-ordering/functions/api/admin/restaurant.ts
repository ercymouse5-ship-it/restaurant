import { getRestaurant, isRestaurant, json, readJson, requireAdmin, type PagesHandler } from '../../_lib';

export const onRequestPut: PagesHandler = async (context) => {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  let restaurant: unknown;
  try {
    restaurant = await readJson(context.request);
  } catch {
    return json({ error: 'بيانات المطعم غير صالحة.' }, 400);
  }
  if (!isRestaurant(restaurant)) return json({ error: 'بيانات المطعم أو المنيو غير مكتملة.' }, 400);
  try {
    await getRestaurant(context.env.DB);
    await context.env.DB.prepare(
      'UPDATE restaurant_data SET data_json = ?, updated_at = ? WHERE slug = ?',
    ).bind(JSON.stringify(restaurant), new Date().toISOString(), restaurant.slug).run();
    return json({ saved: true });
  } catch {
    return json({ error: 'تعذر حفظ التعديلات في قاعدة البيانات.' }, 500);
  }
};
