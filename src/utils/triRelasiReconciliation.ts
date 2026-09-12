import {
  LargoRow,
  SapRow,
  TargetRow,
  TriRelasiItem,
  TriRelasiSummary,
  MatchStatus,
  TargetFulfillmentStatus,
  BatchDetailLargo,
  BatchDetailSap
} from '../types/triRelasi';

export function normalizeItemCode(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  // Strip leading zeros if purely numeric (e.g. "0000000000100456" -> "100456")
  if (/^0+[0-9]+$/.test(str)) {
    return str.replace(/^0+/, '');
  }
  return str.toUpperCase();
}

export function parseNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function getField(row: Record<string, any>, patterns: RegExp[]): any {
  if (!row) return undefined;
  const keys = Object.keys(row);
  for (const pattern of patterns) {
    const matchedKey = keys.find(k => pattern.test(k.trim()));
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      return row[matchedKey];
    }
  }
  return undefined;
}

export function reconcileTriRelasi(
  largoRows: LargoRow[] = [],
  sapRows: SapRow[] = [],
  targetRows: TargetRow[] = []
): { items: TriRelasiItem[]; summary: TriRelasiSummary } {
  // 1. Group Largo Rows
  const largoMap = new Map<
    string,
    {
      code: string;
      name: string;
      category: string;
      uom: string;
      uomConvert: string;
      totalQty: number; // Last Qty (Stok Fisik)
      totalFirstQty: number;
      totalQtyConvert: number; // Qty Convert (Yang sudah siap)
      batches: BatchDetailLargo[];
      rowCount: number;
    }
  >();

  largoRows.forEach(row => {
    const rawCode = getField(row, [/^item\s*code$/i, /^material\s*code$/i, /^kode\s*(barang|item|produk)$/i]);
    const normCode = normalizeItemCode(rawCode);
    if (!normCode) return;

    const rawName = getField(row, [/^item\s*name$/i, /^nama\s*(barang|item|produk)$/i, /^description$/i]) || '';
    const rawCategory = getField(row, [/^category$/i, /^kategori$/i]) || 'Umum';
    const rawUom = getField(row, [/^uom$/i, /^satuan$/i]) || 'PCS';
    const rawUomConvert = getField(row, [/^uom\s*convert$/i, /^satuan\s*konversi$/i]) || '';
    
    // Explicitly distinguish Last Qty, First Qty, and Qty Convert
    const rawLastQty = getField(row, [/^last\s*qty$/i, /^qty\s*akhir$/i, /^final\s*qty$/i]);
    const rawQtyConvert = getField(row, [/^qty\s*convert$/i, /^qty\s*konversi$/i, /^convert\s*qty$/i]);
    const rawFirstQty = getField(row, [/^first\s*qty$/i, /^qty\s*awal$/i]);
    
    const lastQty = rawLastQty !== undefined
      ? parseNumber(rawLastQty)
      : rawFirstQty !== undefined
      ? parseNumber(rawFirstQty)
      : parseNumber(rawQtyConvert);

    const firstQty = parseNumber(rawFirstQty);
    const qtyConvert = parseNumber(rawQtyConvert);

    const batchStr = String(getField(row, [/^batch$/i, /^no\s*batch$/i]) || '-');
    const vendorBatchStr = String(getField(row, [/^vendor\s*batch$/i]) || '-');
    const locationStr = String(getField(row, [/^location$/i, /^lokasi$/i]) || '-');
    const slocStr = String(getField(row, [/^sloc$/i, /^gudang$/i]) || '-');
    const expDateStr = String(getField(row, [/^expired\s*date$/i, /^tgl\s*kadaluarsa$/i, /^ed$/i]) || '-');
    const lpnStr = String(getField(row, [/lpn/i, /^serial\s*number$/i]) || '-');

    if (!largoMap.has(normCode)) {
      largoMap.set(normCode, {
        code: String(rawCode || normCode).trim(),
        name: String(rawName).trim(),
        category: String(rawCategory).trim(),
        uom: String(rawUom).trim(),
        uomConvert: String(rawUomConvert).trim(),
        totalQty: 0,
        totalFirstQty: 0,
        totalQtyConvert: 0,
        batches: [],
        rowCount: 0
      });
    }

    const entry = largoMap.get(normCode)!;
    entry.totalQty += lastQty;
    entry.totalFirstQty += firstQty;
    entry.totalQtyConvert += qtyConvert;
    entry.rowCount += 1;
    if (entry.name === '' && rawName) entry.name = String(rawName).trim();
    if (entry.category === 'Umum' && rawCategory) entry.category = String(rawCategory).trim();
    if (entry.uom === 'PCS' && rawUom) entry.uom = String(rawUom).trim();
    if (!entry.uomConvert && rawUomConvert) entry.uomConvert = String(rawUomConvert).trim();

    entry.batches.push({
      batch: batchStr,
      vendorBatch: vendorBatchStr,
      location: locationStr,
      sloc: slocStr,
      qty: lastQty,
      firstQty,
      qtyConvert,
      uomConvert: String(rawUomConvert || entry.uomConvert || entry.uom),
      expiredDate: expDateStr,
      lpn: lpnStr
    });
  });

  // 2. Group SAP Rows
  const sapMap = new Map<
    string,
    {
      code: string;
      desc: string;
      uom: string;
      unresStock: number;
      blockedStock: number;
      stockInTrf: number;
      price: number;
      stockValue: number;
      batches: BatchDetailSap[];
      rowCount: number;
    }
  >();

  sapRows.forEach(row => {
    const rawCode = getField(row, [/^material\s*num$/i, /^material\s*no$/i, /^material$/i, /^kode\s*material$/i]);
    const normCode = normalizeItemCode(rawCode);
    if (!normCode) return;

    const rawDesc = getField(row, [/^material\s*desc$/i, /^deskripsi$/i, /^nama\s*material$/i]) || '';
    const rawUom = getField(row, [/^uom$/i, /^satuan$/i]) || 'PCS';
    const unres = parseNumber(getField(row, [/^unres\.\s*stock$/i, /^unres\s*stock$/i, /^unrestricted$/i, /^stock$/i]));
    const blocked = parseNumber(getField(row, [/^blocked\s*stock$/i, /^blocked$/i]));
    const trf = parseNumber(getField(row, [/^stock\s*in\s*trf$/i, /^in\s*transit$/i]));
    const price = parseNumber(getField(row, [/^price$/i, /^harga$/i, /^unit\s*price$/i]));
    const val = parseNumber(getField(row, [/^unres\.\s*stock\s*value$/i, /^stock\s*value$/i, /^nilai\s*stock$/i])) || (unres * price);

    const batchStr = String(getField(row, [/^batch$/i, /^no\s*batch$/i]) || '-');
    const vendorBatchStr = String(getField(row, [/^vendor\s*batch$/i]) || '-');
    const plantStr = String(getField(row, [/^plant$/i, /^pabrik$/i]) || '-');
    const slocStr = String(getField(row, [/^sloc$/i, /^storage\s*location$/i]) || '-');
    const sledStr = String(getField(row, [/^sled$/i, /^expired$/i, /^kadaluarsa$/i]) || '-');

    if (!sapMap.has(normCode)) {
      sapMap.set(normCode, {
        code: String(rawCode || normCode).trim(),
        desc: String(rawDesc).trim(),
        uom: String(rawUom).trim(),
        unresStock: 0,
        blockedStock: 0,
        stockInTrf: 0,
        price: 0,
        stockValue: 0,
        batches: [],
        rowCount: 0
      });
    }

    const entry = sapMap.get(normCode)!;
    entry.unresStock += unres;
    entry.blockedStock += blocked;
    entry.stockInTrf += trf;
    entry.stockValue += val;
    if (price > 0 && entry.price === 0) entry.price = price;
    entry.rowCount += 1;
    if (!entry.desc && rawDesc) entry.desc = String(rawDesc).trim();
    if (entry.uom === 'PCS' && rawUom) entry.uom = String(rawUom).trim();

    entry.batches.push({
      batch: batchStr,
      vendorBatch: vendorBatchStr,
      plant: plantStr,
      sloc: slocStr,
      unresStock: unres,
      blockedStock: blocked,
      sled: sledStr,
      price,
      stockValue: val
    });
  });

  // 3. Group Target Rows
  const targetMap = new Map<
    string,
    {
      code: string;
      name: string;
      sepQty: number;
      octQty: number;
      otherTargetQty: number;
    }
  >();

  targetRows.forEach(row => {
    const rawCode = getField(row, [
      /^kode\s*produk\s*konv$/i,
      /^kode\s*produk$/i,
      /^kode\s*barang$/i,
      /^item\s*code$/i,
      /^material\s*num$/i
    ]);
    const normCode = normalizeItemCode(rawCode);
    if (!normCode) return;

    const rawName = getField(row, [
      /^nama\s*produk\s*konv$/i,
      /^nama\s*produk$/i,
      /^nama\s*barang$/i,
      /^item\s*name$/i
    ]) || '';

    const sepVal = parseNumber(getField(row, [
      /sep.*26.*qty/i,
      /sep.*qty/i,
      /september.*qty/i,
      /target.*sep/i
    ]));

    const octVal = parseNumber(getField(row, [
      /oct.*26.*qty/i,
      /oct.*qty/i,
      /oktober.*qty/i,
      /target.*oct/i
    ]));

    // Check if there are other target columns (e.g. general target qty)
    let otherVal = 0;
    if (sepVal === 0 && octVal === 0) {
      const fallbackTarget = getField(row, [
        /^target(\s*qty)?$/i,
        /^qty\s*target$/i,
        /^total\s*target$/i,
        /^target\s*produksi$/i
      ]);
      if (fallbackTarget !== undefined) {
        otherVal = parseNumber(fallbackTarget);
      }
    }

    if (!targetMap.has(normCode)) {
      targetMap.set(normCode, {
        code: String(rawCode || normCode).trim(),
        name: String(rawName).trim(),
        sepQty: 0,
        octQty: 0,
        otherTargetQty: 0
      });
    }

    const entry = targetMap.get(normCode)!;
    entry.sepQty += sepVal;
    entry.octQty += octVal;
    entry.otherTargetQty += otherVal;
    if (!entry.name && rawName) entry.name = String(rawName).trim();
  });

  // 4. Combine All Unique Product Codes
  const allCodesSet = new Set<string>();
  largoMap.forEach((_, k) => allCodesSet.add(k));
  sapMap.forEach((_, k) => allCodesSet.add(k));
  targetMap.forEach((_, k) => allCodesSet.add(k));

  const items: TriRelasiItem[] = [];

  allCodesSet.forEach(normCode => {
    const largo = largoMap.get(normCode);
    const sap = sapMap.get(normCode);
    const target = targetMap.get(normCode);

    const largoStock = largo ? largo.totalQty : 0; // Last Qty
    const largoFirstQty = largo ? largo.totalFirstQty : 0;
    const largoQtyConvert = largo ? largo.totalQtyConvert : 0; // Qty Convert (Yang sudah siap)
    const largoUomConvert = largo?.uomConvert || '';

    const sapStock = sap ? sap.unresStock : 0;
    const sapBlocked = sap ? sap.blockedStock : 0;
    const sapTrf = sap ? sap.stockInTrf : 0;
    const sapPrice = sap ? sap.price : 0;
    const sapVal = sap ? sap.stockValue : 0;

    const displayCode = largo?.code || sap?.code || target?.code || normCode;
    const productName = largo?.name || sap?.desc || target?.name || `Produk ${displayCode}`;
    const category = largo?.category || 'General';
    const uom = largo?.uom || sap?.uom || 'PCS';

    // Stock Variance: Largo Last Qty - SAP Unres Stock
    const stockVariance = largoStock - sapStock;
    const absVariance = Math.abs(stockVariance);
    const valueVariance = sapPrice > 0 ? stockVariance * sapPrice : (sapStock > 0 ? stockVariance * (sapVal / sapStock) : 0);

    let matchStatus: MatchStatus;
    if (largo && !sap) {
      matchStatus = 'ONLY_LARGO';
    } else if (!largo && sap) {
      matchStatus = 'ONLY_SAP';
    } else if (absVariance < 0.001) {
      matchStatus = 'MATCH';
    } else if (largoStock > sapStock) {
      matchStatus = 'LARGO_SURPLUS';
    } else {
      matchStatus = 'SAP_SURPLUS';
    }

    // Target metrics from Sheet Target
    const targetSepQty = target ? target.sepQty : 0;
    const targetOctQty = target ? target.octQty : 0;
    const totalTargetQty = target ? (target.sepQty + target.octQty + target.otherTargetQty) : 0;
    const hasTarget = totalTargetQty > 0;

    // Target Readiness from Largo Qty Convert (Yang sudah siap di sheet largo kolom qty convert)
    const targetReadyQty = largoQtyConvert;
    const targetReadyPct = totalTargetQty > 0 ? (targetReadyQty / totalTargetQty) * 100 : null;
    const targetReadySepPct = targetSepQty > 0 ? (targetReadyQty / targetSepQty) * 100 : null;
    const targetReadyOctPct = targetOctQty > 0 ? (targetReadyQty / targetOctQty) * 100 : null;
    const targetDeficitQty = Math.max(0, totalTargetQty - targetReadyQty);
    const targetSurplusQty = Math.max(0, targetReadyQty - totalTargetQty);

    let targetReadinessStatus: 'FULL_READY' | 'PARTIAL_READY' | 'NOT_READY' | 'NO_TARGET';
    if (!hasTarget) {
      targetReadinessStatus = 'NO_TARGET';
    } else if (targetReadyPct !== null && targetReadyPct >= 100) {
      targetReadinessStatus = 'FULL_READY';
    } else if (targetReadyPct !== null && targetReadyPct > 0) {
      targetReadinessStatus = 'PARTIAL_READY';
    } else {
      targetReadinessStatus = 'NOT_READY';
    }

    // Target percentages from Largo Last Qty (Stok fisik keseluruhan)
    const targetSepPctLargo = targetSepQty > 0 ? (largoStock / targetSepQty) * 100 : null;
    const targetOctPctLargo = targetOctQty > 0 ? (largoStock / targetOctQty) * 100 : null;
    const totalTargetPctLargo = totalTargetQty > 0 ? (largoStock / totalTargetQty) * 100 : null;

    // Target percentages from SAP stock
    const targetSepPctSap = targetSepQty > 0 ? (sapStock / targetSepQty) * 100 : null;
    const targetOctPctSap = targetOctQty > 0 ? (sapStock / targetOctQty) * 100 : null;
    const totalTargetPctSap = totalTargetQty > 0 ? (sapStock / totalTargetQty) * 100 : null;

    const calcStatus = (pct: number | null): TargetFulfillmentStatus => {
      if (pct === null) return 'NO_TARGET';
      if (pct >= 100) return 'FULFILLED';
      if (pct >= 50) return 'PARTIAL';
      if (pct > 0) return 'LOW';
      return 'EMPTY';
    };

    const targetStatusSep = calcStatus(targetSepPctLargo);
    const targetStatusOct = calcStatus(targetOctPctLargo);
    const overallTargetStatus = calcStatus(totalTargetPctLargo);

    items.push({
      itemCode: displayCode,
      productName,
      category,
      uom,
      largoUomConvert,
      largoStock,
      largoFirstQty,
      largoQtyConvert,
      sapStock,
      sapBlockedStock: sapBlocked,
      sapTrfStock: sapTrf,
      sapPrice,
      sapStockValue: sapVal,
      stockVariance,
      absVariance,
      valueVariance,
      matchStatus,
      targetSepQty,
      targetOctQty,
      totalTargetQty,
      targetReadyQty,
      targetReadyPct,
      targetReadySepPct,
      targetReadyOctPct,
      targetDeficitQty,
      targetSurplusQty,
      targetReadinessStatus,
      targetSepPctLargo,
      targetOctPctLargo,
      totalTargetPctLargo,
      targetSepPctSap,
      targetOctPctSap,
      totalTargetPctSap,
      targetStatusSep,
      targetStatusOct,
      overallTargetStatus,
      largoRowsCount: largo ? largo.rowCount : 0,
      sapRowsCount: sap ? sap.rowCount : 0,
      hasTarget,
      largoBatches: largo ? largo.batches : [],
      sapBatches: sap ? sap.batches : []
    });
  });

  // Sort by highest target, then by highest deficit or variance
  items.sort((a, b) => b.totalTargetQty - a.totalTargetQty || b.targetDeficitQty - a.targetDeficitQty || b.absVariance - a.absVariance);

  // 5. Summary Calculations
  let totalLargoStock = 0;
  let totalLargoQtyConvert = 0;
  let totalSapStock = 0;
  let totalSapBlocked = 0;
  let totalSapValue = 0;
  let totalVariance = 0;
  let totalValueVariance = 0;

  let matchCount = 0;
  let varianceCount = 0;
  let largoSurplusCount = 0;
  let sapSurplusCount = 0;
  let onlyLargoCount = 0;
  let onlySapCount = 0;

  let totalTargetSep = 0;
  let totalTargetOct = 0;
  let totalTargetCombined = 0;
  let totalTargetDeficit = 0;
  let totalTargetSurplus = 0;

  let targetReadyCount = 0;
  let targetPartialReadyCount = 0;
  let targetNotReadyCount = 0;

  let targetFulfilledCount = 0;
  let targetPartialCount = 0;
  let targetLowCount = 0;
  let targetEmptyCount = 0;
  let noTargetCount = 0;

  items.forEach(item => {
    totalLargoStock += item.largoStock;
    totalLargoQtyConvert += item.largoQtyConvert;
    totalSapStock += item.sapStock;
    totalSapBlocked += item.sapBlockedStock;
    totalSapValue += item.sapStockValue;
    totalVariance += item.stockVariance;
    totalValueVariance += item.valueVariance;

    if (item.matchStatus === 'MATCH') matchCount++;
    else if (item.matchStatus === 'LARGO_SURPLUS') {
      largoSurplusCount++;
      varianceCount++;
    } else if (item.matchStatus === 'SAP_SURPLUS') {
      sapSurplusCount++;
      varianceCount++;
    } else if (item.matchStatus === 'ONLY_LARGO') {
      onlyLargoCount++;
      varianceCount++;
    } else if (item.matchStatus === 'ONLY_SAP') {
      onlySapCount++;
      varianceCount++;
    }

    if (item.hasTarget) {
      totalTargetCombined += item.totalTargetQty;
      totalTargetSep += item.targetSepQty;
      totalTargetOct += item.targetOctQty;
      totalTargetDeficit += item.targetDeficitQty;
      totalTargetSurplus += item.targetSurplusQty;

      if (item.targetReadinessStatus === 'FULL_READY') targetReadyCount++;
      else if (item.targetReadinessStatus === 'PARTIAL_READY') targetPartialReadyCount++;
      else targetNotReadyCount++;

      if (item.overallTargetStatus === 'FULFILLED') targetFulfilledCount++;
      else if (item.overallTargetStatus === 'PARTIAL') targetPartialCount++;
      else if (item.overallTargetStatus === 'LOW') targetLowCount++;
      else targetEmptyCount++;
    } else {
      noTargetCount++;
    }
  });

  const totalSkus = items.length;
  const matchRatePct = totalSkus > 0 ? (matchCount / totalSkus) * 100 : 0;
  const targetReadyFulfilledPct = totalTargetCombined > 0 ? (totalLargoQtyConvert / totalTargetCombined) * 100 : 0;

  const targetSepFulfilledPctLargo = totalTargetSep > 0 ? (totalLargoStock / totalTargetSep) * 100 : 0;
  const targetSepFulfilledPctSap = totalTargetSep > 0 ? (totalSapStock / totalTargetSep) * 100 : 0;
  const targetOctFulfilledPctLargo = totalTargetOct > 0 ? (totalLargoStock / totalTargetOct) * 100 : 0;
  const targetOctFulfilledPctSap = totalTargetOct > 0 ? (totalSapStock / totalTargetOct) * 100 : 0;
  const totalTargetFulfilledPctLargo = totalTargetCombined > 0 ? (totalLargoStock / totalTargetCombined) * 100 : 0;
  const totalTargetFulfilledPctSap = totalTargetCombined > 0 ? (totalSapStock / totalTargetCombined) * 100 : 0;

  const summary: TriRelasiSummary = {
    totalSkus,
    totalLargoStock,
    totalLargoQtyConvert,
    totalSapStock,
    totalSapBlocked,
    totalSapValue,
    totalVariance,
    totalValueVariance,
    matchCount,
    varianceCount,
    largoSurplusCount,
    sapSurplusCount,
    onlyLargoCount,
    onlySapCount,
    matchRatePct,
    totalTargetSep,
    totalTargetOct,
    totalTargetCombined,
    totalTargetDeficit,
    totalTargetSurplus,
    targetReadyFulfilledPct,
    targetReadyCount,
    targetPartialReadyCount,
    targetNotReadyCount,
    targetSepFulfilledPctLargo,
    targetSepFulfilledPctSap,
    targetOctFulfilledPctLargo,
    targetOctFulfilledPctSap,
    totalTargetFulfilledPctLargo,
    totalTargetFulfilledPctSap,
    targetFulfilledCount,
    targetPartialCount,
    targetLowCount,
    targetEmptyCount,
    noTargetCount
  };

  return { items, summary };
}
