import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  Addon,
  AiProductionAnalysis,
  AiSpecSuggestion,
  OrderAdminCashierRecord,
  OrderWaitingRecord,
  Product,
  ProductionRecord,
} from '../shared/types.ts';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi pada environment server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function consultCustomSpecWithAi(params: {
  question: string;
  qtyEstimate: number;
  budgetPerPcs?: number;
  product?: Product | null;
  addons: Addon[];
}): Promise<AiSpecSuggestion> {
  const ai = getGeminiClient();

  const prompt = `
Anda adalah Konsultan Spesifikasi Produksi Percetakan & Map Ijazah senior di YEG Production (YEGShop).
Berikan rekomendasi teknis & efisiensi anggaran dalam Bahasa Indonesia yang akurat, jujur, dan ringkas.

Aturan Produk & Harga Resmi YEGShop:
- Map Rapor K-13 (Semi Kulit): 13 pilihan warna, isi Only Cover s/d 24 lembar (+Rp2.000 per kenaikan 2 lembar). Tier harga: 1-49 pcs (mulai Rp21.500), 50-100 pcs (mulai Rp19.500), 101+ pcs (mulai Rp17.000). Add-ons berlaku: Sudut Siku (Rp2.500/set 4 sudut), Logo Berwarna (Rp2.500, KHUSUS K-13), List Frame (Rp2.500, KHUSUS K-13), Lapisan Busa Dua Muka (Rp3.000), Isi Plastik Lampiran (Rp2.000).
- Map Full-Colour: isi Only Cover s/d 24 lembar. Tier harga: 1-49 pcs (mulai Rp25.000), 50-100 pcs (mulai Rp22.500), 101+ pcs (mulai Rp20.000). Add-ons berlaku: Sudut Siku (Rp2.500), Lapisan Busa Dua Muka (Rp3.000), Isi Plastik Lampiran (Rp2.000). Logo Berwarna & List Frame TIDAK tersedia di Full-Colour.
- Plastik Buram/Bening adalah spesifikasi dasar gratis, bukan add-on berbayar.

Permintaan Pelanggan:
- Produk yang sedang dilihat: ${params.product ? params.product.name : 'Belum memilih produk spesifik'}
- Estimasi jumlah: ${params.qtyEstimate} pcs
- Anggaran target per pcs: ${params.budgetPerPcs ? `Rp${params.budgetPerPcs.toLocaleString('id-ID')}` : 'Fleksibel'}
- Catatan / pertanyaan pelanggan: "${params.question}"
`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'Berikan analisis terstruktur yang langsung membantu panitia sekolah atau instansi memilih spesifikasi optimal dan memanfaatkan diskon kuantitas (50+ atau 101+ pcs).',
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: 'Ringkasan saran utama dalam 2 kalimat.' },
          recommendedProduct: { type: Type.STRING, description: 'Nama produk yang paling tepat.' },
          recommendedSheetCount: { type: Type.STRING, description: 'Rekomendasi isi lembar plastik.' },
          recommendedAddons: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Daftar nama add-ons yang disarankan.',
          },
          volumeOptimizationTip: {
            type: Type.STRING,
            description: 'Tips penghematan tier kuantitas (misalnya selisih jika pesan 50 atau 101 pcs).',
          },
          estimatedUnitRange: { type: Type.STRING, description: 'Estimasi rentang harga per pcs dalam IDR.' },
          estimatedProductionDays: { type: Type.STRING, description: 'Estimasi hari kerja pengerjaan.' },
          considerations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2-3 poin teknis penting yang perlu disiapkan pemesan.',
          },
        },
        required: [
          'summary',
          'recommendedProduct',
          'recommendedSheetCount',
          'recommendedAddons',
          'volumeOptimizationTip',
          'estimatedUnitRange',
          'estimatedProductionDays',
          'considerations',
        ],
      },
    },
  });

  const text = (response.text || '{}').trim();
  return JSON.parse(text) as AiSpecSuggestion;
}

export async function analyzeProductionWithAi(params: {
  question?: string;
  ordersWaiting: OrderWaitingRecord[];
  ordersCashier: OrderAdminCashierRecord[];
  production: ProductionRecord[];
}): Promise<AiProductionAnalysis> {
  const ai = getGeminiClient();

  const condensedWaiting = params.ordersWaiting.slice(0, 20).map((o) => ({
    orderId: o.orderId,
    queueNumber: o.queueNumber,
    customer: o.customerName,
    total: o.totalTransaction,
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
    deadline: o.deadline,
  }));

  const condensedCashier = params.ordersCashier.slice(0, 20).map((c) => ({
    orderId: c.orderId,
    queueNumber: c.queueNumber,
    customer: c.customerName,
    total: c.totalTransaction,
    paymentStatus: c.paymentStatus,
    deadline: c.deadline,
  }));

  const condensedProd = params.production.slice(0, 25).map((p) => ({
    orderId: p.orderId,
    queueNumber: p.queueNumber,
    qty: p.totalQty,
    deadline: p.deadline,
    stage: p.stage,
    summary: p.productSummary,
  }));

  const prompt = `
Analisis kondisi antrean produksi & rekap pesanan YEGShop saat ini (Bahasa Indonesia, singkat, taktis, profesional).

Data Orders_Waiting (Publik):
${JSON.stringify(condensedWaiting)}

Data Order_Catatan_Admin (Kasir POS):
${JSON.stringify(condensedCashier)}

Data Production (Kanban Workshop):
${JSON.stringify(condensedProd)}

Pertanyaan spesifik supervisor: "${params.question || 'Berikan evaluasi prioritas antrean deadline terdekat, potensi bottleneck workshop, dan perbandingan kanal publik vs kasir.'}"
`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'Bertindak sebagai Manajer Operasional Percetakan YEG Production. Analisis data apa adanya tanpa mengarang angka baru.',
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executiveSummary: { type: Type.STRING, description: 'Ringkasan situasi produksi & order saat ini.' },
          bottleneckAlerts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Peringatan potensi kemacetan atau pembayaran tertunda.',
          },
          priorityQueueRecommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                orderId: { type: Type.STRING },
                queueNumber: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['orderId', 'queueNumber', 'reason'],
            },
          },
          channelInsights: { type: Type.STRING, description: 'Perbandingan ringkas kanal Publik vs Kasir POS.' },
          actionChecklist: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3-4 langkah operasional segera untuk tim admin & workshop.',
          },
        },
        required: [
          'executiveSummary',
          'bottleneckAlerts',
          'priorityQueueRecommendations',
          'channelInsights',
          'actionChecklist',
        ],
      },
    },
  });

  const text = (response.text || '{}').trim();
  return JSON.parse(text) as AiProductionAnalysis;
}
