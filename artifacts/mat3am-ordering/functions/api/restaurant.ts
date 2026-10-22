import { getRestaurant, json, type PagesHandler } from '../_lib';

export const onRequestGet: PagesHandler = async ({ env }) => {
  try {
    return json(await getRestaurant(env.DB));
  } catch {
    return json({ error: 'تعذر تحميل بيانات المطعم من قاعدة البيانات.' }, 500);
  }
};
