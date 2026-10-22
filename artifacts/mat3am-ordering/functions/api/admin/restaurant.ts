import { getRestaurant, isRestaurant, json, readJson, requireAdmin, saveRestaurant, type PagesHandler } from '../../_lib';

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
    await saveRestaurant(context.env.DB, restaurant);
    return json({ saved: true });
  } catch {
    return json({ error: 'تعذر حفظ التعديلات في قاعدة البيانات.' }, 500);
  }
};
