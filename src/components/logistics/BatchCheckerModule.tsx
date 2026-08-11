import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { RefreshCw, Upload, Download, Search, CheckCircle, AlertTriangle, ArrowRightLeft, FileSpreadsheet, XCircle, Info } from 'lucide-react';
import { compareLargoAndSap, CompareResultRow } from '../../utils/logisticsCalculations';
import { useNotification } from '../../context/NotificationContext';

export function BatchCheckerModule() {
  const { showToast } = useNotification();

  const [largoRows, setLargoRows] = useState<any[]>([]);
  const [sapRows, setSapRows] = useState<any[]>([]);
  const [compareResults, setCompareResults] = useState<CompareResultRow[]>([]);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleLargoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        const mapped = data.map(r => ({
          sloc: String(r['SLOC'] || r['Storage Location'] || r['Sloc'] || '').trim(),
          item: String(r['Item'] || r['Material'] || r['Item Code'] || '').trim(),
          desc: String(r['Description'] || r['Material Description'] || r['Item Name'] || '').trim(),
          batch: String(r['Batch'] || r['Batch Number'] || '').trim(),
          qty: r['Qty'] || r['Quantity'] || r['Stok'] || 0
        })).filter(r => r.item && r.batch);

        setLargoRows(mapped);
        showToast('File LARGO Dimuat', `Berhasil membaca ${mapped.length} baris data LARGO`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Gagal', 'Gagal membaca file Excel LARGO', 'danger');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSapFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        const mapped = data.map(r => ({
          sloc: String(r['SLOC'] || r['Storage Location'] || r['Sloc'] || '').trim(),
          item: String(r['Item'] || r['Material'] || r['Item Code'] || '').trim(),
          desc: String(r['Description'] || r['Material Description'] || r['Item Name'] || '').trim(),
          batch: String(r['Batch'] || r['Batch Number'] || '').trim(),
          unrestricted: r['Unrestricted'] || 0,
          blocked: r['Blocked'] || 0,
          qty: r['Qty'] || r['Quantity']
        })).filter(r => r.item && r.batch);

        setSapRows(mapped);
        showToast('File SAP Dimuat', `Berhasil membaca ${mapped.length} baris data SAP`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Gagal', 'Gagal membaca file Excel SAP', 'danger');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleRunComparison = () => {
    if (largoRows.length === 0 || sapRows.length === 0) {
      showToast('Perhatian', 'Harap upload file Excel LARGO dan SAP terlebih dahulu', 'info');
      return;
    }

    const results = compareLargoAndSap(largoRows, sapRows);
    setCompareResults(results);
    showToast('Rekonsiliasi Selesai', `Perbandingan selesai (${results.length} item terekonsiliasi)`, 'success');
  };

  const handleExportComparison = () => {
    if (compareResults.length === 0) return;

    const exportData = compareResults.map(r => ({
      No: r.no,
      SLOC: r.sloc,
      'Item Code': r.item,
      'Deskripsi Material': r.desc,
      'Batch LARGO': r.bLargo,
      'Batch SAP': r.bSap,
      'Qty LARGO': r.qLargo,
      'Qty SAP': r.qSap,
      'Selisih (SAP - LARGO)': r.diff,
      Status: r.status,
      Rekomendasi: r.rec
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekonsiliasi Batch');
    XLSX.writeFile(wb, `Hasil_Batch_Checker_${Date.now()}.xlsx`);
    showToast('Export Sukses', 'Hasil perbandingan batch berhasil diunduh ke Excel', 'success');
  };

  const filteredResults = compareResults.filter(r => {
    const matchSearch =
      r.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.sloc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.bLargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.bSap.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    if (filterStatus === 'MATCH') return r.status === 'MATCH';
    if (filterStatus === 'QTY_DIFF') return r.status === 'QTY_DIFF';
    if (filterStatus === 'REPLACE') return r.status === 'REPLACE';
    if (filterStatus === 'NO_CANDIDATE') return r.status === 'NO_CANDIDATE';
    if (filterStatus === 'LARGO_ONLY') return r.status === 'LARGO_ONLY';

    return true;
  });

  const countByStatus = (st: string) => compareResults.filter(r => r.status === st).length;

  return (
    <div className="space-y-5">
      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Largo Box */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">1. Data Excel LARGO ({largoRows.length} baris)</span>
            <label className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1 shadow-xs">
              <Upload size={13} />
              <span>Upload LARGO</span>
              <input type="file" accept=".xlsx, .xls" onChange={handleLargoFileUpload} className="hidden" />
            </label>
          </div>
          <p className="text-[11px] text-slate-500 m-0">Kolom wajib: <code>SLOC</code>, <code>Item</code>, <code>Batch</code>, <code>Qty</code></p>
        </div>

        {/* SAP Box */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">2. Data Excel SAP MB52 ({sapRows.length} baris)</span>
            <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1 shadow-xs">
              <Upload size={13} />
              <span>Upload SAP</span>
              <input type="file" accept=".xlsx, .xls" onChange={handleSapFileUpload} className="hidden" />
            </label>
          </div>
          <p className="text-[11px] text-slate-500 m-0">Kolom wajib: <code>SLOC</code>, <code>Item</code>, <code>Batch</code>, <code>Unrestricted</code>/<code>Qty</code></p>
        </div>
      </div>

      {/* Compare Trigger Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleRunComparison}
          disabled={largoRows.length === 0 || sapRows.length === 0}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white text-xs font-bold rounded-2xl shadow-md disabled:opacity-40 transition-all hover:scale-105 cursor-pointer flex items-center gap-2"
        >
          <ArrowRightLeft size={16} />
          <span>Bandingkan LARGO vs SAP & Pemetaan Batch</span>
        </button>
      </div>

      {/* Comparison Output */}
      {compareResults.length > 0 && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Status Filter Badges */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap text-xs font-bold">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
              >
                Semua ({compareResults.length})
              </button>
              <button
                onClick={() => setFilterStatus('MATCH')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${filterStatus === 'MATCH' ? 'bg-emerald-600 text-white' : 'text-emerald-700'}`}
              >
                MATCH ({countByStatus('MATCH')})
              </button>
              <button
                onClick={() => setFilterStatus('REPLACE')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${filterStatus === 'REPLACE' ? 'bg-indigo-600 text-white' : 'text-indigo-700'}`}
              >
                REPLACE ({countByStatus('REPLACE')})
              </button>
              <button
                onClick={() => setFilterStatus('QTY_DIFF')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${filterStatus === 'QTY_DIFF' ? 'bg-amber-500 text-white' : 'text-amber-700'}`}
              >
                QTY DIFF ({countByStatus('QTY_DIFF')})
              </button>
              <button
                onClick={() => setFilterStatus('NO_CANDIDATE')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${filterStatus === 'NO_CANDIDATE' ? 'bg-red-600 text-white' : 'text-red-700'}`}
              >
                NO CANDIDATE ({countByStatus('NO_CANDIDATE')})
              </button>
              <button
                onClick={() => setFilterStatus('LARGO_ONLY')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${filterStatus === 'LARGO_ONLY' ? 'bg-slate-700 text-white' : 'text-slate-700'}`}
              >
                LARGO ONLY ({countByStatus('LARGO_ONLY')})
              </button>
            </div>

            {/* Export */}
            <button
              onClick={handleExportComparison}
              className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              <span>Export Hasil Excel</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[320px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                <tr>
                  <th className="p-2 border-b border-slate-200">#</th>
                  <th className="p-2 border-b border-slate-200">SLOC</th>
                  <th className="p-2 border-b border-slate-200">Item</th>
                  <th className="p-2 border-b border-slate-200">Deskripsi</th>
                  <th className="p-2 border-b border-slate-200">Batch LARGO</th>
                  <th className="p-2 border-b border-slate-200">Batch SAP</th>
                  <th className="p-2 border-b border-slate-200 text-right">Qty LARGO</th>
                  <th className="p-2 border-b border-slate-200 text-right">Qty SAP</th>
                  <th className="p-2 border-b border-slate-200">Status</th>
                  <th className="p-2 border-b border-slate-200">Rekomendasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredResults.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 text-slate-400 font-mono text-[11px]">{r.no}</td>
                    <td className="p-2 font-bold font-mono text-blue-900">{r.sloc}</td>
                    <td className="p-2 font-mono">{r.item}</td>
                    <td className="p-2 truncate max-w-[150px]" title={r.desc}>{r.desc}</td>
                    <td className="p-2 font-mono font-semibold">{r.bLargo || '-'}</td>
                    <td className="p-2 font-mono font-semibold">{r.bSap || '-'}</td>
                    <td className="p-2 text-right font-mono">{r.qLargo}</td>
                    <td className="p-2 text-right font-mono">{r.qSap}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        r.status === 'MATCH' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'REPLACE' ? 'bg-indigo-100 text-indigo-800' :
                        r.status === 'QTY_DIFF' ? 'bg-amber-100 text-amber-800' :
                        r.status === 'NO_CANDIDATE' ? 'bg-red-100 text-red-800' :
                        'bg-slate-200 text-slate-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-2 font-bold text-slate-700">{r.rec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
