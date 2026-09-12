export interface LargoRow {
  'Item Code'?: string;
  'Item Name'?: string;
  'Category'?: string;
  'Location'?: string;
  'Location Type'?: string;
  'First Qty'?: number | string;
  'Last Qty'?: number | string;
  'Uom'?: string;
  'Qty Convert'?: number | string;
  'Uom Convert'?: string;
  'LPN/Serial Number'?: string;
  'Batch'?: string;
  'Vendor Batch'?: string;
  'SLOC'?: string;
  'Expired Date'?: string;
  'Destination Code'?: string;
  'QC Code'?: string;
  'User Tally'?: string;
  'Shelf Life'?: string | number;
  'Source'?: string;
  [key: string]: any;
}

export interface SapRow {
  'Material Num'?: string;
  'Material Desc'?: string;
  'Batch'?: string;
  'Plant'?: string;
  'Plant Nm'?: string;
  'Sloc'?: string;
  'Sloc Nm'?: string;
  'Vendor Batch'?: string;
  'Month'?: string | number;
  'Year'?: string | number;
  'Unres. Stock'?: number | string;
  'Blocked Stock'?: number | string;
  'Stock in Trf'?: number | string;
  'Price Control'?: string;
  'Price'?: number | string;
  'Unres. Stock Value'?: number | string;
  'Sled'?: string;
  'UOM'?: string;
  [key: string]: any;
}

export interface TargetRow {
  'KODE PRODUK KONV'?: string;
  'NAMA PRODUK KONV'?: string;
  "SEP '26-QTY"?: number | string;
  "OCT '26-QTY"?: number | string;
  [key: string]: any;
}

export type MatchStatus =
  | 'MATCH'
  | 'LARGO_SURPLUS'
  | 'SAP_SURPLUS'
  | 'ONLY_LARGO'
  | 'ONLY_SAP';

export type TargetFulfillmentStatus =
  | 'FULFILLED'       // >= 100%
  | 'PARTIAL'         // 50% - 99.9%
  | 'LOW'             // < 50% & > 0%
  | 'EMPTY'           // 0%
  | 'NO_TARGET';      // Target = 0

export interface BatchDetailLargo {
  batch: string;
  vendorBatch: string;
  location: string;
  sloc: string;
  qty: number; // Last Qty
  firstQty: number;
  qtyConvert: number; // Qty Convert (yang sudah siap)
  uomConvert: string;
  expiredDate: string;
  lpn: string;
}

export interface BatchDetailSap {
  batch: string;
  vendorBatch: string;
  plant: string;
  sloc: string;
  unresStock: number;
  blockedStock: number;
  sled: string;
  price?: number;
  stockValue?: number;
}

export interface TriRelasiItem {
  itemCode: string;
  productName: string;
  category: string;
  uom: string;
  largoUomConvert?: string;

  // Stock figures Largo
  largoStock: number; // Last Qty
  largoFirstQty: number; // First Qty
  largoQtyConvert: number; // Qty Convert di sheet Largo (yang sudah siap)

  // Stock figures SAP
  sapStock: number; // Unres. Stock
  sapBlockedStock: number;
  sapTrfStock: number;
  sapPrice: number;
  sapStockValue: number;

  // Variance (Largo Last Qty - SAP Unres Stock)
  stockVariance: number;
  absVariance: number;
  valueVariance: number;
  matchStatus: MatchStatus;

  // Target figures from Sheet Target
  targetSepQty: number;
  targetOctQty: number;
  totalTargetQty: number;

  // Target Readiness from Largo Qty Convert (Yang sudah siap di sheet largo kolom qty convert)
  targetReadyQty: number; // = largoQtyConvert
  targetReadyPct: number | null; // % Kesiapan terhadap Total Target
  targetReadySepPct: number | null; // % Kesiapan terhadap SEP
  targetReadyOctPct: number | null; // % Kesiapan terhadap OCT
  targetDeficitQty: number; // Sisa kebutuhan target (Target - Qty Convert)
  targetSurplusQty: number; // Surplus Qty Convert jika > Target
  targetReadinessStatus: 'FULL_READY' | 'PARTIAL_READY' | 'NOT_READY' | 'NO_TARGET';

  // Target percentages from Largo Last Qty (Stok fisik)
  targetSepPctLargo: number | null;
  targetOctPctLargo: number | null;
  totalTargetPctLargo: number | null;

  // Target percentages from SAP stock
  targetSepPctSap: number | null;
  targetOctPctSap: number | null;
  totalTargetPctSap: number | null;

  // Fulfillment status
  targetStatusSep: TargetFulfillmentStatus;
  targetStatusOct: TargetFulfillmentStatus;
  overallTargetStatus: TargetFulfillmentStatus;

  // Raw counts
  largoRowsCount: number;
  sapRowsCount: number;
  hasTarget: boolean;

  // Batches
  largoBatches: BatchDetailLargo[];
  sapBatches: BatchDetailSap[];
}

export interface TriRelasiSummary {
  totalSkus: number;
  totalLargoStock: number;
  totalLargoQtyConvert: number; // Akumulasi Qty Convert (yang sudah siap)
  totalSapStock: number;
  totalSapBlocked: number;
  totalSapValue: number;
  totalVariance: number;
  totalValueVariance: number;
  
  // Match stats (Largo vs SAP)
  matchCount: number;
  varianceCount: number;
  largoSurplusCount: number;
  sapSurplusCount: number;
  onlyLargoCount: number;
  onlySapCount: number;
  matchRatePct: number;

  // Target stats
  totalTargetSep: number;
  totalTargetOct: number;
  totalTargetCombined: number;
  totalTargetDeficit: number; // Total sisa kebutuhan target
  totalTargetSurplus: number; // Total kelebihan siap

  // Target Readiness from Qty Convert Largo
  targetReadyFulfilledPct: number; // (totalLargoQtyConvert / totalTargetCombined) * 100
  targetReadyCount: number; // SKU yang sudah siap penuh (>= 100%)
  targetPartialReadyCount: number; // SKU yang siap sebagian (1-99%)
  targetNotReadyCount: number; // SKU yang belum siap (0% / 0 qty convert)

  // Overall Target Fulfillment from Largo Last Qty
  targetSepFulfilledPctLargo: number;
  targetSepFulfilledPctSap: number;
  targetOctFulfilledPctLargo: number;
  targetOctFulfilledPctSap: number;
  totalTargetFulfilledPctLargo: number;
  totalTargetFulfilledPctSap: number;

  // Target status counts
  targetFulfilledCount: number;
  targetPartialCount: number;
  targetLowCount: number;
  targetEmptyCount: number;
  noTargetCount: number;
}
