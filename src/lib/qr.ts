import QRCode from "qrcode";

export function tagUrl(shortCode: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/t/${shortCode}`;
}

export async function generateTagQrPngBuffer(shortCode: string): Promise<Buffer> {
  return QRCode.toBuffer(tagUrl(shortCode), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
  });
}

export async function generateTagQrDataUrl(shortCode: string): Promise<string> {
  return QRCode.toDataURL(tagUrl(shortCode), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
  });
}
