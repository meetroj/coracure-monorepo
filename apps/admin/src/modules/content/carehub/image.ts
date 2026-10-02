/** Cover-image rules, kept out of the component so they are testable. */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Returns an error message, or null when the file is acceptable. */
export function validateImage(file: { type: string; size: number }): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type))
    return 'Use a JPG, PNG or WebP image.';
  if (file.size > MAX_IMAGE_BYTES) return 'That image is over 5 MB. Choose a smaller file.';
  if (file.size === 0) return 'That file is empty.';
  return null;
}

/** Data URL, so the mock store keeps the image across navigation. No upload. */
export const readAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
