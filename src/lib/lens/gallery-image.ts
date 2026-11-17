export function loadGalleryImage(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => finish(0, 0), 8000);
    function finish(width: number, height: number) {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve({ width, height });
    }
    image.onload = () => finish(image.naturalWidth, image.naturalHeight);
    image.onerror = () => finish(0, 0);
    image.src = src;
  });
}
