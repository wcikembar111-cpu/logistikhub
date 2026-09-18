import ExcelJS from 'exceljs';

const KINO_LOGO_DEFAULT = 'https://res.cloudinary.com/dedtb3vnj/image/upload/v1782568576/kino_yrhkmc.png';

// Cache in-memory buffer logo agar tidak fetch berulang kali
let cachedLogoBuffer: ArrayBuffer | null = null;

export async function getLogoImageBuffer(url: string = KINO_LOGO_DEFAULT): Promise<ArrayBuffer | null> {
  if (cachedLogoBuffer) return cachedLogoBuffer;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const buffer = await response.arrayBuffer();
    cachedLogoBuffer = buffer;
    return buffer;
  } catch (err) {
    console.warn('Gagal memuat logo Kino untuk Excel, export dilanjutkan tanpa gambar:', err);
    return null;
  }
}

function fmtTglID(iso: string) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const bln = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${String(d.getDate()).padStart(2, '0')} ${bln[d.getMonth()]} ${d.getFullYear()}`;
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

const MEDIUM_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FF000000' } },
  bottom: { style: 'medium', color: { argb: 'FF000000' } },
  left: { style: 'medium', color: { argb: 'FF000000' } },
  right: { style: 'medium', color: { argb: 'FF000000' } },
};

function applyBorderToRange(worksheet: ExcelJS.Worksheet, startRow: number, startCol: number, endRow: number, endCol: number, border = THIN_BORDER) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = worksheet.getCell(r, c);
      cell.border = border;
    }
  }
}

/**
 * EXPORT 1: FORMULIR STOCK OPNAME INTERNAL (.XLSX)
 * Dilengkapi Logo Resmi KINO di Header, Nomor Dokumen PPIC.025.00,
 * Data Pelaksana SO, Lokasi, dan Tabel Fisik vs Sistem
 */
export async function exportFormStockOpnameExcel(params: {
  selectedSlocs: string[];
  slocSummary: Record<string, any>;
  uploadFormat: 'retur' | 'mb52';
  selectedQtyCol: string;
  meta: {
    formDocNo: string;
    formPlant: string;
    formPic1: string;
    formPic2: string;
    formTgl: string;
    formArea: string;
  };
  fileName?: string;
  logoUrl?: string;
}) {
  const { selectedSlocs, slocSummary, uploadFormat, selectedQtyCol, meta } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PT Kino Indonesia Tbk - Logistik';
  workbook.lastModifiedBy = 'Logistik Departemen';
  workbook.created = new Date();

  // Load buffer logo Kino
  const logoBuffer = await getLogoImageBuffer(params.logoUrl || KINO_LOGO_DEFAULT);
  let logoImageId: number | null = null;
  if (logoBuffer) {
    logoImageId = workbook.addImage({
      buffer: logoBuffer,
      extension: 'png',
    });
  }

  const tglDisplay = meta.formTgl ? fmtTglID(meta.formTgl) : '';
  const usedSheetNames = new Set<string>();

  function getUniqueSheetName(base: string): string {
    let name = base.substring(0, 31);
    let i = 2;
    while (usedSheetNames.has(name.toLowerCase())) {
      name = `${base}_${i}`.substring(0, 31);
      i++;
    }
    usedSheetNames.add(name.toLowerCase());
    return name;
  }

  function renderSheet(slocName: string, rows: any[], totalQty: number, qtyHeader: string, sheetTitle: string) {
    const ws = workbook.addWorksheet(sheetTitle, {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 }
    });

    // Atur lebar kolom agar proporsional dan mudah dibaca
    ws.columns = [
      { key: 'col1', width: 6 },   // A: NO
      { key: 'col2', width: 14 },  // B: Location
      { key: 'col3', width: 18 },  // C: Item Code
      { key: 'col4', width: 38 },  // D: Item Name
      { key: 'col5', width: 9 },   // E: Sloc
      { key: 'col6', width: 14 },  // F: Last Qty
      { key: 'col7', width: 14 },  // G: Fisik
      { key: 'col8', width: 22 },  // H: Keterangan
    ];

    // ==========================================
    // 1. KOP HEADER RESMI (Sesuai PPIC.025.00)
    // ==========================================
    ws.getRow(1).height = 26;
    ws.getRow(2).height = 22;

    // Merge A1:B2 untuk Logo KINO
    ws.mergeCells('A1:B2');
    applyBorderToRange(ws, 1, 1, 2, 2, MEDIUM_BORDER);

    // Sematkan Logo KINO di dalam sel A1:B2
    if (logoImageId !== null) {
      ws.addImage(logoImageId, {
        tl: { col: 0.15, row: 0.12 },
        br: { col: 1.85, row: 1.88 },
        editAs: 'oneCell',
      } as any);
    } else {
      const cellLogo = ws.getCell('A1');
      cellLogo.value = 'KINO';
      cellLogo.font = { bold: true, size: 14, color: { argb: 'FF004E92' } };
      cellLogo.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Merge C1:F1 untuk Judul Formulir
    ws.mergeCells('C1:F1');
    const cellTitle = ws.getCell('C1');
    cellTitle.value = 'FORMULIR STOCK OPNAME INTERNAL';
    cellTitle.font = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FF000000' } };
    cellTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorderToRange(ws, 1, 3, 1, 6, MEDIUM_BORDER);

    // Merge C2:F2 untuk Nomor Dokumen PPIC.025.00
    ws.mergeCells('C2:F2');
    const cellDoc = ws.getCell('C2');
    cellDoc.value = meta.formDocNo || 'PPIC.025.00';
    cellDoc.font = { name: 'Courier New', bold: true, size: 10, color: { argb: 'FF000000' } };
    cellDoc.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorderToRange(ws, 2, 3, 2, 6, MEDIUM_BORDER);

    // Merge G1:H2 untuk LOGISTIK DEPARTEMEN
    ws.mergeCells('G1:H2');
    const cellDept = ws.getCell('G1');
    cellDept.value = 'LOGISTIK DEPARTEMEN';
    cellDept.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF000000' } };
    cellDept.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyBorderToRange(ws, 1, 7, 2, 8, MEDIUM_BORDER);

    // Spasi halus
    ws.getRow(3).height = 6;

    // ==========================================
    // 2. TABEL METADATA (Plant, SLoc, Tgl, Area, PIC)
    // ==========================================
    const metaRows = [
      { r: 4, label1: 'Plant', val1: meta.formPlant || '1800', label2: 'PIC SO 1', val2: meta.formPic1 || '' },
      { r: 5, label1: 'SLoc', val1: slocName, label2: 'PIC SO 2', val2: meta.formPic2 || '' },
      { r: 6, label1: 'Tgl', val1: tglDisplay, label2: '', val2: '' },
      { r: 7, label1: 'Area', val1: meta.formArea || 'Gd. Distribusi', label2: '', val2: '' },
    ];

    metaRows.forEach(({ r, label1, val1, label2, val2 }) => {
      ws.getRow(r).height = 19;

      // Label 1 (Col A)
      const cA = ws.getCell(r, 1);
      cA.value = label1;
      cA.font = { bold: true, size: 9 };
      cA.border = THIN_BORDER;
      cA.alignment = { horizontal: 'left', vertical: 'middle' };

      // Val 1 (Col B)
      const cB = ws.getCell(r, 2);
      cB.value = val1;
      cB.font = { bold: true, size: 9 };
      cB.border = THIN_BORDER;
      cB.alignment = { horizontal: 'left', vertical: 'middle' };

      // Label 2 & Val 2
      if (label2) {
        ws.mergeCells(r, 3, r, 4);
        const cPicLbl = ws.getCell(r, 3);
        cPicLbl.value = label2;
        cPicLbl.font = { bold: true, size: 9 };
        cPicLbl.alignment = { horizontal: 'center', vertical: 'middle' };
        applyBorderToRange(ws, r, 3, r, 4, THIN_BORDER);

        ws.mergeCells(r, 5, r, 8);
        const cPicVal = ws.getCell(r, 5);
        cPicVal.value = val2;
        cPicVal.font = { size: 9 };
        cPicVal.alignment = { horizontal: 'left', vertical: 'middle' };
        applyBorderToRange(ws, r, 5, r, 8, THIN_BORDER);
      } else {
        ws.mergeCells(r, 3, r, 8);
        const cBlank = ws.getCell(r, 3);
        cBlank.value = '';
        applyBorderToRange(ws, r, 3, r, 8, THIN_BORDER);
      }
    });

    // Spasi pemisah sebelum tabel
    ws.getRow(8).height = 8;

    // ==========================================
    // 3. TABLE HEADER
    // ==========================================
    const headerRow = ws.getRow(9);
    headerRow.height = 24;
    const headers = ['NO', 'Location', 'Item Code', 'Item Name', 'SLoc', qtyHeader, 'Fisik', 'Keterangan'];
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { bold: true, size: 9, color: { argb: 'FF000000' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' } // abu-abu terang formal
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = MEDIUM_BORDER;
    });

    // ==========================================
    // 4. DATA ROWS
    // ==========================================
    let curRowIdx = 10;
    rows.forEach((r, idx) => {
      const row = ws.getRow(curRowIdx);
      row.height = 18;

      // NO
      const c1 = row.getCell(1);
      c1.value = idx + 1;
      c1.alignment = { horizontal: 'center', vertical: 'middle' };
      c1.font = { size: 9 };
      c1.border = THIN_BORDER;

      // Location
      const c2 = row.getCell(2);
      c2.value = r.location !== undefined ? r.location : '';
      c2.alignment = { horizontal: 'left', vertical: 'middle' };
      c2.font = { size: 9 };
      c2.border = THIN_BORDER;

      // Item Code
      const c3 = row.getCell(3);
      c3.value = r.itemCode !== undefined ? r.itemCode : r.material;
      c3.alignment = { horizontal: 'left', vertical: 'middle' };
      c3.font = { name: 'Consolas', size: 9 };
      c3.border = THIN_BORDER;

      // Item Name
      const c4 = row.getCell(4);
      c4.value = r.itemName !== undefined ? r.itemName : r.desc;
      c4.alignment = { horizontal: 'left', vertical: 'middle' };
      c4.font = { size: 9 };
      c4.border = THIN_BORDER;

      // SLoc
      const c5 = row.getCell(5);
      c5.value = r.sloc;
      c5.alignment = { horizontal: 'center', vertical: 'middle' };
      c5.font = { bold: true, size: 9 };
      c5.border = THIN_BORDER;

      // Last Qty / System Qty
      const c6 = row.getCell(6);
      c6.value = Number(r.lastQty) || 0;
      c6.numFmt = '#,##0';
      c6.alignment = { horizontal: 'right', vertical: 'middle' };
      c6.font = { bold: true, size: 9 };
      c6.border = THIN_BORDER;

      // Kolom Fisik (Kosong dengan border siap diisi / dicetak)
      const c7 = row.getCell(7);
      c7.value = '';
      c7.border = THIN_BORDER;

      // Kolom Keterangan
      const c8 = row.getCell(8);
      c8.value = '';
      c8.border = THIN_BORDER;

      curRowIdx++;
    });

    // ==========================================
    // 5. TOTAL ROW
    // ==========================================
    const totalRow = ws.getRow(curRowIdx);
    totalRow.height = 20;

    ws.mergeCells(curRowIdx, 1, curRowIdx, 5);
    const cTotalLbl = totalRow.getCell(1);
    cTotalLbl.value = 'Total';
    cTotalLbl.font = { bold: true, size: 9 };
    cTotalLbl.alignment = { horizontal: 'right', vertical: 'middle' };
    applyBorderToRange(ws, curRowIdx, 1, curRowIdx, 5, MEDIUM_BORDER);

    const cTotalQty = totalRow.getCell(6);
    cTotalQty.value = totalQty;
    cTotalQty.numFmt = '#,##0';
    cTotalQty.font = { bold: true, size: 9 };
    cTotalQty.alignment = { horizontal: 'right', vertical: 'middle' };
    cTotalQty.border = MEDIUM_BORDER;

    totalRow.getCell(7).border = MEDIUM_BORDER;
    totalRow.getCell(8).border = MEDIUM_BORDER;

    curRowIdx += 2; // Spasi sebelum tanda tangan

    // ==========================================
    // 6. TANDA TANGAN (Signatures)
    // ==========================================
    const signLblRow = ws.getRow(curRowIdx);
    signLblRow.height = 18;

    // Pelaksana (Col A:C)
    ws.mergeCells(curRowIdx, 1, curRowIdx, 3);
    const cSign1 = signLblRow.getCell(1);
    cSign1.value = 'Pelaksana';
    cSign1.font = { bold: true, size: 9 };
    cSign1.alignment = { horizontal: 'center', vertical: 'middle' };

    // Mengetahui (Col D:F)
    ws.mergeCells(curRowIdx, 4, curRowIdx, 6);
    const cSign2 = signLblRow.getCell(4);
    cSign2.value = 'Mengetahui';
    cSign2.font = { bold: true, size: 9 };
    cSign2.alignment = { horizontal: 'center', vertical: 'middle' };

    // Menyetujui (Col G:H)
    ws.mergeCells(curRowIdx, 7, curRowIdx, 8);
    const cSign3 = signLblRow.getCell(7);
    cSign3.value = 'Menyetujui';
    cSign3.font = { bold: true, size: 9 };
    cSign3.alignment = { horizontal: 'center', vertical: 'middle' };

    curRowIdx += 4; // Ruang tanda tangan fisik / stempel

    const signNameRow = ws.getRow(curRowIdx);
    signNameRow.height = 18;

    // Nama Pelaksana
    ws.mergeCells(curRowIdx, 1, curRowIdx, 3);
    const cName1 = signNameRow.getCell(1);
    cName1.value = 'Inventory';
    cName1.font = { size: 9, bold: true };
    cName1.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorderToRange(ws, curRowIdx, 1, curRowIdx, 3, { top: { style: 'thin' } });

    // Nama SPv
    ws.mergeCells(curRowIdx, 4, curRowIdx, 6);
    const cName2 = signNameRow.getCell(4);
    cName2.value = 'SPv Log Distribusi';
    cName2.font = { size: 9, bold: true };
    cName2.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorderToRange(ws, curRowIdx, 4, curRowIdx, 6, { top: { style: 'thin' } });

    // Nama Manager
    ws.mergeCells(curRowIdx, 7, curRowIdx, 8);
    const cName3 = signNameRow.getCell(7);
    cName3.value = 'Manager Log Distribusi';
    cName3.font = { size: 9, bold: true };
    cName3.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorderToRange(ws, curRowIdx, 7, curRowIdx, 8, { top: { style: 'thin' } });
  }

  // Render per SLOC
  const slocsSorted = Array.from(selectedSlocs).sort();
  if (uploadFormat === 'mb52') {
    slocsSorted.forEach(sloc => {
      const s = slocSummary[sloc];
      if (!s) return;
      ['FG', 'PACKAGING'].forEach(grp => {
        const gRows = s.groups[grp]?.rows || [];
        if (!gRows.length) return;
        const sheetName = getUniqueSheetName(`${sloc}-${grp}`);
        renderSheet(sloc, gRows, s.groups[grp].totalQty, 'Last Qty', sheetName);
      });
    });
  } else {
    slocsSorted.forEach(sloc => {
      const sData = slocSummary[sloc];
      if (!sData) return;
      const sheetName = getUniqueSheetName(sloc);
      renderSheet(sloc, sData.rows, sData.totalQty, selectedQtyCol || 'Last Qty', sheetName);
    });
  }

  // Generate buffer dan trigger download file
  const outFileName = params.fileName || `FormSO_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  triggerBrowserDownload(buffer, outFileName);
}

/**
 * EXPORT 2: BERITA ACARA STOCK OPNAME (.XLSX)
 * Dilengkapi Logo Resmi KINO di Header, Kotak Narasi Berita Acara,
 * Tabel Rekonsiliasi Hasil SUMIF (SAP vs Fisik vs Selisih), dan Tanda Tangan
 */
export async function exportBeritaAcaraExcel(params: {
  joinedRows: any[];
  meta: {
    narasi: string;
    baTgl: string;
    baGudang: string;
  };
  stats: {
    totalSAP: number;
    totalFisik: number;
    totalSelisih: number;
  };
  fileName?: string;
  logoUrl?: string;
}) {
  const { joinedRows, meta, stats } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PT Kino Indonesia Tbk - Logistik';
  workbook.lastModifiedBy = 'Logistik Departemen';
  workbook.created = new Date();

  const logoBuffer = await getLogoImageBuffer(params.logoUrl || KINO_LOGO_DEFAULT);
  let logoImageId: number | null = null;
  if (logoBuffer) {
    logoImageId = workbook.addImage({
      buffer: logoBuffer,
      extension: 'png',
    });
  }

  const ws = workbook.addWorksheet('Berita Acara', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 }
  });

  // Atur lebar kolom untuk 9 kolom Berita Acara
  ws.columns = [
    { key: 'col1', width: 6 },   // A: NO
    { key: 'col2', width: 9 },   // B: Sloc
    { key: 'col3', width: 17 },  // C: Material
    { key: 'col4', width: 38 },  // D: Material Description
    { key: 'col5', width: 7 },   // E: Bun
    { key: 'col6', width: 13 },  // F: SAP
    { key: 'col7', width: 13 },  // G: Fisik
    { key: 'col8', width: 13 },  // H: Selisih
    { key: 'col9', width: 22 },  // I: Keterangan
  ];

  // ==========================================
  // 1. KOP HEADER RESMI
  // ==========================================
  ws.getRow(1).height = 26;
  ws.getRow(2).height = 22;

  // Merge A1:B2 untuk Logo KINO
  ws.mergeCells('A1:B2');
  applyBorderToRange(ws, 1, 1, 2, 2, MEDIUM_BORDER);

  if (logoImageId !== null) {
    ws.addImage(logoImageId, {
      tl: { col: 0.15, row: 0.12 },
      br: { col: 1.85, row: 1.88 },
      editAs: 'oneCell',
    } as any);
  } else {
    const cellLogo = ws.getCell('A1');
    cellLogo.value = 'KINO';
    cellLogo.font = { bold: true, size: 14, color: { argb: 'FF004E92' } };
    cellLogo.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Merge C1:G2 untuk Judul BERITA ACARA STOCK OPNAME
  ws.mergeCells('C1:G2');
  const cellTitle = ws.getCell('C1');
  cellTitle.value = 'BERITA ACARA STOCK OPNAME';
  cellTitle.font = { name: 'Calibri', bold: true, size: 13, color: { argb: 'FF000000' } };
  cellTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorderToRange(ws, 1, 3, 2, 7, MEDIUM_BORDER);

  // Merge H1:I2 untuk LOGISTIK DEPARTEMEN
  ws.mergeCells('H1:I2');
  const cellDept = ws.getCell('H1');
  cellDept.value = 'LOGISTIK DEPARTEMEN';
  cellDept.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF000000' } };
  cellDept.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  applyBorderToRange(ws, 1, 8, 2, 9, MEDIUM_BORDER);

  // Spasi halus
  ws.getRow(3).height = 6;

  // ==========================================
  // 2. KOTAK NARASI BERITA ACARA (Row 4)
  // ==========================================
  ws.getRow(4).height = 48;
  ws.mergeCells('A4:I4');
  const cellNarasi = ws.getCell('A4');
  cellNarasi.value = meta.narasi;
  cellNarasi.font = { size: 9 };
  cellNarasi.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  applyBorderToRange(ws, 4, 1, 4, 9, MEDIUM_BORDER);

  // Spasi halus
  ws.getRow(5).height = 8;

  // ==========================================
  // 3. TABLE HEADER (Row 6)
  // ==========================================
  const headerRow = ws.getRow(6);
  headerRow.height = 24;
  const headers = ['NO', 'SLoc', 'Material', 'Material Description', 'Bun', 'SAP', 'Fisik', 'Selisih', 'Keterangan'];
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9, color: { argb: 'FF000000' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = MEDIUM_BORDER;
  });

  // ==========================================
  // 4. DATA ROWS
  // ==========================================
  let curRowIdx = 7;
  joinedRows.forEach((rw) => {
    const row = ws.getRow(curRowIdx);
    row.height = 18;

    // NO
    const c1 = row.getCell(1);
    c1.value = rw.no;
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    c1.font = { size: 9 };
    c1.border = THIN_BORDER;

    // SLoc
    const c2 = row.getCell(2);
    c2.value = rw.sloc;
    c2.alignment = { horizontal: 'center', vertical: 'middle' };
    c2.font = { size: 9 };
    c2.border = THIN_BORDER;

    // Material
    const c3 = row.getCell(3);
    c3.value = rw.material;
    c3.alignment = { horizontal: 'left', vertical: 'middle' };
    c3.font = { name: 'Consolas', size: 9 };
    c3.border = THIN_BORDER;

    // Desc
    const c4 = row.getCell(4);
    c4.value = rw.desc;
    c4.alignment = { horizontal: 'left', vertical: 'middle' };
    c4.font = { size: 9 };
    c4.border = THIN_BORDER;

    // Bun
    const c5 = row.getCell(5);
    c5.value = rw.bun;
    c5.alignment = { horizontal: 'center', vertical: 'middle' };
    c5.font = { size: 9 };
    c5.border = THIN_BORDER;

    // SAP Qty
    const c6 = row.getCell(6);
    c6.value = Number(rw.sapQty) || 0;
    c6.numFmt = '#,##0';
    c6.alignment = { horizontal: 'right', vertical: 'middle' };
    c6.font = { size: 9 };
    c6.border = THIN_BORDER;

    // Fisik Qty
    const c7 = row.getCell(7);
    c7.value = Number(rw.fisik) || 0;
    c7.numFmt = '#,##0';
    c7.alignment = { horizontal: 'right', vertical: 'middle' };
    c7.font = { size: 9 };
    c7.border = THIN_BORDER;

    // Selisih
    const c8 = row.getCell(8);
    const selVal = Number(rw.selisih) || 0;
    c8.value = selVal;
    c8.numFmt = '+#,##0;-#,##0;0';
    c8.alignment = { horizontal: 'right', vertical: 'middle' };
    c8.font = {
      size: 9,
      bold: selVal !== 0,
      color: { argb: selVal > 0 ? 'FF16A34A' : selVal < 0 ? 'FFDC2626' : 'FF000000' }
    };
    c8.border = THIN_BORDER;

    // Keterangan
    const c9 = row.getCell(9);
    c9.value = rw.ket || '';
    c9.alignment = { horizontal: 'left', vertical: 'middle' };
    c9.font = { size: 9 };
    c9.border = THIN_BORDER;

    curRowIdx++;
  });

  // ==========================================
  // 5. TOTAL ROW
  // ==========================================
  const totalRow = ws.getRow(curRowIdx);
  totalRow.height = 20;

  ws.mergeCells(curRowIdx, 1, curRowIdx, 5);
  const cTotLbl = totalRow.getCell(1);
  cTotLbl.value = 'Total';
  cTotLbl.font = { bold: true, size: 9 };
  cTotLbl.alignment = { horizontal: 'right', vertical: 'middle' };
  applyBorderToRange(ws, curRowIdx, 1, curRowIdx, 5, MEDIUM_BORDER);

  // Total SAP
  const cTotSAP = totalRow.getCell(6);
  cTotSAP.value = stats.totalSAP;
  cTotSAP.numFmt = '#,##0';
  cTotSAP.font = { bold: true, size: 9 };
  cTotSAP.alignment = { horizontal: 'right', vertical: 'middle' };
  cTotSAP.border = MEDIUM_BORDER;

  // Total Fisik
  const cTotFisik = totalRow.getCell(7);
  cTotFisik.value = stats.totalFisik;
  cTotFisik.numFmt = '#,##0';
  cTotFisik.font = { bold: true, size: 9 };
  cTotFisik.alignment = { horizontal: 'right', vertical: 'middle' };
  cTotFisik.border = MEDIUM_BORDER;

  // Total Selisih
  const cTotSel = totalRow.getCell(8);
  cTotSel.value = stats.totalSelisih;
  cTotSel.numFmt = '+#,##0;-#,##0;0';
  cTotSel.font = {
    bold: true,
    size: 9,
    color: { argb: stats.totalSelisih > 0 ? 'FF16A34A' : stats.totalSelisih < 0 ? 'FFDC2626' : 'FF000000' }
  };
  cTotSel.alignment = { horizontal: 'right', vertical: 'middle' };
  cTotSel.border = MEDIUM_BORDER;

  totalRow.getCell(9).border = MEDIUM_BORDER;

  curRowIdx += 2; // Spasi sebelum tanda tangan

  // ==========================================
  // 6. TANDA TANGAN (Signatures)
  // ==========================================
  const signLblRow = ws.getRow(curRowIdx);
  signLblRow.height = 18;

  // Pelaksana (A:C)
  ws.mergeCells(curRowIdx, 1, curRowIdx, 3);
  const s1 = signLblRow.getCell(1);
  s1.value = 'Pelaksana';
  s1.font = { bold: true, size: 9 };
  s1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Mengetahui (D:F)
  ws.mergeCells(curRowIdx, 4, curRowIdx, 6);
  const s2 = signLblRow.getCell(4);
  s2.value = 'Mengetahui';
  s2.font = { bold: true, size: 9 };
  s2.alignment = { horizontal: 'center', vertical: 'middle' };

  // Menyetujui (G:I)
  ws.mergeCells(curRowIdx, 7, curRowIdx, 9);
  const s3 = signLblRow.getCell(7);
  s3.value = 'Menyetujui';
  s3.font = { bold: true, size: 9 };
  s3.alignment = { horizontal: 'center', vertical: 'middle' };

  curRowIdx += 4;

  const signNameRow = ws.getRow(curRowIdx);
  signNameRow.height = 18;

  ws.mergeCells(curRowIdx, 1, curRowIdx, 3);
  const sn1 = signNameRow.getCell(1);
  sn1.value = 'Inventory';
  sn1.font = { size: 9, bold: true };
  sn1.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorderToRange(ws, curRowIdx, 1, curRowIdx, 3, { top: { style: 'thin' } });

  ws.mergeCells(curRowIdx, 4, curRowIdx, 6);
  const sn2 = signNameRow.getCell(4);
  sn2.value = 'SPv Log Distribusi';
  sn2.font = { size: 9, bold: true };
  sn2.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorderToRange(ws, curRowIdx, 4, curRowIdx, 6, { top: { style: 'thin' } });

  ws.mergeCells(curRowIdx, 7, curRowIdx, 9);
  const sn3 = signNameRow.getCell(7);
  sn3.value = 'Manager Log Distribusi';
  sn3.font = { size: 9, bold: true };
  sn3.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBorderToRange(ws, curRowIdx, 7, curRowIdx, 9, { top: { style: 'thin' } });

  // Generate buffer dan trigger download file
  const outFileName = params.fileName || `BA_StockOpname_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  triggerBrowserDownload(buffer, outFileName);
}

function triggerBrowserDownload(buffer: ExcelJS.Buffer, fileName: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
