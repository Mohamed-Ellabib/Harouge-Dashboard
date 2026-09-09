import React, { useEffect, useMemo, useRef, useState } from 'react';

const SWIPE_THRESHOLD = 34;

function normalizeImages(images, fallbackImage, alt) {
  const normalized = (Array.isArray(images) ? images : [])
    .map((image) => {
      if (typeof image === 'string') {
        return { url: image, alt };
      }

      return {
        url: image?.url || image?.image_url || '',
        alt: image?.alt || image?.alt_text_ar || image?.alt_text_en || alt,
      };
    })
    .filter((image) => image.url);

  if (normalized.length > 0) {
    return normalized;
  }

  return fallbackImage ? [{ url: fallbackImage, alt }] : [];
}

export default function ProductImageCarousel({
  alt,
  className,
  fallbackImage,
  images,
  placeholderClassName,
}) {
  const normalizedImages = useMemo(() => normalizeImages(images, fallbackImage, alt), [alt, fallbackImage, images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartRef = useRef(null);
  const blockClickRef = useRef(false);
  const canSwipe = normalizedImages.length > 1;
  const activeImage = normalizedImages[activeIndex] || normalizedImages[0] || null;

  useEffect(() => {
    setActiveIndex((currentIndex) => {
      if (normalizedImages.length === 0) return 0;
      return Math.min(currentIndex, normalizedImages.length - 1);
    });
  }, [normalizedImages.length]);

  function showAdjacentImage(direction) {
    setActiveIndex((currentIndex) => (currentIndex + direction + normalizedImages.length) % normalizedImages.length);
  }

  function handlePointerDown(event) {
    if (!canSwipe) return;

    pointerStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp(event) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;

    if (!canSwipe || !start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const isHorizontalSwipe = Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;

    if (!isHorizontalSwipe) return;

    event.preventDefault();
    event.stopPropagation();
    blockClickRef.current = true;
    showAdjacentImage(deltaX < 0 ? 1 : -1);

    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        blockClickRef.current = false;
      }, 0);
    }
  }

  function handlePointerCancel() {
    pointerStartRef.current = null;
  }

  function handleClickCapture(event) {
    if (!blockClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    blockClickRef.current = false;
  }

  return (
    <div
      className={[className, 'product-image-carousel', canSwipe ? 'product-image-carousel--swipeable' : ''].filter(Boolean).join(' ')}
      onClickCapture={handleClickCapture}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {activeImage ? (
        <img src={activeImage.url} alt={activeImage.alt || alt} decoding="async" draggable="false" loading="lazy" />
      ) : (
        <span className={placeholderClassName} aria-hidden="true" />
      )}

      {canSwipe ? (
        <div className="product-image-carousel__dots" aria-hidden="true">
          {normalizedImages.map((image, index) => (
            <span className={index === activeIndex ? 'is-active' : undefined} key={`${image.url}-${index}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
