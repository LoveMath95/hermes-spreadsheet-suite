const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp"
]);

export function isSupportedImageMimeType(mimeType: string | undefined | null): boolean {
  if (!mimeType) {
    return false;
  }

  return SUPPORTED_IMAGE_MIME_TYPES.has(mimeType.toLowerCase());
}

export function filterSupportedImageFiles<T extends { type?: string }>(
  files: Iterable<T> | ArrayLike<T>
): T[] {
  return Array.from(files as ArrayLike<T>).filter((file) =>
    isSupportedImageMimeType(file.type)
  );
}
