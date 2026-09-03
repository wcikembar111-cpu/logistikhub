import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, 
  Copy, 
  Download, 
  Trash2, 
  Plus, 
  RotateCcw, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  Search, 
  Layers, 
  ArrowRight,
  ClipboardPaste,
  Building2,
  Calendar as CalendarIcon,
  Sparkles,
  RefreshCw,
  Eye,
  FileCheck,
  CheckCircle2,
  Hash,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { OutboundLrgSourceItem, OutboundLrgTemplateRow } from '../../types';

// Helper to get formatted dates YYYY-MM-DD
function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCompactDateString(dateStr: string): string {
  return dateStr.replace(/[^0-9]/g, '');
}

// Helper to generate a unique Batch Document Number (Rule: M081-[FromSloc][YYMMDD][4DigitAcak], e.g. M081-8A122609024829)
function generateBatchDocumentNo(fromSloc: string = '8A12', dateStr?: string, prefix: string = 'M081-', existingRandomDigits?: string): string {
  let yy = '';
  let mm = '';
  let dd = '';
  
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    yy = parts[0].slice(-2); // 2-digit year (e.g. 26 from 2026)
    mm = parts[1];
    dd = parts[2];
  } else {
    const d = new Date();
    yy = String(d.getFullYear()).slice(-2); // 2-digit year
    mm = String(d.getMonth() + 1).padStart(2, '0');
    dd = String(d.getDate()).padStart(2, '0');
  }

  const cleanFromSloc = (fromSloc || '8A12').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || '8A12';
  const random4 = (existingRandomDigits && /^\d{4}$/.test(existingRandomDigits))
    ? existingRandomDigits
    : Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit acak (1000 - 9999)
  const cleanPrefix = prefix.trim().endsWith('-') ? prefix.trim() : `${prefix.trim()}-`;
  
  return `${cleanPrefix}${cleanFromSloc}${yy}${mm}${dd}${random4}`;
}

// Sample data according to the user's uploaded image
const SAMPLE_PASTE_DATA = `Item Code\tItem Name\tCategory\tLocation\tLocation Type\tFirst Qty\tLast Qty\tUOM\tQty Convert\tUom Convert\tLPN/Serial Number\tBatch\tVendor Batch\tSLC\tExpired Date\tDestination Code\tQC Cod\tUser Tally\tShelf Life\tSource
FG10447.095.0017.B\tELLIPS HV H.TREATMENT MNBLR SMPL 2 CAPS\tGeneral\tCKB-FG12-AA-01-1A\t\t0\t80\tBLR\t0.167\tCAR\tFGKINO-260731094503998785\t1031956\t1031956\t8A12\t23/07/2029\tLokal - Lokal\tGOOD\tDea Aliftia Firdaushya_ckb\t1056 Days\tINTERNAL
FG10447.095.0018.A\tELLIPS HAIR VITAMIN SMOOTH & SHINY 6S\tGeneral\tCKB-FG12-AA-01-2B\t\t0\t120\tBLR\t0.250\tCAR\tFGKINO-260731094503998786\t1031957\t1031957\t8A12\t15/08/2029\tLokal - Lokal\tGOOD\tDea Aliftia Firdaushya_ckb\t1078 Days\tINTERNAL
FG20112.010.0001.A\tOVALE FACIAL MASK LEMON 10G\tGeneral\tCKB-FG08-BC-02-1A\t\t0\t240\tPCS\t0.500\tCAR\tFGKINO-260731094503998787\t2045112\t2045112\t8A11\t10/11/2028\tLokal - Lokal\tGOOD\tBudi Pratama_ckb\t800 Days\tINTERNAL`;

export function OutboundLrgModule() {
  // 1. TAB SELECTION: '1200' vs '1800'
  const [activeTab, setActiveTab] = useState<'1200' | '1800'>('1200');

  // 2. FORM CONFIGURATION PARAMETERS (To Sloc empty by default for manual entry)
  const [toSloc1200, setToSloc1200] = useState<string>('');
  const [toSloc1800, setToSloc1800] = useState<string>('');
  const [warehouse1200, setWarehouse1200] = useState<string>('Distribusi');
  const [warehouse1800, setWarehouse1800] = useState<string>('Distribusi');
  const [destination1200, setDestination1200] = useState<string>('Sukabumi');
  const [destination1800, setDestination1800] = useState<string>('');
  const [date1200, setDate1200] = useState<string>(getTodayString());
  const [deliveryDate1200, setDeliveryDate1200] = useState<string>(getTodayString());
  const [date1800, setDate1800] = useState<string>(getTodayString());
  const [deliveryDate1800, setDeliveryDate1800] = useState<string>(getTodayString());
  const [docNo1200, setDocNo1200] = useState<string>(() => generateBatchDocumentNo('8A12', getTodayString(), 'M081-'));
  const [docNo1800, setDocNo1800] = useState<string>(() => generateBatchDocumentNo('8A12', getTodayString(), 'M083-'));
  const [type1200, setType1200] = useState<string>('M081');
  const [type1800, setType1800] = useState<string>('M083');
  const [shippingNote, setShippingNote] = useState<string>('-');
  const [costCenter, setCostCenter] = useState<string>('-');
  const [qtySource, setQtySource] = useState<'last_qty' | 'qty_convert'>('last_qty');
  const [fromSlocOverride, setFromSlocOverride] = useState<string>(''); // if empty, take from row SLC

  // 3. PASTE / UPLOAD & PARSED STATE
  const [rawPastedText, setRawPastedText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<OutboundLrgTemplateRow[]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  // Active configurations based on current Tab
  const currentToPlant = activeTab;
  const currentToSloc = activeTab === '1200' ? toSloc1200 : toSloc1800;
  const currentWarehouse = activeTab === '1200' ? warehouse1200 : warehouse1800;
  const currentDestination = activeTab === '1200' ? destination1200 : (destination1800 || toSloc1800);
  const currentDate = activeTab === '1200' ? date1200 : date1800;
  const currentDeliveryDate = activeTab === '1200' ? deliveryDate1200 : deliveryDate1800;
  const currentDocNo = activeTab === '1200' ? docNo1200 : docNo1800;
  const currentType = activeTab === '1200' ? type1200 : type1800;
  const currentPrefix = activeTab === '1200' ? 'M081-' : 'M083-';

  const setCurrentDocNo = (val: string) => {
    if (activeTab === '1200') setDocNo1200(val);
    else setDocNo1800(val);
  };

  const setCurrentType = (val: string) => {
    if (activeTab === '1200') setType1200(val);
    else setType1800(val);
  };

  // Auto update No Document when From Sloc is modified
  const handleFromSlocChange = (val: string) => {
    const upper = val.toUpperCase();
    setFromSlocOverride(upper);
    const effectiveSloc = upper.trim() || (parsedRows[0]?.from_sloc) || '8A12';

    const rand1200 = docNo1200.slice(-4);
    const rand1800 = docNo1800.slice(-4);

    setDocNo1200(generateBatchDocumentNo(effectiveSloc, date1200, 'M081-', rand1200));
    setDocNo1800(generateBatchDocumentNo(effectiveSloc, date1800, 'M083-', rand1800));
  };

  // Auto update No Document when Date is modified
  const handleDateChange = (val: string) => {
    const effectiveSloc = fromSlocOverride.trim() || (parsedRows[0]?.from_sloc) || '8A12';
    if (activeTab === '1200') {
      setDate1200(val);
      const rand1200 = docNo1200.slice(-4);
      setDocNo1200(generateBatchDocumentNo(effectiveSloc, val, 'M081-', rand1200));
    } else {
      setDate1800(val);
      const rand1800 = docNo1800.slice(-4);
      setDocNo1800(generateBatchDocumentNo(effectiveSloc, val, 'M083-', rand1800));
    }
  };

  const handleGenerateNewDocNo = (slocHint?: string) => {
    const fromSloc = fromSlocOverride.trim() || slocHint || (parsedRows[0]?.from_sloc) || '8A12';
    const prefix = activeTab === '1200' ? 'M081-' : 'M083-';
    const newDoc = generateBatchDocumentNo(fromSloc, currentDate, prefix);
    setCurrentDocNo(newDoc);
    return newDoc;
  };

  // Function to build a Template Row
  const buildTemplateRow = (source: OutboundLrgSourceItem, index: number, total: number, docNumberOverride?: string): OutboundLrgTemplateRow => {
    const fromSloc = fromSlocOverride.trim() || source.sloc?.trim() || '8A12';
    
    // Type is strictly M081 (for 1200) or M083 (for 1800)
    const generatedType = currentType.trim() || (activeTab === '1200' ? 'M081' : 'M083');
    
    // No Document: same across all rows in the batch
    const defaultPrefix = activeTab === '1200' ? 'M081-' : 'M083-';
    const noDoc = docNumberOverride || currentDocNo || defaultPrefix;
    
    // Destination: for 1800 it defaults to to_sloc
    const dest = activeTab === '1200' ? destination1200 : (destination1800 || currentToSloc);

    // Determine Qty
    let qtyVal: number | string = '';
    if (qtySource === 'last_qty') {
      qtyVal = source.last_qty !== undefined && source.last_qty !== null ? source.last_qty : (source.first_qty ?? '');
    } else {
      qtyVal = source.qty_convert !== undefined && source.qty_convert !== null ? source.qty_convert : (source.last_qty ?? '');
    }

    // Determine UOM CONVERT
    const uomConvertVal = source.uom_convert?.trim() || source.uom?.trim() || 'CAR';

    return {
      id: `outbound-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      no_document: noDoc,
      date: currentDate,
      delivery_date: currentDeliveryDate,
      type: generatedType,
      destination: dest,
      shipping_note: shippingNote.trim() ? shippingNote : '-',
      material_id: source.item_code?.trim() || '',
      qty: qtyVal,
      warehouse: currentWarehouse,
      to_plant: currentToPlant,
      to_sloc: currentToSloc,
      from_sloc: fromSloc,
      cost_center: costCenter.trim() ? costCenter : '-',
      uom_convert: uomConvertVal,
      item_name: source.item_name,
      batch: source.batch,
      lpn: source.lpn_serial,
      expired_date: source.expired_date
    };
  };

  // Parser function for pasted TSV / CSV text
  const parsePastedTable = (text: string, batchDocNo?: string) => {
    if (!text || !text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return;

    // Detect delimiter (tab vs comma vs semicolon)
    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes('\t')) {
      delimiter = '\t';
    } else if (firstLine.includes(';') && !firstLine.includes(',')) {
      delimiter = ';';
    } else if (firstLine.includes(',')) {
      delimiter = ',';
    }

    // Split headers
    const headerCells = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
    
    // Check if first row is header
    const hasHeader = headerCells.some(h => 
      h.includes('item') || h.includes('code') || h.includes('material') || 
      h.includes('batch') || h.includes('qty') || h.includes('slc') || h.includes('location')
    );

    const startRowIdx = hasHeader ? 1 : 0;

    // Map column indices
    let colItemCode = -1;
    let colItemName = -1;
    let colCategory = -1;
    let colLocation = -1;
    let colLocationType = -1;
    let colFirstQty = -1;
    let colLastQty = -1;
    let colUom = -1;
    let colQtyConvert = -1;
    let colUomConvert = -1;
    let colLpn = -1;
    let colBatch = -1;
    let colVendorBatch = -1;
    let colSloc = -1;
    let colExpiredDate = -1;
    let colDestinationCode = -1;
    let colQcCode = -1;
    let colUserTally = -1;
    let colShelfLife = -1;
    let colSource = -1;

    if (hasHeader) {
      headerCells.forEach((h, idx) => {
        if (h === 'item code' || h === 'item_code' || h === 'sku' || h === 'material id' || h === 'material') colItemCode = idx;
        else if (h.includes('item name') || h.includes('nama barang') || h.includes('description')) colItemName = idx;
        else if (h === 'category' || h === 'kategori') colCategory = idx;
        else if (h === 'location' || h === 'lokasi') colLocation = idx;
        else if (h.includes('location type') || h.includes('tipe lokasi')) colLocationType = idx;
        else if (h.includes('first qty') || h.includes('qty awal')) colFirstQty = idx;
        else if (h.includes('last qty') || h.includes('qty akhir') || h === 'qty') colLastQty = idx;
        else if (h === 'uom' || h.startsWith('uo') || h === 'satuan') colUom = idx;
        else if (h.includes('qty convert') || h.includes('qty konversi')) colQtyConvert = idx;
        else if (h.includes('uom convert') || h.includes('uom conver') || h.includes('satuan konversi')) colUomConvert = idx;
        else if (h.includes('lpn') || h.includes('serial number') || h.includes('sn')) colLpn = idx;
        else if (h === 'batch' || h === 'no batch' || h === 'lot') colBatch = idx;
        else if (h.includes('vendor batch')) colVendorBatch = idx;
        else if (h === 'slc' || h === 'sloc' || h === 'storage location' || h.includes('from sloc')) colSloc = idx;
        else if (h.includes('expired') || h.includes('ed') || h.includes('kadaluarsa')) colExpiredDate = idx;
        else if (h.includes('destination code') || h.includes('tujuan')) colDestinationCode = idx;
        else if (h.includes('qc cod') || h.includes('qc code') || h.includes('status qc')) colQcCode = idx;
        else if (h.includes('user tally') || h.includes('tally')) colUserTally = idx;
        else if (h.includes('shelf life')) colShelfLife = idx;
        else if (h === 'source' || h === 'sumber') colSource = idx;
      });
    }

    // Default column fallback indices if headers were not named standardly
    if (colItemCode === -1) colItemCode = 0;
    if (colItemName === -1) colItemName = 1;
    if (colLastQty === -1) colLastQty = 6;
    if (colUom === -1) colUom = 7;
    if (colQtyConvert === -1) colQtyConvert = 8;
    if (colUomConvert === -1) colUomConvert = 9;
    if (colLpn === -1) colLpn = 10;
    if (colBatch === -1) colBatch = 11;
    if (colVendorBatch === -1) colVendorBatch = 12;
    if (colSloc === -1) colSloc = 13;
    if (colExpiredDate === -1) colExpiredDate = 14;

    const parsedSourceItems: OutboundLrgSourceItem[] = [];

    for (let i = startRowIdx; i < lines.length; i++) {
      const rowCols = lines[i].split(delimiter).map(c => c.trim());
      if (rowCols.length < 2 || !rowCols[colItemCode]) continue;

      const itemCode = rowCols[colItemCode] || '';
      const itemName = colItemName !== -1 ? rowCols[colItemName] : '';
      const lastQtyParsed = colLastQty !== -1 && rowCols[colLastQty] ? parseFloat(rowCols[colLastQty].replace(/,/g, '')) : 0;
      const firstQtyParsed = colFirstQty !== -1 && rowCols[colFirstQty] ? parseFloat(rowCols[colFirstQty].replace(/,/g, '')) : 0;
      const qtyConvertParsed = colQtyConvert !== -1 && rowCols[colQtyConvert] ? parseFloat(rowCols[colQtyConvert].replace(/,/g, '')) : 0;
      const uom = colUom !== -1 ? rowCols[colUom] : 'BLR';
      const uomConvert = colUomConvert !== -1 ? rowCols[colUomConvert] : 'CAR';
      const lpn = colLpn !== -1 ? rowCols[colLpn] : '';
      const batch = colBatch !== -1 ? rowCols[colBatch] : '';
      const sloc = colSloc !== -1 ? rowCols[colSloc] : '8A12';
      const expiredDate = colExpiredDate !== -1 ? rowCols[colExpiredDate] : '';

      parsedSourceItems.push({
        item_code: itemCode,
        item_name: itemName,
        last_qty: lastQtyParsed,
        first_qty: firstQtyParsed,
        qty_convert: qtyConvertParsed,
        uom: uom,
        uom_convert: uomConvert,
        lpn_serial: lpn,
        batch: batch,
        sloc: sloc,
        expired_date: expiredDate
      });
    }

    // Group and SUMIF by item_code (Material ID) to eliminate duplicates
    const aggregatedMap = new Map<string, OutboundLrgSourceItem>();

    for (const item of parsedSourceItems) {
      const code = (item.item_code || '').trim();
      if (!code) continue;

      if (!aggregatedMap.has(code)) {
        aggregatedMap.set(code, {
          ...item,
          last_qty: item.last_qty || 0,
          first_qty: item.first_qty || 0,
          qty_convert: item.qty_convert || 0
        });
      } else {
        const existing = aggregatedMap.get(code)!;
        const newLastQty = (existing.last_qty || 0) + (item.last_qty || 0);
        const newFirstQty = (existing.first_qty || 0) + (item.first_qty || 0);
        const newQtyConvert = (existing.qty_convert || 0) + (item.qty_convert || 0);

        // Round to 4 decimal places to prevent float precision issues
        existing.last_qty = Math.round(newLastQty * 10000) / 10000;
        existing.first_qty = Math.round(newFirstQty * 10000) / 10000;
        existing.qty_convert = Math.round(newQtyConvert * 10000) / 10000;

        if (!existing.item_name && item.item_name) existing.item_name = item.item_name;
        if (!existing.uom && item.uom) existing.uom = item.uom;
        if (!existing.uom_convert && item.uom_convert) existing.uom_convert = item.uom_convert;
        if (!existing.sloc && item.sloc) existing.sloc = item.sloc;
      }
    }

    const uniqueSourceItems = Array.from(aggregatedMap.values());

    const effectiveDocNo = batchDocNo || currentDocNo;

    // Convert aggregated source items to the 14-column template rows (No duplicates, SUMIF qty)
    const newTemplateRows = uniqueSourceItems.map((item, idx) => 
      buildTemplateRow(item, idx, uniqueSourceItems.length, effectiveDocNo)
    );

    setParsedRows(newTemplateRows);
  };

  // Handle when parameters change (e.g. user changes toSloc, destination, date, or switches tab)
  const handleRegenerateRows = (docOverride?: string) => {
    const effectiveDocNo = docOverride || currentDocNo;
    if (rawPastedText.trim()) {
      parsePastedTable(rawPastedText, effectiveDocNo);
    } else if (parsedRows.length > 0) {
      // Re-apply parameters to existing rows
      const updated = parsedRows.map((r) => {
        const fromSloc = fromSlocOverride.trim() || r.from_sloc || '8A12';
        const generatedType = currentType.trim() || (activeTab === '1200' ? 'M081' : 'M083');
        const dest = activeTab === '1200' ? destination1200 : (destination1800 || currentToSloc);

        return {
          ...r,
          to_plant: currentToPlant,
          to_sloc: currentToSloc,
          warehouse: currentWarehouse,
          destination: dest,
          date: currentDate,
          delivery_date: currentDeliveryDate,
          from_sloc: fromSloc,
          type: generatedType,
          no_document: effectiveDocNo,
          shipping_note: shippingNote.trim() ? shippingNote : '-',
          cost_center: costCenter.trim() ? costCenter : '-'
        };
      });
      setParsedRows(updated);
    }
  };

  // Re-generate rows when switching tab or changing critical parameters
  useEffect(() => {
    if (rawPastedText.trim()) {
      parsePastedTable(rawPastedText);
    }
  }, [activeTab, toSloc1200, toSloc1800, warehouse1200, warehouse1800, destination1200, destination1800, date1200, date1800, deliveryDate1200, deliveryDate1800, docNo1200, docNo1800, type1200, type1800, shippingNote, costCenter, qtySource, fromSlocOverride]);

  // Load sample data with fresh distinct No Document
  const handleLoadSample = () => {
    const newDoc = handleGenerateNewDocNo('8A12');
    setRawPastedText(SAMPLE_PASTE_DATA);
    parsePastedTable(SAMPLE_PASTE_DATA, newDoc);
  };

  // Clear data
  const handleClear = () => {
    setRawPastedText('');
    setParsedRows([]);
  };

  // Handle Paste from Clipboard API (generates a new unique No Document for new batch)
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const slocMatch = text.match(/\b(8[A-Z0-9]{3})\b/i);
        const guessedSloc = slocMatch ? slocMatch[1].toUpperCase() : '8A12';
        const newDoc = handleGenerateNewDocNo(guessedSloc);
        setRawPastedText(text);
        parsePastedTable(text, newDoc);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  // Handle Excel File Upload (generates a new unique No Document for new batch)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const tsv = XLSX.utils.sheet_to_csv(ws, { FS: '\t' });
        const slocMatch = tsv.match(/\b(8[A-Z0-9]{3})\b/i);
        const guessedSloc = slocMatch ? slocMatch[1].toUpperCase() : '8A12';
        const newDoc = handleGenerateNewDocNo(guessedSloc);
        setRawPastedText(tsv);
        parsePastedTable(tsv, newDoc);
      } catch (error) {
        console.error('Error reading excel file:', error);
      }
    };
    reader.readAsBinaryString(file);
    // Reset file input so user can re-select the same file to process again with new doc number
    e.target.value = '';
  };

  // Copy Result Table to Clipboard as TSV (ready to paste directly into Excel / SAP)
  const handleCopyTable = () => {
    if (parsedRows.length === 0) return;

    const headers = [
      'No Document',
      'Date',
      'Delivery Date',
      'Type',
      'Destination',
      'Shipping Note',
      'Material ID',
      'Qty',
      'Warehouse',
      'To Plant',
      'To Sloc',
      'From Sloc',
      'Cost Center',
      'UOM CONVERT'
    ];

    const rows = parsedRows.map(r => [
      r.no_document,
      r.date,
      r.delivery_date,
      r.type,
      r.destination,
      r.shipping_note,
      r.material_id,
      r.qty,
      r.warehouse,
      r.to_plant,
      r.to_sloc,
      r.from_sloc,
      r.cost_center,
      r.uom_convert
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  // Export to formatted Excel file (.xlsx) with styled blue header
  const handleExportExcel = () => {
    if (parsedRows.length === 0) return;

    const headers = [
      'No Document',
      'Date',
      'Delivery Date',
      'Type',
      'Destination',
      'Shipping Note',
      'Material ID',
      'Qty',
      'Warehouse',
      'To Plant',
      'To Sloc',
      'From Sloc',
      'Cost Center',
      'UOM CONVERT'
    ];

    const data = parsedRows.map(r => ({
      'No Document': r.no_document,
      'Date': r.date,
      'Delivery Date': r.delivery_date,
      'Type': r.type,
      'Destination': r.destination,
      'Shipping Note': r.shipping_note,
      'Material ID': r.material_id,
      'Qty': Number(r.qty) || r.qty,
      'Warehouse': r.warehouse,
      'To Plant': r.to_plant,
      'To Sloc': r.to_sloc,
      'From Sloc': r.from_sloc,
      'Cost Center': r.cost_center,
      'UOM CONVERT': r.uom_convert
    }));

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });

    // Set column widths
    ws['!cols'] = [
      { wch: 28 }, // No Document
      { wch: 14 }, // Date
      { wch: 14 }, // Delivery Date
      { wch: 28 }, // Type
      { wch: 18 }, // Destination
      { wch: 20 }, // Shipping Note
      { wch: 22 }, // Material ID
      { wch: 10 }, // Qty
      { wch: 14 }, // Warehouse
      { wch: 10 }, // To Plant
      { wch: 10 }, // To Sloc
      { wch: 10 }, // From Sloc
      { wch: 14 }, // Cost Center
      { wch: 14 }  // UOM CONVERT
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Outbound_${activeTab}`);
    
    const fileName = `OutboundLRG_${activeTab}_${currentDate.replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Filter rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return parsedRows;
    const q = searchQuery.toLowerCase();
    return parsedRows.filter(r => 
      r.material_id.toLowerCase().includes(q) ||
      (r.item_name && r.item_name.toLowerCase().includes(q)) ||
      r.from_sloc.toLowerCase().includes(q) ||
      r.to_sloc.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.no_document.toLowerCase().includes(q) ||
      (r.batch && r.batch.toLowerCase().includes(q))
    );
  }, [parsedRows, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* 1. TOP HEADER & TAB BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Truck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">OutboundLRG</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Template Transfer SAP
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Konversi data Excel LARGO menjadi 14 kolom template SAP Outbound otomatis
              </p>
            </div>
          </div>

          {/* TWO MAIN TABS: "Ke 1200" vs "Ke 1800" */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start lg:self-center">
            <button
              type="button"
              onClick={() => setActiveTab('1200')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === '1200'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building2 size={15} />
              <span>1. Ke 1200</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${activeTab === '1200' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                M081 • Sukabumi
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('1800')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === '1800'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building2 size={15} />
              <span>2. Ke 1800</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${activeTab === '1800' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                M083 • Sloc
              </span>
            </button>
          </div>
        </div>

        {/* 2. PARAMETERS / ROLE CONFIGURATION BAR */}
        <div className="mt-5 bg-slate-50/80 rounded-xl border border-slate-200/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Parameter Transfer ke {activeTab}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              *Role aturan otomatis diterapkan ke seluruh baris
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* To Plant */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">To Plant</label>
              <input
                type="text"
                value={currentToPlant}
                disabled
                className="w-full bg-slate-200/70 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 cursor-not-allowed"
              />
            </div>

            {/* To Sloc (Ketik Manual) */}
            <div>
              <label className="block text-[11px] font-bold text-blue-700 mb-1">
                To Sloc (Ketik Manual) *
              </label>
              <input
                type="text"
                value={activeTab === '1200' ? toSloc1200 : toSloc1800}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  if (activeTab === '1200') {
                    setToSloc1200(val);
                  } else {
                    setToSloc1800(val);
                    setDestination1800(val); // Destination in 1800 matches To Sloc
                  }
                }}
                placeholder={activeTab === '1200' ? 'Ketik To Sloc (misal: 8A11)...' : 'Ketik To Sloc (misal: 8A18)...'}
                className="w-full bg-white border border-blue-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 shadow-2xs uppercase placeholder:text-slate-400 placeholder:normal-case"
              />
            </div>

            {/* From Sloc (Auto from Row SLC / Override) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                From Sloc
              </label>
              <input
                type="text"
                value={fromSlocOverride}
                onChange={(e) => handleFromSlocChange(e.target.value)}
                placeholder="Auto dari SLC data"
                className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs uppercase"
                title="Ketik untuk mengubah From Sloc & No Document otomatis diperbarui"
              />
            </div>

            {/* Warehouse */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Warehouse</label>
              <input
                type="text"
                value={activeTab === '1200' ? warehouse1200 : warehouse1800}
                onChange={(e) => {
                  if (activeTab === '1200') setWarehouse1200(e.target.value);
                  else setWarehouse1800(e.target.value);
                }}
                className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs"
              />
            </div>

            {/* Destination */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Destination {activeTab === '1800' && <span className="text-blue-600">(= To Sloc)</span>}
              </label>
              <input
                type="text"
                value={activeTab === '1200' ? destination1200 : destination1800}
                onChange={(e) => {
                  if (activeTab === '1200') setDestination1200(e.target.value);
                  else setDestination1800(e.target.value);
                }}
                placeholder={activeTab === '1800' ? (toSloc1800 || 'Ketik To Sloc...') : 'Sukabumi'}
                className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs"
              />
            </div>

            {/* Date (Today) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={activeTab === '1200' ? date1200 : date1800}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 shadow-2xs"
              />
            </div>

            {/* Delivery Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Delivery Date</label>
              <input
                type="date"
                value={activeTab === '1200' ? deliveryDate1200 : deliveryDate1800}
                onChange={(e) => {
                  if (activeTab === '1200') setDeliveryDate1200(e.target.value);
                  else setDeliveryDate1800(e.target.value);
                }}
                className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 shadow-2xs"
              />
            </div>

            {/* No Document Batch */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-blue-700">No Document (Batch)</label>
                <button
                  type="button"
                  onClick={() => {
                    const newDoc = handleGenerateNewDocNo();
                    handleRegenerateRows(newDoc);
                  }}
                  title="Generate Nomor Dokumen Baru untuk Batch Ini"
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <RefreshCw size={10} />
                  <span>Baru</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={currentDocNo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentDocNo(val);
                    handleRegenerateRows(val);
                  }}
                  placeholder={`${currentPrefix}...`}
                  className="w-full bg-white border border-blue-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 shadow-2xs font-mono"
                />
              </div>
              <span className="text-[9px] text-slate-500 italic block mt-0.5">{currentPrefix}[SLC][YYMMDD][4Digit]</span>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[11px] font-bold text-blue-700 mb-1">Type</label>
              <input
                type="text"
                value={currentType}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setCurrentType(val);
                }}
                placeholder={activeTab === '1200' ? 'M081' : 'M083'}
                className="w-full bg-white border border-blue-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 shadow-2xs uppercase font-mono"
              />
              <span className="text-[9px] text-slate-500 italic block mt-0.5">{activeTab === '1200' ? 'Default M081' : 'Default M083'}</span>
            </div>

            {/* Qty Source Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Sumber Kolom Qty</label>
              <select
                value={qtySource}
                onChange={(e) => setQtySource(e.target.value as any)}
                className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs"
              >
                <option value="last_qty">Last Qty (Standar)</option>
                <option value="qty_convert">Qty Convert (Konversi)</option>
              </select>
            </div>

            {/* Cost Center */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Cost Center</label>
              <input
                type="text"
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                placeholder="-"
                className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs font-mono"
              />
            </div>

            {/* Shipping Note */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Shipping Note</label>
              <input
                type="text"
                value={shippingNote}
                onChange={(e) => setShippingNote(e.target.value)}
                placeholder="-"
                className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs"
              />
            </div>
          </div>

          {/* Rule Preview */}
          <div className="mt-3 pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-blue-700">No Document:</span>
                <code className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded border border-blue-200 font-mono font-bold text-[11px]">
                  {currentDocNo}
                </code>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-blue-700">Type:</span>
                <code className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded border border-blue-200 font-mono font-bold text-[11px]">
                  {currentType}
                </code>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-blue-700">Destination:</span>
                <code className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded border border-blue-200 font-mono font-bold text-[11px]">
                  {currentDestination}
                </code>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700">Shipping Note:</span>
                <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                  {shippingNote || '-'}
                </code>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700">Cost Center:</span>
                <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                  {costCenter || '-'}
                </code>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRegenerateRows()}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Refresh Penerapan Nilai</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. PASTE EXCEL INPUT & UPLOAD SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <ClipboardPaste size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Form Paste Data dari Excel / LARGO
            </h2>
          </div>
          
          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ClipboardPaste size={14} />
              <span>Tempel Clipboard</span>
            </button>

            <label className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer">
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>Upload File (.xlsx/.csv)</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv, .tsv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Isi contoh baris data persis seperti gambar yang Anda unggah"
            >
              <Sparkles size={14} className="text-amber-600" />
              <span>Data Sampel Gambar</span>
            </button>

            {parsedRows.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Bersihkan</span>
              </button>
            )}
          </div>
        </div>

        {/* Textarea for raw paste */}
        <div className="relative">
          <textarea
            rows={4}
            value={rawPastedText}
            onChange={(e) => {
              setRawPastedText(e.target.value);
              parsePastedTable(e.target.value);
            }}
            placeholder={`Copy seluruh baris dari Excel (Item Code, Item Name, Category, Location, First Qty, Last Qty, UOM, Qty Convert, Uom Convert, LPN, Batch, SLC, Expired Date, dll) lalu PASTE (Ctrl+V) di sini...`}
            className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3 text-xs font-mono text-slate-800 placeholder-slate-400 transition-all resize-y"
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span className="text-blue-700 font-medium">
            *Auto SUMIF & Deduplikasi: Jika Material ID sama, Qty otomatis dijumlahkan dan baris digabung
          </span>
          <span className="font-semibold text-slate-700">{parsedRows.length} Material Unik</span>
        </div>
      </div>

      {/* 4. RESULT TABLE: 14 TEMPLATE COLUMNS (Sesuai Gambar 1) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Top Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h2 className="text-sm font-bold text-slate-900">
              Hasil Template SAP Outbound (14 Kolom) - Ke {activeTab}
            </h2>
            {parsedRows.length > 0 && (
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                {parsedRows.length} Baris
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input in Result */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Material / Sloc / Batch..."
                className="bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 w-44 sm:w-56 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            {/* Copy Table Button */}
            <button
              type="button"
              onClick={handleCopyTable}
              disabled={parsedRows.length === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                isCopied 
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
              <span>{isCopied ? 'Tersalin ke Clipboard!' : 'Salin Tabel'}</span>
            </button>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={parsedRows.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* 14 COLUMNS TEMPLATE TABLE */}
        <div className="overflow-x-auto max-h-[560px]">
          <table className="w-full text-left border-collapse text-xs">
            {/* EXACT HEADER COLOR & STYLE FROM IMAGE 1 */}
            <thead className="sticky top-0 z-10 bg-[#93b5ee] text-slate-950 font-bold border-b-2 border-blue-400 shadow-2xs select-none">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap text-center border-r border-blue-300/60">No</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold border-r border-blue-300/60">No Document</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold border-r border-blue-300/60">Date</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold border-r border-blue-300/60">Delivery Date</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold border-r border-blue-300/60">Type</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold border-r border-blue-300/60">Destination</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold border-r border-blue-300/60">Shipping Note</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold border-r border-blue-300/60">Material ID</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold text-right border-r border-blue-300/60">Qty</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold border-r border-blue-300/60">Warehouse</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold border-r border-blue-300/60">To Plant</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold border-r border-blue-300/60">To Sloc</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold border-r border-blue-300/60">From Sloc</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold border-r border-blue-300/60">Cost Center</th>
                <th className="py-2.5 px-3 whitespace-nowrap font-extrabold">UOM CONVERT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 font-normal text-slate-800">
              {filteredRows.length > 0 ? (
                filteredRows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                      {row.no_document}
                    </td>
                    <td className="py-2 px-3 font-medium border-r border-slate-200 whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-2 px-3 font-medium border-r border-slate-200 whitespace-nowrap">
                      {row.delivery_date}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-800 border-r border-slate-200 whitespace-nowrap bg-blue-50/20">
                      {row.type}
                    </td>
                    <td className="py-2 px-3 font-medium border-r border-slate-200 whitespace-nowrap">
                      {row.destination}
                    </td>
                    <td className="py-2 px-3 text-slate-500 border-r border-slate-200 whitespace-nowrap">
                      {row.shipping_note || '-'}
                    </td>
                    <td className="py-2 px-3 font-mono font-black text-slate-900 border-r border-slate-200 whitespace-nowrap">
                      <div>{row.material_id}</div>
                      {row.item_name && (
                        <div className="text-[10px] text-slate-400 font-sans font-normal truncate max-w-xs" title={row.item_name}>
                          {row.item_name}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 font-bold font-mono text-right text-slate-900 border-r border-slate-200 whitespace-nowrap">
                      {row.qty}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">
                      {row.warehouse}
                    </td>
                    <td className="py-2 px-3 font-bold text-blue-700 border-r border-slate-200 whitespace-nowrap">
                      {row.to_plant}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap bg-amber-50/30">
                      {row.to_sloc}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap bg-slate-100/50">
                      {row.from_sloc}
                    </td>
                    <td className="py-2 px-3 text-slate-400 border-r border-slate-200 whitespace-nowrap">
                      {row.cost_center || '-'}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap bg-blue-50/30">
                      {row.uom_convert}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <FileSpreadsheet size={24} />
                      </div>
                      <p className="text-xs font-bold text-slate-600">Belum ada data yang dimasukkan</p>
                      <p className="text-[11px] text-slate-400">
                        Silakan copy data tabel dari Excel lalu tempel pada form di atas, atau klik tombol <b>"Data Sampel Gambar"</b> untuk uji coba.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Instruction bar */}
        {filteredRows.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>Menampilkan <b>{filteredRows.length}</b> dari total {parsedRows.length} baris data</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-200 inline-block border border-blue-300" /> Header Biru: Format SAP Asli
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-200 inline-block border border-amber-300" /> To Sloc: Input Manual
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
