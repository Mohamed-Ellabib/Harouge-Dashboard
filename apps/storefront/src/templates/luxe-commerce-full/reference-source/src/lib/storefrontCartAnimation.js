const CART_PULSE_DURATION_MS = 720;
const CART_FLIGHT_DURATION_MS = 860;
const cartPulseTimers = new WeakMap();

function canAnimate() {
  return (
    typeof window !== 'undefined'
    && typeof document !== 'undefined'
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function resolveSourceImage({ event, sourceElement, sourceSelector }) {
  if (sourceElement) return sourceElement;

  const trigger = event?.currentTarget;
  const scopedSource = trigger
    ?.closest('.watches-page__product, .customer-product, .product-details-page')
    ?.querySelector(sourceSelector);

  return scopedSource || document.querySelector(sourceSelector);
}

export function pulseCartElement(cartElement) {
  if (!cartElement || typeof window === 'undefined') return;

  const existingTimer = cartPulseTimers.get(cartElement);
  if (existingTimer) window.clearTimeout(existingTimer);

  cartElement.classList.remove('is-cart-pulse');
  window.requestAnimationFrame(() => {
    cartElement.classList.add('is-cart-pulse');
    const timer = window.setTimeout(() => {
      cartElement.classList.remove('is-cart-pulse');
      cartPulseTimers.delete(cartElement);
    }, CART_PULSE_DURATION_MS);
    cartPulseTimers.set(cartElement, timer);
  });
}

function createArrivalBurst(targetCenterX, targetCenterY) {
  const burst = document.createElement('span');
  burst.className = 'customer-cart-arrival';
  burst.setAttribute('aria-hidden', 'true');
  Object.assign(burst.style, {
    left: `${targetCenterX}px`,
    top: `${targetCenterY}px`,
  });

  for (let index = 0; index < 6; index += 1) {
    const ray = document.createElement('i');
    ray.style.setProperty('--arrival-ray-angle', `${index * 60}deg`);
    burst.appendChild(ray);
  }

  document.body.appendChild(burst);
  return burst;
}

export function animateProductToCart({
  cartElement,
  event,
  sourceElement,
  sourceSelector = 'img',
} = {}) {
  if (!cartElement || typeof document === 'undefined') return;

  const sourceImage = resolveSourceImage({ event, sourceElement, sourceSelector });
  if (!sourceImage) {
    pulseCartElement(cartElement);
    return;
  }

  const sourceRect = sourceImage.getBoundingClientRect();
  const targetRect = cartElement.getBoundingClientRect();
  if (!sourceRect.width || !sourceRect.height || !targetRect.width || !targetRect.height) {
    pulseCartElement(cartElement);
    return;
  }

  if (!canAnimate() || typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') {
    pulseCartElement(cartElement);
    return;
  }

  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const sourceCenterY = sourceRect.top + sourceRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const deltaX = targetCenterX - sourceCenterX;
  const deltaY = targetCenterY - sourceCenterY;
  const travelDistance = Math.hypot(deltaX, deltaY);
  const scaleToFit = Math.min(1, 138 / sourceRect.width, 158 / sourceRect.height);
  const flyerWidth = sourceRect.width * scaleToFit;
  const flyerHeight = sourceRect.height * scaleToFit;
  const curveLift = Math.min(148, Math.max(58, travelDistance * 0.16));
  const directionLength = Math.max(1, travelDistance);
  const trailX = -(deltaX / directionLength);
  const trailY = -(deltaY / directionLength);

  const flyer = document.createElement('div');
  flyer.className = 'customer-cart-flyer';
  flyer.setAttribute('aria-hidden', 'true');
  Object.assign(flyer.style, {
    left: `${sourceCenterX - flyerWidth / 2}px`,
    top: `${sourceCenterY - flyerHeight / 2}px`,
    width: `${flyerWidth}px`,
    height: `${flyerHeight}px`,
  });

  const flyingImage = sourceImage.cloneNode(true);
  flyingImage.removeAttribute('id');
  flyingImage.className = 'customer-cart-flyer__image';

  const spark = document.createElement('span');
  spark.className = 'customer-cart-flyer__spark';

  const trail = document.createElement('span');
  trail.className = 'customer-cart-flyer__trail';
  const trailParticles = Array.from({ length: 5 }, (_, index) => {
    const particle = document.createElement('i');
    particle.style.setProperty('--cart-particle-delay', `${index * 34}ms`);
    particle.style.setProperty('--cart-particle-size', `${Math.max(4, 9 - index)}px`);
    trail.appendChild(particle);
    return particle;
  });

  flyer.append(trail, flyingImage, spark);
  document.body.appendChild(flyer);

  const arrivalBurst = createArrivalBurst(targetCenterX, targetCenterY);

  let didPulse = false;
  const triggerPulse = () => {
    if (didPulse) return;
    didPulse = true;
    pulseCartElement(cartElement);
  };
  const pulseTimer = window.setTimeout(triggerPulse, CART_FLIGHT_DURATION_MS - 105);

  const pathAnimation = flyer.animate(
    [
      { opacity: 0, transform: 'translate3d(0, 0, 0) scale(0.82)' },
      { opacity: 1, offset: 0.1, transform: 'translate3d(0, -12px, 0) scale(1.06)' },
      { opacity: 1, offset: 0.38, transform: `translate3d(${deltaX * 0.24}px, ${deltaY * 0.18 - curveLift}px, 0) scale(0.92)` },
      { opacity: 0.94, offset: 0.72, transform: `translate3d(${deltaX * 0.74}px, ${deltaY * 0.66 - curveLift * 0.42}px, 0) scale(0.5)` },
      { opacity: 0, transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.08)` },
    ],
    {
      duration: CART_FLIGHT_DURATION_MS,
      easing: 'cubic-bezier(0.22, 0.72, 0.18, 1)',
      fill: 'forwards',
    },
  );

  const imageAnimation = flyingImage.animate(
    [
      { filter: 'drop-shadow(0 8px 9px rgba(52, 35, 22, 0.18))', transform: 'rotate(0deg)' },
      { filter: 'drop-shadow(0 16px 16px rgba(52, 35, 22, 0.28))', offset: 0.42, transform: `rotate(${deltaX < 0 ? -5 : 5}deg)` },
      { filter: 'drop-shadow(0 5px 7px rgba(201, 150, 85, 0.22))', transform: `rotate(${deltaX < 0 ? 3 : -3}deg)` },
    ],
    {
      duration: CART_FLIGHT_DURATION_MS,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards',
    },
  );

  const sparkAnimation = spark.animate(
    [
      { opacity: 0, transform: 'translate3d(-14px, 20px, 0) scale(0.2)' },
      { opacity: 0.82, offset: 0.28, transform: 'translate3d(12px, -12px, 0) scale(1)' },
      { opacity: 0, transform: 'translate3d(28px, -28px, 0) scale(0.35)' },
    ],
    {
      duration: CART_FLIGHT_DURATION_MS * 0.72,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards',
    },
  );

  const particleAnimations = trailParticles.map((particle, index) => particle.animate(
    [
      { opacity: 0, transform: 'translate3d(0, 0, 0) scale(0.2)' },
      { opacity: 0.9 - index * 0.1, offset: 0.2, transform: `translate3d(${trailX * (10 + index * 5)}px, ${trailY * (10 + index * 5)}px, 0) scale(1)` },
      { opacity: 0, transform: `translate3d(${trailX * (34 + index * 9)}px, ${trailY * (34 + index * 9) + index * 3}px, 0) scale(0.2)` },
    ],
    {
      delay: 80 + index * 34,
      duration: 430 + index * 24,
      easing: 'cubic-bezier(0.2, 0.75, 0.25, 1)',
      iterations: 2,
    },
  ));

  const arrivalAnimation = arrivalBurst.animate(
    [
      { opacity: 0, transform: 'translate3d(-50%, -50%, 0) scale(0.35)' },
      { opacity: 0, offset: 0.7, transform: 'translate3d(-50%, -50%, 0) scale(0.35)' },
      { opacity: 1, offset: 0.82, transform: 'translate3d(-50%, -50%, 0) scale(1)' },
      { opacity: 0, transform: 'translate3d(-50%, -50%, 0) scale(1.55)' },
    ],
    {
      duration: CART_FLIGHT_DURATION_MS + 120,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards',
    },
  );

  Promise.allSettled([
    pathAnimation.finished,
    imageAnimation.finished,
    sparkAnimation.finished,
    arrivalAnimation.finished,
    ...particleAnimations.map((animation) => animation.finished),
  ])
    .finally(() => {
      window.clearTimeout(pulseTimer);
      flyer.remove();
      arrivalBurst.remove();
      triggerPulse();
    });
}
