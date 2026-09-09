export function isStorefrontSkeletonPreviewEnabled() {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('skeleton') === '1';
}
