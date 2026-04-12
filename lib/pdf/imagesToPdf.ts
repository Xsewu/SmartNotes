/**
 * Image-to-PDF utility.
 *
 * Combines one or more image files (JPG, PNG, BMP, GIF, AVIF) into a single
 * PDF document using pdf-lib.  Each image becomes its own page, sized to
 * match the image dimensions so that nothing is cropped or stretched.
 *
 * OCR placeholder
 * ────────────────
 * The function accepts an optional `ocrEnabled` flag.  When set to `true` it
 * currently logs a warning that OCR is not yet implemented.  A future OCR
 * module (e.g. Tesseract.js / Google Cloud Vision) can be wired in here
 * without changing the public API.
 *
 * Supported input formats
 * ────────────────────────
 *  • JPEG / JPG  → embedded via embedJpg
 *  • PNG         → embedded via embedPng
 *  • BMP / GIF / AVIF – these must be converted to PNG first (via `sharp`
 *    which is an optional peer-dependency).  If `sharp` is not installed the
 *    function throws a clear error asking the caller to install it.
 */

import { PDFDocument } from "pdf-lib";

export interface ImageToPdfOptions {
  /**
   * Ordered list of image buffers with their MIME types.
   * Each entry becomes one page in the resulting PDF.
   */
  images: Array<{ buffer: Buffer; mimeType: string }>;

  /**
   * When `true`, a placeholder OCR step is invoked (not yet implemented).
   * Default: `false`.
   */
  ocrEnabled?: boolean;
}

/**
 * Converts an array of image buffers into a single PDF document.
 *
 * @returns A `Uint8Array` containing the PDF bytes ready to be saved or streamed.
 */
export async function imagesToPdf(options: ImageToPdfOptions): Promise<Uint8Array> {
  const { images, ocrEnabled = false } = options;

  if (!images.length) {
    throw new Error("imagesToPdf: at least one image is required.");
  }

  if (ocrEnabled) {
    // TODO: integrate an OCR module (e.g. Tesseract.js / Google Cloud Vision)
    console.warn(
      "[imagesToPdf] OCR is not yet implemented. " +
        "Set ocrEnabled=false until the OCR module is integrated."
    );
  }

  const pdfDoc = await PDFDocument.create();

  for (const { buffer, mimeType } of images) {
    const normalised = mimeType.toLowerCase();

    let pdfImage;

    if (normalised === "image/jpeg" || normalised === "image/jpg") {
      pdfImage = await pdfDoc.embedJpg(buffer);
    } else if (normalised === "image/png") {
      pdfImage = await pdfDoc.embedPng(buffer);
    } else {
      // BMP, GIF, AVIF – convert to PNG via sharp
      const pngBuffer = await convertToPngWithSharp(buffer, normalised);
      pdfImage = await pdfDoc.embedPng(pngBuffer);
    }

    const { width, height } = pdfImage;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(pdfImage, { x: 0, y: 0, width, height });
  }

  return pdfDoc.save();
}

// ─── Internal helper ─────────────────────────────────────────────────────────

async function convertToPngWithSharp(
  buffer: Buffer,
  mimeType: string
): Promise<Buffer> {
  let sharp: typeof import("sharp");
  try {
    sharp = (await import("sharp")).default as unknown as typeof import("sharp");
  } catch {
    throw new Error(
      `imagesToPdf: the image format "${mimeType}" requires the "sharp" package. ` +
        'Install it with: npm install sharp'
    );
  }

  return sharp(buffer).png().toBuffer();
}
