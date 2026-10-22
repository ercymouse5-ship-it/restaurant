import { json, requireAdmin, type PagesHandler } from '../../_lib';

const maxImageSize = 5 * 1024 * 1024;
const imageTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export const onRequestPost: PagesHandler = async (context) => {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  if (!context.env.IMAGES) return json({ error: 'تخزين الصور غير مربوط على Worker.' }, 503);

  let file: FormDataEntryValue | null;
  try {
    const form = await context.request.formData();
    file = form.get('image');
  } catch {
    return json({ error: 'تعذر قراءة ملف الصورة.' }, 400);
  }

  if (!(file instanceof File)) return json({ error: 'اختر ملف صورة أولاً.' }, 400);
  const extension = imageTypes[file.type];
  if (!extension) return json({ error: 'الصيغ المدعومة: JPG وPNG وWebP وAVIF.' }, 415);
  if (file.size === 0 || file.size > maxImageSize) {
    return json({ error: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت.' }, 413);
  }

  try {
    const key = `${crypto.randomUUID()}.${extension}`;
    await context.env.IMAGES.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    return json({ imageUrl: `/uploads/${key}` });
  } catch {
    return json({ error: 'فشل رفع الصورة إلى Cloudflare R2.' }, 500);
  }
};
