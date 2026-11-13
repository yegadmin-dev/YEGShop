const APP = {
  PROVIDER: 'YEG Production',
  TIMEZONE: 'Asia/Jakarta',
  UPLOAD_LIMIT_BYTES: 10 * 1024 * 1024,
  COLORS: ['Hijau tua','Maroon','Biru benhur','Biru tua','Hitam','Abu-abu','Merah','Oranye','Ungu','Putih','Fur','Biru dongker','Tosca'],
  PLASTICS: ['Buram','Bening'],
  BOX_TYPES: ['Kotak nama saja','Kotak nama + foto'],
  TIERS: [
    { min: 101, max: Infinity, key: 'price_101_plus' },
    { min: 50, max: 100, key: 'price_50_100' },
    { min: 1, max: 49, key: 'price_1_49' }
  ]
};

function doGet(e) {
  const page = e && e.parameter && e.parameter.page === 'admin' ? 'Admin' : 'Index';
  return HtmlService.createHtmlOutputFromFile(page)
    .setTitle(page === 'Admin' ? 'Portal Admin | YEG Production' : 'Pemesanan Map | YEG Production')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Buka Apps Script dari Google Sheets tujuan terlebih dahulu.');
  const specs = {
    'Orders': ['Order ID','Timestamp','Nama Pemesan','WhatsApp','Jenis Map','Warna','Jenis Plastik','Isi Map','Jumlah (pcs)','Harga Satuan','Total Harga','DP (%)','Nominal DP','Sisa Pembayaran','Nama Institusi','Alamat Institusi','Jenis Kotak Nama','URL Logo','URL Foto Kotak Nama','URL Bukti Transfer','Status Pembayaran','Status Produksi','Catatan Admin'],
    'Payments': ['Order ID','Timestamp','Total Harga','DP (%)','Nominal DP','Sisa Pembayaran','URL Bukti Transfer','Status Verifikasi','Diverifikasi Oleh','Tanggal Verifikasi'],
    'Production': ['Order ID','Timestamp','Nama Institusi','Jenis Map','Spesifikasi','Jumlah (pcs)','Status Produksi','Catatan Produksi','Target Selesai'],
    'Price_Reference': ['Jenis Map','Isi Map','Harga 101+ pcs','Harga 50-100 pcs','Harga 1-49 pcs'],
    'Settings': ['Key','Value','Keterangan']
  };
  Object.keys(specs).forEach(name => {
    let sh = ss.getSheetByName(name) || ss.insertSheet(name);
    // Do not clear existing data: setupDatabase may be run again safely.
    if (sh.getLastRow() === 0) {
      sh.getRange(1,1,1,specs[name].length).setValues([specs[name]]);
    }
    sh.getRange(1,1,1,specs[name].length).setBackground('#174D36').setFontColor('#FFFFFF').setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, specs[name].length);
  });

  const priceRows = [
    ['K-13','Only Cover',17000,19500,21500],['K-13','2 lembar',19000,21500,23500],
    ['K-13','4 lembar',21000,23500,25500],['K-13','6 lembar',23000,25500,27500],
    ['K-13','8 lembar',25000,27500,29500],['K-13','10 lembar',27000,29500,31500],
    ['K-13','12 lembar',29000,31500,33500],['K-13','14 lembar',31000,33500,35500],
    ['K-13','16 lembar',33000,35500,37500],['K-13','18 lembar',35000,37500,39500],
    ['K-13','20 lembar',37000,39500,41500],['K-13','22 lembar',39000,41500,43500],
    ['K-13','24 lembar',41000,43500,45500],
    ['Full-Colour','Only Cover',20000,22500,25000],['Full-Colour','2 lembar',22000,24500,27000],
    ['Full-Colour','4 lembar',24000,26500,29000],['Full-Colour','6 lembar',26000,28500,31000],
    ['Full-Colour','8 lembar',28000,30500,33000],['Full-Colour','10 lembar',30000,32500,35000],
    ['Full-Colour','12 lembar',32000,34500,37000],['Full-Colour','14 lembar',34000,36500,39000],
    ['Full-Colour','16 lembar',36000,38500,41000],['Full-Colour','18 lembar',38000,40500,43000],
    ['Full-Colour','20 lembar',40000,42500,45000],['Full-Colour','22 lembar',42000,44500,47000],
    ['Full-Colour','24 lembar',44000,46500,49000]
  ];
  const priceSh = ss.getSheetByName('Price_Reference');
  if (priceSh.getLastRow() <= 1) {
    priceSh.getRange(2,1,priceRows.length,5).setValues(priceRows);
  }
  if (priceSh.getLastRow() > 1) priceSh.getRange(2,3,priceSh.getLastRow()-1,3).setNumberFormat('"Rp" #,##0');
  const settings = [
    ['provider','YEG Production','Nama penyedia'],
    ['bank','SeaBank','Bank tujuan'],
    ['account_number','901705659816','Nomor rekening tujuan'],
    ['account_holder','Mochamad Ridhwan Mubarok','Nama pemilik rekening'],
    ['admin_portal_access','PIN di Script Properties','Jangan menyimpan PIN admin di spreadsheet'],
    ['drive_folder_id','','Diisi otomatis saat folder upload dibuat'],
    ['upload_limit_mb','10','Batas ukuran setiap file'],
    ['whatsapp_mode','manual_admin_cta','Admin mengirim manual melalui CTA Portal Admin']
  ];
  const settingsSh = ss.getSheetByName('Settings');
  if (settingsSh.getLastRow() <= 1) {
    settingsSh.getRange(2,1,settings.length,3).setValues(settings);
  }
  ['Orders','Payments','Production'].forEach(n => {
    const sh=ss.getSheetByName(n);
    sh.getRange(2,1,Math.max(sh.getMaxRows()-1,1),sh.getLastColumn()).setVerticalAlignment('middle');
  });
  let folderId = getOrCreateUploadFolder_();
  const setSh=ss.getSheetByName('Settings');
  const values=setSh.getDataRange().getValues();
  for(let i=1;i<values.length;i++) if(values[i][0]==='drive_folder_id') setSh.getRange(i+1,2).setValue(folderId);
  return 'Setup selesai. Lima sheet database dan folder upload sudah disiapkan.';
}

function getCatalog() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const rows=ss.getSheetByName('Price_Reference').getDataRange().getValues().slice(1);
  const prices={};
  rows.forEach(r => { if(r[0] && r[1]) prices[r[0]+'|'+r[1]]={p101:Number(r[2]),p50:Number(r[3]),p1:Number(r[4])}; });
  const cfg=getSettings_();
  return {prices, colors:APP.COLORS, plastics:APP.PLASTICS, boxTypes:APP.BOX_TYPES,
    bank:cfg.bank, accountNumber:cfg.account_number, accountHolder:cfg.account_holder, provider:cfg.provider};
}

function quoteOrder(data) {
  validateOrder_(data, false);
  const tier = Number(data.quantity) > 100 ? 'p101' : (Number(data.quantity) >= 50 ? 'p50' : 'p1');
  const key=data.mapType+'|'+data.content;
  const catalog=getCatalog();
  const price=catalog.prices[key];
  if(!price) throw new Error('Kombinasi jenis map dan isi tidak ditemukan di daftar harga.');
  const unit=price[tier];
  const total=unit*Number(data.quantity);
  const dp=Math.round(total*Number(data.dpPercent)/100);
  return {unitPrice:unit,total:total,dpAmount:dp,balance:total-dp,tier:tier};
}

function submitOrder(data) {
  validateOrder_(data, true);
  const quote=quoteOrder(data);
  if(Number(data.clientTotal)!==quote.total || Number(data.clientDp)!==quote.dpAmount) {
    throw new Error('Perhitungan berubah. Muat ulang simulasi harga sebelum mengirim pesanan.');
  }
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const now=new Date();
  const id='YEG-'+Utilities.formatDate(now,APP.TIMEZONE,'yyyyMMdd')+'-'+Utilities.getUuid().slice(0,6).toUpperCase();
  const uploads={};
  ['logo','photo','proof'].forEach(k=>{
    if(data.files && data.files[k]) uploads[k]=saveUpload_(data.files[k],id,k);
  });
  const sh=ss.getSheetByName('Orders');
  sh.appendRow([id,now,data.name,data.whatsapp,data.mapType,data.mapType==='K-13'?data.color:'',data.plastic,data.content,Number(data.quantity),quote.unitPrice,quote.total,Number(data.dpPercent),quote.dpAmount,quote.balance,data.mapType==='K-13'?data.institution:'',data.mapType==='K-13'?data.address:'',data.mapType==='K-13'?data.boxType:'',uploads.logo||'',uploads.photo||'',uploads.proof||'','Menunggu verifikasi DP','Menunggu pembayaran','']);
  ss.getSheetByName('Payments').appendRow([id,now,quote.total,Number(data.dpPercent),quote.dpAmount,quote.balance,uploads.proof||'','Menunggu verifikasi','','']);
  ss.getSheetByName('Production').appendRow([id,now,data.mapType==='K-13'?data.institution:'',data.mapType,[data.content,data.plastic,data.mapType==='K-13'?data.color:''].filter(Boolean).join(' / '),Number(data.quantity),'Menunggu pembayaran','','']);
  const result={orderId:id,quote:quote,bank:getCatalog().bank,accountNumber:getCatalog().accountNumber,accountHolder:getCatalog().accountHolder};
  // Tidak ada pesan WhatsApp otomatis. Admin mengirim secara manual melalui Portal Admin.
  return result;
}

function validateOrder_(d, requireFiles) {
  if(!d || !d.name || !d.whatsapp || !d.mapType || !d.plastic || !d.content) throw new Error('Lengkapi identitas dan spesifikasi pesanan.');
  if(!/^628[0-9]{7,13}$/.test(String(d.whatsapp).replace(/\D/g,''))) throw new Error('Nomor WhatsApp harus memakai format 628xxxxxxxxxx.');
  if(!['K-13','Full-Colour'].includes(d.mapType)) throw new Error('Jenis map tidak valid.');
  if(!APP.PLASTICS.includes(d.plastic)) throw new Error('Jenis plastik tidak valid.');
  if(!Number.isInteger(Number(d.quantity)) || Number(d.quantity)<1) throw new Error('Jumlah pesanan minimal 1 pcs.');
  if(!Number.isFinite(Number(d.dpPercent)) || Number(d.dpPercent)<1 || Number(d.dpPercent)>100) throw new Error('DP harus antara 1 sampai 100 persen.');
  if(d.mapType==='K-13') {
    if(!APP.COLORS.includes(d.color) || !d.institution || !d.address || !APP.BOX_TYPES.includes(d.boxType)) throw new Error('Lengkapi warna dan identitas institusi untuk map K-13.');
    if(d.boxType==='Kotak nama + foto' && requireFiles && !(d.files && d.files.photo)) throw new Error('Upload foto untuk pilihan kotak nama + foto.');
    if(requireFiles && !(d.files && d.files.logo)) throw new Error('Upload logo institusi.');
  }
  if(requireFiles && !(d.files && d.files.proof)) throw new Error('Upload bukti transfer DP.');
  if(requireFiles) {
    Object.keys(d.files||{}).forEach(k=>{
      const f=d.files[k]; if(!f || !f.data || !f.name || !f.mimeType) throw new Error('File upload tidak valid.');
      const bytes=Utilities.base64Decode(f.data);
      if(bytes.length>APP.UPLOAD_LIMIT_BYTES) throw new Error('Ukuran setiap file maksimal 10 MB.');
      const allowed=['image/jpeg','image/png'];
      if(!allowed.includes(f.mimeType)) throw new Error('File harus JPG atau PNG.');
    });
  }
}

function saveUpload_(file, orderId, kind) {
  const folder=getOrCreateUploadFolder_();
  const bytes=Utilities.base64Decode(file.data);
  const safeName=String(file.name).replace(/[^a-zA-Z0-9._-]/g,'_');
  const blob=Utilities.newBlob(bytes,file.mimeType,orderId+'_'+kind+'_'+safeName);
  const created=folder.createFile(blob);
  created.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
  return created.getUrl();
}

function getOrCreateUploadFolder_() {
  const props=PropertiesService.getScriptProperties();
  let id=props.getProperty('YEG_UPLOAD_FOLDER_ID');
  if(id) { try { return DriveApp.getFolderById(id); } catch(e) {} }
  const folder=DriveApp.createFolder('YEG Production - File Pesanan');
  props.setProperty('YEG_UPLOAD_FOLDER_ID',folder.getId());
  return folder;
}

function getSettings_() {
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
  const vals=sh.getDataRange().getValues(), out={};
  vals.slice(1).forEach(r=>{if(r[0]) out[r[0]]=r[1];});
  return out;
}



// ========================= PORTAL ADMIN =========================
// Set Script Property ADMIN_PIN (minimal 16 karakter) sebelum membuka Portal Admin.
function loginAdmin(pin) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');
  if (!expected || String(expected).length < 16) {
    throw new Error('Portal admin belum dikonfigurasi. Pemilik skrip harus mengisi Script Property ADMIN_PIN minimal 16 karakter.');
  }
  if (String(pin || '') !== expected) throw new Error('PIN admin salah.');
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('YEG_ADMIN_SESSION_' + token, 'ok', 21600);
  return { token: token, expiresIn: 21600 };
}

function requireAdmin_(token) {
  if (!token || CacheService.getScriptCache().get('YEG_ADMIN_SESSION_' + token) !== 'ok') {
    throw new Error('Sesi admin berakhir. Silakan login kembali.');
  }
}

function getAdminOrders(token) {
  requireAdmin_(token);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 23).getValues();
  return rows.map((r, i) => ({
    row: i + 2,
    orderId: String(r[0] || ''),
    timestamp: r[1] instanceof Date ? Utilities.formatDate(r[1], APP.TIMEZONE, 'dd/MM/yyyy HH:mm') : String(r[1] || ''),
    name: String(r[2] || ''), whatsapp: String(r[3] || ''), mapType: String(r[4] || ''),
    color: String(r[5] || ''), plastic: String(r[6] || ''), content: String(r[7] || ''),
    quantity: Number(r[8] || 0), unitPrice: Number(r[9] || 0), total: Number(r[10] || 0),
    dpPercent: Number(r[11] || 0), dp: Number(r[12] || 0), balance: Number(r[13] || 0),
    institution: String(r[14] || ''), address: String(r[15] || ''), boxType: String(r[16] || ''),
    logoUrl: String(r[17] || ''), photoUrl: String(r[18] || ''), proofUrl: String(r[19] || ''),
    paymentStatus: String(r[20] || ''), productionStatus: String(r[21] || ''), notes: String(r[22] || '')
  })).reverse();
}

function adminUpdateOrder(token, orderId, paymentStatus, productionStatus, notes) {
  requireAdmin_(token);
  const allowedPayment = ['Menunggu verifikasi DP','DP terverifikasi','Ditolak','Lunas'];
  const allowedProduction = ['Menunggu pembayaran','Belum diproses','Antrean produksi','Sedang diproduksi','Selesai diproduksi','Siap dikirim / diambil','Selesai'];
  if (!allowedPayment.includes(paymentStatus) || !allowedProduction.includes(productionStatus)) throw new Error('Status tidak valid.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const orders = ss.getSheetByName('Orders');
  const data = orders.getDataRange().getValues();
  let row = -1;
  for (let i = 1; i < data.length; i++) if (String(data[i][0]) === String(orderId)) { row = i + 1; break; }
  if (row < 2) throw new Error('Pesanan tidak ditemukan.');
  orders.getRange(row, 21).setValue(paymentStatus);
  orders.getRange(row, 22).setValue(productionStatus);
  orders.getRange(row, 23).setValue(String(notes || '').slice(0, 1000));
  const pay = ss.getSheetByName('Payments');
  const payData = pay.getDataRange().getValues();
  for (let i = 1; i < payData.length; i++) {
    if (String(payData[i][0]) === String(orderId)) {
      pay.getRange(i + 1, 8).setValue(paymentStatus);
      if (paymentStatus === 'DP terverifikasi' || paymentStatus === 'Lunas' || paymentStatus === 'Ditolak') {
        pay.getRange(i + 1, 9).setValue(Session.getActiveUser().getEmail() || 'Admin YEG Production');
        pay.getRange(i + 1, 10).setValue(new Date());
      }
      break;
    }
  }
  const production = ss.getSheetByName('Production');
  const productionData = production.getDataRange().getValues();
  for (let i = 1; i < productionData.length; i++) {
    if (String(productionData[i][0]) === String(orderId)) {
      production.getRange(i + 1, 7).setValue(productionStatus);
      production.getRange(i + 1, 8).setValue(String(notes || '').slice(0, 1000));
      break;
    }
  }
  return { success: true };
}

function getAdminPortalConfig(token) {
  requireAdmin_(token);
  const c = getCatalog();
  return { provider: c.provider, bank: c.bank, accountNumber: c.accountNumber, accountHolder: c.accountHolder };
}

