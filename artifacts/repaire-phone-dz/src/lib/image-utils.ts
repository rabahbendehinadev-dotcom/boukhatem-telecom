/**
 * Converts any stored image value to a browser-resolvable URL.
 *
 * Cases handled:
 *  - Object-storage path  "/objects/..."  → "/api/storage/objects/..."
 *  - Full URL             "https://..."   → returned as-is
 *  - Empty / undefined                   → undefined (use a fallback in the caller)
 */
export function getImageSrc(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('/objects/')) return `/api/storage${value}`;
  if (value.startsWith('http')) return value;
  // Catch any other relative path that doesn't start with /objects — return as-is
  return value;
}

/** Convenience: returns a product-placeholder URL when the image is missing. */
export function getProductImageSrc(value?: string | null): string {
  return getImageSrc(value) ?? 'https://placehold.co/400x400/f8fafc/1e3a5f?text=Produit';
}
