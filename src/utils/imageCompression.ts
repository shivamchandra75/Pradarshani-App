import type { CompressRequest, CompressResponse } from './imageCompression.worker';

// Long-edge caps: proofs are text pages viewed at up to 4x zoom; covers are small cards.
const MAX_EDGE = { proof: 2560, cover: 800 } as const;

/**
 * Re-encodes an image as AVIF (WebP fallback) at a fixed quality, resizing only
 * when it exceeds the cap. Returns the original file if encoding fails or doesn't help.
 */
export const compressImageIfNeeded = async (
  file: File,
  kind: keyof typeof MAX_EDGE = 'proof'
): Promise<File> => {
  try {
    const image = await decodeToImageData(file);
    const result = await runWorker({ image, maxEdge: MAX_EDGE[kind] });
    if (result.error || !result.buffer || !result.type) throw new Error(result.error);

    // Keep the original if re-encoding at full size didn't save anything
    if (!result.resized && result.buffer.byteLength >= file.size) return file;

    const ext = result.type === 'image/avif' ? 'avif' : 'webp';
    const name = file.name.replace(/\.[^.]*$/, '') + '.' + ext;
    return new File([result.buffer], name, { type: result.type, lastModified: file.lastModified });
  } catch (error) {
    // shortcut: very large photos (>16MP) can exceed iOS canvas limits and upload uncompressed; add a pre-downscale via createImageBitmap resize options if this shows up
    console.error('Error compressing image:', error);
    return file;
  }
};

async function decodeToImageData(file: File): Promise<ImageData> {
  // createImageBitmap applies EXIF orientation; re-encoding drops EXIF/GPS metadata
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    bitmap.close();
  }
}

function runWorker(req: CompressRequest): Promise<CompressResponse> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./imageCompression.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<CompressResponse>) => {
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message));
    };
    worker.postMessage(req, [req.image.data.buffer]);
  });
}
