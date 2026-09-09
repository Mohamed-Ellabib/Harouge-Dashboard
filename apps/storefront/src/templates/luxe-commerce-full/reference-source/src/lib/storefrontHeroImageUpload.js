import { supabase } from '@/utils/supabase.js';

const IMAGE_BUCKET = import.meta.env.VITE_SUPABASE_PRODUCT_IMAGE_BUCKET || 'product-images';
const MAX_SOURCE_SIZE = 12 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 900 * 1024;
const MAX_DIMENSION = 2200;
const OUTPUT_TYPE = 'image/webp';
const DIMENSION_STEPS = [1, 0.9, 0.78, 0.66, 0.54];
const QUALITY_STEPS = [0.84, 0.76, 0.68, 0.6, 0.52];

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر قراءة الصورة. اختر ملف صورة صالحاً.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('تعذر ضغط الصورة.'));
    }, OUTPUT_TYPE, quality);
  });
}

async function compressHeroImage(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('اختر صورة بصيغة JPG أو PNG أو WEBP.');
  }

  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error(`حجم الصورة كبير جداً. الحد الأقصى ${formatFileSize(MAX_SOURCE_SIZE)}.`);
  }

  const image = await loadImage(file);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const initialScale = Math.min(1, MAX_DIMENSION / Math.max(naturalWidth, naturalHeight));
  const baseWidth = Math.max(1, Math.round(naturalWidth * initialScale));
  const baseHeight = Math.max(1, Math.round(naturalHeight * initialScale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });

  if (!context) throw new Error('متصفحك لا يدعم ضغط الصور.');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  let compressedBlob = null;
  for (const dimensionScale of DIMENSION_STEPS) {
    canvas.width = Math.max(1, Math.round(baseWidth * dimensionScale));
    canvas.height = Math.max(1, Math.round(baseHeight * dimensionScale));
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of QUALITY_STEPS) {
      compressedBlob = await canvasToBlob(canvas, quality);
      if (compressedBlob.size <= MAX_OUTPUT_SIZE) break;
    }

    if (compressedBlob?.size <= MAX_OUTPUT_SIZE) break;
  }

  if (!compressedBlob || compressedBlob.size > MAX_OUTPUT_SIZE) {
    throw new Error('تعذر ضغط الصورة إلى الحجم المناسب. اختر صورة أبسط أو أصغر.');
  }

  return compressedBlob;
}

function createStoragePath(fileName) {
  const baseName = String(fileName || 'hero-image')
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 70) || 'hero-image';
  const token = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `storefront-hero/${Date.now()}-${token}-${baseName}.webp`;
}

export async function uploadStorefrontHeroImage(file) {
  const blob = await compressHeroImage(file);
  const storagePath = createStoragePath(file.name);
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(storagePath, blob, {
      cacheControl: '31536000',
      contentType: OUTPUT_TYPE,
      upsert: false,
    });

  if (error) throw new Error(`تعذر رفع الصورة: ${error.message}`);

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath);
  if (!data?.publicUrl) throw new Error('تعذر إنشاء رابط عام للصورة.');

  return {
    image: data.publicUrl,
    storagePath,
    size: blob.size,
    sizeLabel: formatFileSize(blob.size),
  };
}

export async function removeStorefrontHeroImages(storagePaths = []) {
  const paths = [...new Set(storagePaths.filter((path) => String(path || '').startsWith('storefront-hero/')))].slice(0, 20);
  if (!paths.length) return;

  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
  if (error) throw new Error(`تعذر حذف الصور القديمة: ${error.message}`);
}

