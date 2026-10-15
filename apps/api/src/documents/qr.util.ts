// Utilitas generasi QR code server-side (tanpa ketergantungan ke provider eksternal).
// Menggunakan library `qrcode` yang diinstall di workspace root.
// QR dihasilkan sebagai data URL (PNG base64) dan dapat disimpan/disuntikkan ke
// dokumen/berkas atau dilekatkan pada versi publik anonim.

let qrcodeModule: any = null;

async function loadQrCode(): Promise<any> {
  if (qrcodeModule) return qrcodeModule;
  try {
    // qrcode di-hoist ke node_modules root workspace
    qrcodeModule = await import('qrcode');
  } catch {
    try {
      // fallback: require sync
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      qrcodeModule = require('qrcode');
    } catch {
      qrcodeModule = null;
    }
  }
  return qrcodeModule;
}

export async function generateQrDataUrl(payload: string): Promise<string> {
  const qrcode = await loadQrCode();
  if (!qrcode) {
    throw new Error('Library qrcode tidak tersedia');
  }
  const fn = qrcode.toDataURL ?? qrcode.default?.toDataURL;
  if (typeof fn !== 'function') {
    throw new Error('QRCode.toDataURL tidak tersedia');
  }
  return fn(payload, { errorCorrectionLevel: 'M', margin: 1, width: 256 });
}