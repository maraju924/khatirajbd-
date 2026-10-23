/**
 * Optimizes image URLs for Google PageSpeed Insights (Mobile & Desktop)
 * - Converts Unsplash & compatible CDN URLs to WebP/AVIF (`auto=format`)
 * - Resizes images to exact display dimensions (`w=...`) to save bandwidth on 4G mobile
 */
export function optimizeImageUrl(
  url: string | undefined | null,
  width = 400,
  quality = 75
): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Optimize Unsplash URLs automatically
  if (trimmed.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(trimmed);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('w', String(width));
      parsed.searchParams.set('q', String(quality));
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}
