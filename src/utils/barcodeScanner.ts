import jsQR from 'jsqr';

export function encodeOrderBarcodeValue(orderId: string): string {
  return `YEGSHOP:${orderId.trim().toUpperCase()}`;
}

export function extractOrderIdFromBarcode(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  const yegPrefixMatch = trimmed.match(/YEGSHOP:([A-Z0-9-]+)/i);
  if (yegPrefixMatch?.[1]) {
    return yegPrefixMatch[1].toUpperCase();
  }

  const orderIdMatch = trimmed.match(/\b((?:YEG|POS)-\d+)\b/i);
  if (orderIdMatch?.[1]) {
    return orderIdMatch[1].toUpperCase();
  }

  return trimmed.replace(/^#/, '');
}

interface NativeBarcodeDetector {
  detect(
    source: HTMLCanvasElement | HTMLVideoElement | ImageBitmap
  ): Promise<Array<{ rawValue?: string }>>;
}

function getNativeBarcodeDetector(): NativeBarcodeDetector | null {
  if (typeof window === 'undefined') return null;
  const Ctor = (
    window as unknown as {
      BarcodeDetector?: new (opts?: { formats?: string[] }) => NativeBarcodeDetector;
    }
  ).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({
      formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a'],
    });
  } catch {
    return null;
  }
}

function tryJsQrOnRegion(
  sourceCanvas: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  targetWidth?: number
): string | null {
  if (sw < 16 || sh < 16) return null;
  const outW = targetWidth ? Math.min(targetWidth, Math.max(sw, 420)) : sw;
  const outH = Math.max(1, Math.round((sh * outW) / sw));

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = outW;
  cropCanvas.height = outH;
  const ctx = cropCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, outW, outH);
  const imageData = ctx.getImageData(0, 0, outW, outH);
  const decoded = jsQR(imageData.data, outW, outH, {
    inversionAttempts: 'attemptBoth',
  });
  return decoded?.data || null;
}

export async function decodeBarcodeFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || canvas.width === 0 || canvas.height === 0) return null;

  // Pass 1: Fast jsQR full canvas check
  const fullData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const direct = jsQR(fullData.data, canvas.width, canvas.height, {
    inversionAttempts: 'attemptBoth',
  });
  if (direct?.data) return direct.data;

  // Pass 2: Native BarcodeDetector (supports QR & Code-128 in Chromium/Edge)
  const nativeDetector = getNativeBarcodeDetector();
  if (nativeDetector) {
    try {
      const detected = await nativeDetector.detect(canvas);
      const firstVal = detected.find((d) => d.rawValue)?.rawValue;
      if (firstVal) return firstVal;
    } catch {
      // Fall through to multi-pass jsQR
    }
  }

  // Pass 3: Focused regions (receipt footer band & bottom-right / bottom-center crops)
  const w = canvas.width;
  const h = canvas.height;
  const regions: Array<[number, number, number, number, number?]> = [
    [0, Math.floor(h * 0.55), w, Math.ceil(h * 0.45), 900],
    [0, Math.floor(h * 0.45), Math.ceil(w * 0.55), Math.ceil(h * 0.55), 720],
    [Math.floor(w * 0.45), Math.floor(h * 0.45), Math.ceil(w * 0.55), Math.ceil(h * 0.55), 720],
    [Math.floor(w * 0.15), Math.floor(h * 0.15), Math.ceil(w * 0.7), Math.ceil(h * 0.7), 800],
  ];

  for (const [sx, sy, sw, sh, targetW] of regions) {
    const hit = tryJsQrOnRegion(canvas, sx, sy, sw, sh, targetW);
    if (hit) return hit;
  }

  return null;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal membaca gambar barcode.'));
    img.src = src;
  });
}

export async function decodeBarcodeFromImageFile(file: File): Promise<{
  rawValue: string | null;
  orderId: string;
  previewUrl: string;
}> {
  const previewUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('File gambar tidak valid.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

  const img = await loadImageElement(previewUrl);
  const maxDim = 1800;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const width = Math.max(1, Math.round((img.naturalWidth || 800) * scale));
  const height = Math.max(1, Math.round((img.naturalHeight || 800) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { rawValue: null, orderId: '', previewUrl };
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let rawValue = await decodeBarcodeFromCanvas(canvas);

  // Fallback downscaled pass for very noisy screenshots
  if (!rawValue && Math.max(width, height) > 760) {
    const smallScale = 760 / Math.max(width, height);
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = Math.max(1, Math.round(width * smallScale));
    smallCanvas.height = Math.max(1, Math.round(height * smallScale));
    const sCtx = smallCanvas.getContext('2d', { willReadFrequently: true });
    if (sCtx) {
      sCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
      rawValue = await decodeBarcodeFromCanvas(smallCanvas);
    }
  }

  return {
    rawValue,
    orderId: rawValue ? extractOrderIdFromBarcode(rawValue) : '',
    previewUrl,
  };
}
