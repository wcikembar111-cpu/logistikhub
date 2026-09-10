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
  qty: number;
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
}

export interface TriRelasiItem {
  itemCode: string;
  productName: string;
  category: string;
  uom: string;

  // Stock figures
  largoStock: number;
  sapStock: number;
  sapBlockedStock: number;
  sapTrfStock: number;
  sapStockValue: number;

  // Variance (Largo - SAP)
  stockVariance: number;
  absVariance: number;
  matchStatus: MatchStatus;

  // Target figures
  targetSepQty: number;
  targetOctQty: number;
  totalTargetQty: number;

  // Target percentages from Largo stock
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
  totalSapStock: number;
  totalSapBlocked: number;
  totalSapValue: number;
  totalVariance: number;
  
  // Match stats
  matchCount: number;
  varianceCount: number;
  onlyLargoCount: number;
  onlySapCount: number;
  matchRatePct: number;

  // Target stats
  totalTargetSep: number;
  totalTargetOct: number;
  totalTargetCombined: number;

  // Overall Target Fulfillment
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
