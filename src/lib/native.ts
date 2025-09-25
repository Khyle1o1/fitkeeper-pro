import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function dataUrlToBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.substring(commaIndex + 1) : dataUrl;
}

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function saveDataUrlNative(filename: string, dataUrl: string): Promise<void> {
  const base64 = dataUrlToBase64(dataUrl);
  await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  });
  const uri = await Filesystem.getUri({ directory: Directory.Documents, path: filename });
  try {
    await Share.share({ title: filename, url: uri.uri });
  } catch {
    /* no-op if user cancels */
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof window === 'undefined') {
    return Buffer.from(binary, 'binary').toString('base64');
  }
  return btoa(binary);
}


