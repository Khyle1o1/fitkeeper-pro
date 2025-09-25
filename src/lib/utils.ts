import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a QR code as a data URL for a given text
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  const QRCode = (await import('qrcode')).default;
  return await QRCode.toDataURL(text, { margin: 1, scale: 4 });
}

// Generate a barcode (Code128) as a data URL for a given text
export async function generateBarcodeDataUrl(text: string): Promise<string> {
  // Create an offscreen canvas to draw the barcode
  const canvas = document.createElement('canvas');
  const JsBarcode = (await import('jsbarcode')).default as any;
  JsBarcode(canvas, text, { format: 'CODE128', displayValue: false, margin: 0 });
  return canvas.toDataURL('image/png');
}