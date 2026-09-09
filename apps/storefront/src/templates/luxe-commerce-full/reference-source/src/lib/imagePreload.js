const preloadedImageUrls = new Set();

function preloadImage(url) {
  return new Promise((resolve) => {
    if (!url || preloadedImageUrls.has(url) || typeof Image === 'undefined') {
      resolve();
      return;
    }

    const image = new Image();
    let didFinish = false;

    function finish() {
      if (didFinish) return;
      didFinish = true;
      preloadedImageUrls.add(url);
      resolve();
    }

    image.onload = finish;
    image.onerror = finish;
    image.decoding = 'async';
    image.src = url;

    if (image.complete) {
      finish();
    }
  });
}

export function preloadImages(urls = []) {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  return Promise.all(uniqueUrls.map(preloadImage)).then(() => undefined);
}
