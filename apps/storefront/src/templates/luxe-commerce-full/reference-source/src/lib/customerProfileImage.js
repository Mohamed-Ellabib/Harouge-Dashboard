const PROFILE_IMAGE_KEY_PREFIX = 'alsanusi_customer_profile_image_v1:';
const MAX_SOURCE_FILE_SIZE = 10 * 1024 * 1024;
const PROFILE_IMAGE_SIZE = 384;

function getStorageKey(customerId) {
  return `${PROFILE_IMAGE_KEY_PREFIX}${String(customerId || '').trim()}`;
}

export function getCustomerProfileImage(customerId) {
  if (typeof window === 'undefined' || !customerId) return '';

  try {
    return window.localStorage.getItem(getStorageKey(customerId)) || '';
  } catch {
    return '';
  }
}

export function saveCustomerProfileImage(customerId, dataUrl) {
  if (typeof window === 'undefined' || !customerId || !dataUrl) return;

  try {
    window.localStorage.setItem(getStorageKey(customerId), dataUrl);
  } catch {
    throw new Error('تعذر حفظ الصورة على هذا الجهاز. اختر صورة أصغر أو امسح بعض بيانات المتصفح.');
  }
}

export function removeCustomerProfileImage(customerId) {
  if (typeof window === 'undefined' || !customerId) return;

  try {
    window.localStorage.removeItem(getStorageKey(customerId));
  } catch {
    // Storage can be unavailable in private browsing; removal remains best effort.
  }
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

export async function compressCustomerProfileImage(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('اختر صورة بصيغة JPG أو PNG أو WEBP.');
  }
  if (file.size > MAX_SOURCE_FILE_SIZE) {
    throw new Error('حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت.');
  }

  const image = await loadImage(file);
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
  const canvas = document.createElement('canvas');
  canvas.width = PROFILE_IMAGE_SIZE;
  canvas.height = PROFILE_IMAGE_SIZE;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('تعذر تجهيز الصورة على هذا الجهاز.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, PROFILE_IMAGE_SIZE, PROFILE_IMAGE_SIZE);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    PROFILE_IMAGE_SIZE,
    PROFILE_IMAGE_SIZE,
  );

  return canvas.toDataURL('image/webp', 0.82);
}
