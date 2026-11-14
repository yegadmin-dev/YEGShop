import QRCode from 'qrcode';
import { formatDateShort, formatDateTimeId, formatRupiah } from '../shared/pricing.ts';
import type { OrderItemRecord } from '../shared/types.ts';
import { encodeOrderBarcodeValue } from './barcodeScanner.ts';

export interface ReceiptPayload {
  orderId: string;
  queueNumber: string;
  sourceLabel: string;
  timestamp: string;
  deadline: string;
  customerName: string;
  whatsapp?: string;
  institution?: string;
  items: OrderItemRecord[];
  subtotal: number;
  totalAddons: number;
  totalTransaction: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  cashReceived?: number;
  changeAmount?: number;
  cashierName?: string;
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function downloadReceiptJpg(payload: ReceiptPayload): Promise<boolean> {
  const width = 900;
  const padX = 56;
  const contentWidth = width - padX * 2;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return false;

  tempCtx.font = '500 18px "Neulis Sans", "Outfit", sans-serif';
  let estimatedItemsHeight = 0;
  for (const item of payload.items) {
    const specEntries = Object.entries(item.specifications || {})
      .filter(([, v]) => v && v.trim() !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
    const specLines = specEntries ? wrapTextLines(tempCtx, specEntries, contentWidth - 180) : [];
    const addonLines = item.addons.length;
    estimatedItemsHeight += 64 + specLines.length * 24 + addonLines * 26 + 24;
  }

  // Reserve extra space at bottom for the scannable QR Barcode card + footer
  const barcodeSectionHeight = 250;
  const height = Math.max(1220, 620 + estimatedItemsHeight + barcodeSectionHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Subtle outer frame
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Header band (#06150E Obsidian Pine + #065E46 accent)
  ctx.fillStyle = '#06150E';
  ctx.fillRect(20, 20, width - 40, 138);

  // Brand emblem square
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(padX, 46, 54, 54);
  ctx.fillStyle = '#065E46';
  ctx.font = '800 30px "Neulis Sans", "Outfit", sans-serif';
  ctx.fillText('Y', padX + 16, 84);

  // Brand text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 28px "Neulis Sans", "Outfit", sans-serif';
  ctx.fillText('YEGShop', padX + 72, 72);
  ctx.fillStyle = '#10B981';
  ctx.font = '600 16px "Neulis Sans", "Outfit", sans-serif';
  ctx.fillText('by YEG Production · order.yegproduction.web.id', padX + 72, 98);

  // Right header order code
  ctx.textAlign = 'right';
  ctx.fillStyle = '#10B981';
  ctx.font = '700 14px "Neulis Sans", "Outfit", monospace';
  ctx.fillText(payload.sourceLabel.toUpperCase(), width - padX, 58);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 26px "Neulis Sans", "Outfit", monospace';
  ctx.fillText(`#${payload.orderId}`, width - padX, 92);
  ctx.fillStyle = '#A7F3D0';
  ctx.font = '600 16px "Neulis Sans", "Outfit", monospace';
  ctx.fillText(`Antrean ${payload.queueNumber}`, width - padX, 118);
  ctx.textAlign = 'left';

  let y = 195;

  // Customer & Meta Grid Box
  ctx.fillStyle = '#F8FAF9';
  ctx.fillRect(padX, y, contentWidth, 146);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.strokeRect(padX, y, contentWidth, 146);

  ctx.fillStyle = '#64748B';
  ctx.font = '700 13px "Neulis Sans", "Outfit", sans-serif';
  ctx.fillText('IDENTITAS PEMESAN', padX + 20, y + 28);
  ctx.fillText('JADWAL & ANTREAN', padX + 430, y + 28);

  ctx.fillStyle = '#071A12';
  ctx.font = '700 20px "Neulis Sans", "Outfit", sans-serif';
  ctx.fillText(payload.customerName, padX + 20, y + 58);
  ctx.fillStyle = '#475569';
  ctx.font = '400 16px "Neulis Sans", "Outfit", sans-serif';
  ctx.fillText(
    `${payload.institution || 'Umum / Pribadi'}${payload.whatsapp ? ` · ${payload.whatsapp}` : ''}`,
    padX + 20,
    y + 84
  );
  if (payload.cashierName) {
    ctx.fillText(`Kasir: ${payload.cashierName}`, padX + 20, y + 112);
  } else {
    ctx.fillText(`Status: ${payload.paymentStatus}`, padX + 20, y + 112);
  }

  ctx.fillStyle = '#071A12';
  ctx.font = '600 16px "Neulis Sans", "Outfit", monospace';
  ctx.fillText(`Tgl Order : ${formatDateTimeId(payload.timestamp)}`, padX + 430, y + 58);
  ctx.fillStyle = '#065E46';
  ctx.font = '700 17px "Neulis Sans", "Outfit", monospace';
  ctx.fillText(`Deadline  : ${formatDateShort(payload.deadline)}`, padX + 430, y + 86);
  ctx.fillStyle = '#475569';
  ctx.font = '600 16px "Neulis Sans", "Outfit", monospace';
  ctx.fillText(`Metode    : ${payload.paymentMethod}`, padX + 430, y + 114);

  y += 180;

  // Section header: Rincian Produk
  ctx.fillStyle = '#065E46';
  ctx.font = '700 15px "Neulis Sans", "Outfit", sans-serif';
  ctx.fillText('RINCIAN PRODUK & ADD-ONS', padX, y);
  ctx.textAlign = 'right';
  ctx.fillText('SUBTOTAL', width - padX, y);
  ctx.textAlign = 'left';

  y += 14;
  ctx.strokeStyle = '#065E46';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(width - padX, y);
  ctx.stroke();

  y += 32;

  for (const item of payload.items) {
    ctx.fillStyle = '#071A12';
    ctx.font = '700 20px "Neulis Sans", "Outfit", sans-serif';
    ctx.fillText(item.productName, padX, y);

    ctx.textAlign = 'right';
    ctx.font = '700 20px "Neulis Sans", "Outfit", monospace';
    ctx.fillText(formatRupiah(item.lineTotal), width - padX, y);
    ctx.textAlign = 'left';

    y += 26;
    ctx.fillStyle = '#475569';
    ctx.font = '500 16px "Neulis Sans", "Outfit", monospace';
    ctx.fillText(
      `${item.qty} pcs × ${formatRupiah(item.unitBasePrice)} (Dasar: ${formatRupiah(item.lineSubtotal)})`,
      padX,
      y
    );

    const specText = Object.entries(item.specifications || {})
      .filter(([, v]) => v && v.trim() !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');

    if (specText) {
      y += 24;
      ctx.fillStyle = '#64748B';
      ctx.font = '400 15px "Neulis Sans", "Outfit", sans-serif';
      const lines = wrapTextLines(ctx, specText, contentWidth - 40);
      for (const line of lines) {
        ctx.fillText(line, padX, y);
        y += 22;
      }
    }

    for (const addon of item.addons) {
      y += 24;
      ctx.fillStyle = '#059669';
      ctx.font = '500 15px "Neulis Sans", "Outfit", sans-serif';
      const label = addon.selectedOption
        ? `+ ${addon.name} (${addon.selectedOption}) — ${item.qty} × ${formatRupiah(addon.pricePerPcs)}`
        : `+ ${addon.name} — ${item.qty} × ${formatRupiah(addon.pricePerPcs)}`;
      ctx.fillText(label, padX + 12, y);
      ctx.textAlign = 'right';
      ctx.font = '600 15px "Neulis Sans", "Outfit", monospace';
      ctx.fillText(formatRupiah(addon.subtotal), width - padX, y);
      ctx.textAlign = 'left';
    }

    y += 24;
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(width - padX, y);
    ctx.stroke();
    y += 30;
  }

  // Totals Summary Box
  const summaryBoxHeight = payload.cashReceived ? 225 : 175;
  ctx.fillStyle = '#F8FAF9';
  ctx.fillRect(padX, y, contentWidth, summaryBoxHeight);
  ctx.strokeStyle = '#CBD5E1';
  ctx.strokeRect(padX, y, contentWidth, summaryBoxHeight);

  let sy = y + 34;
  const drawSummaryRow = (label: string, val: string, bold = false, accentColor = '#071A12') => {
    ctx.fillStyle = bold ? '#071A12' : '#475569';
    ctx.font = `${bold ? '700' : '500'} ${bold ? '21px' : '17px'} "Neulis Sans", "Outfit", sans-serif`;
    ctx.fillText(label, padX + 22, sy);
    ctx.textAlign = 'right';
    ctx.fillStyle = accentColor;
    ctx.font = `700 ${bold ? '22px' : '17px'} "Neulis Sans", "Outfit", monospace`;
    ctx.fillText(val, width - padX - 22, sy);
    ctx.textAlign = 'left';
    sy += bold ? 36 : 28;
  };

  drawSummaryRow('Subtotal Produk', formatRupiah(payload.subtotal));
  drawSummaryRow('Total Add-ons Custom', formatRupiah(payload.totalAddons));
  drawSummaryRow('TOTAL ESTIMASI', formatRupiah(payload.totalTransaction), true, '#065E46');
  drawSummaryRow(`Dibayar (${payload.paymentMethod})`, formatRupiah(payload.paidAmount), false, '#15803D');
  drawSummaryRow(
    'Sisa Pelunasan',
    formatRupiah(payload.remainingAmount),
    false,
    payload.remainingAmount > 0 ? '#B45309' : '#059669'
  );
  if (payload.cashReceived && payload.cashReceived > 0) {
    drawSummaryRow(
      'Tunai Diterima / Kembalian',
      `${formatRupiah(payload.cashReceived)} / ${formatRupiah(payload.changeAmount || 0)}`
    );
  }

  // Scannable Barcode Verification Card inside Footer Area
  const barcodeValue = encodeOrderBarcodeValue(payload.orderId);
  const barcodeBoxY = height - 292;
  const barcodeBoxH = 190;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(padX, barcodeBoxY, contentWidth, barcodeBoxH);
  ctx.strokeStyle = '#065E46';
  ctx.lineWidth = 2;
  ctx.strokeRect(padX, barcodeBoxY, contentWidth, barcodeBoxH);

  // Generate crisp QR Barcode canvas with wide quiet zone for reliable camera & photo scan
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, barcodeValue, {
    width: 164,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
  ctx.drawImage(qrCanvas, padX + 18, barcodeBoxY + 13, 164, 164);

  const infoX = padX + 206;
  ctx.fillStyle = '#065E46';
  ctx.font = '700 14px "Neulis Sans", "Outfit", sans-serif';
  ctx.fillText('BARCODE SCAN KASIR YEGSHOP', infoX, barcodeBoxY + 42);

  ctx.fillStyle = '#071A12';
  ctx.font = '800 26px "Neulis Sans", "Outfit", monospace';
  ctx.fillText(barcodeValue, infoX, barcodeBoxY + 78);

  ctx.fillStyle = '#475569';
  ctx.font = '500 15px "Neulis Sans", "Outfit", sans-serif';
  ctx.fillText(
    'Kirim gambar struk JPG ini ke WhatsApp Admin YEG Production.',
    infoX,
    barcodeBoxY + 112
  );
  ctx.fillText(
    'Kasir cukup scan/upload foto barcode ini untuk memuat pesanan & edit detail otomatis.',
    infoX,
    barcodeBoxY + 136
  );

  // Bottom bar strip mimicking linear barcode label
  ctx.fillStyle = '#06150E';
  ctx.font = '700 14px "Neulis Sans", "Outfit", monospace';
  ctx.fillText(`ORDER #${payload.orderId} · ANTREAN ${payload.queueNumber}`, infoX, barcodeBoxY + 168);

  // Footer note
  const footerY = height - 68;
  ctx.fillStyle = '#64748B';
  ctx.font = '500 14px "Neulis Sans", "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Terima kasih telah memesan di YEGShop by YEG Production · WA Admin: 0896-7484-9505',
    width / 2,
    footerY
  );
  ctx.fillText(
    'Simpan struk barcode ini sebagai bukti antrean resmi. Lampirkan JPG ini saat konfirmasi WhatsApp.',
    width / 2,
    footerY + 22
  );

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `Struk-YEGShop-${payload.orderId}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
