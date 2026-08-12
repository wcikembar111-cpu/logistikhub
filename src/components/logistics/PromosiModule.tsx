import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  PackageCheck, Save, RefreshCw, Download, Upload, Trash2, Edit, 
  X, CheckCircle2, FileSpreadsheet, Calendar
} from 'lucide-react';
import { supabase } from '../../supabase';
import { useNotification } from '../../context/NotificationContext';

export interface PromosiData {
  id: string;
  nomor: string;
  tgl_terima: string;
  material: string;
  pengirim: string;
  penerima: string;
  nopol: string;
  expedisi: string;
  keterangan: string;
  jumlah_ctn: number;
  jumlah_pcs: number;
  created_at?: string;
}

export function PromosiModule() {
  const { showToast } = useNotification();

  const [promosiList, setPromosiList] = useState<PromosiData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State matching the exact remix code structure
  const [formData, setFormData] = useState({
    nomor: '',
    tgl_terima: new Date().toISOString().split('T')[0],
    material: '',
    pengirim: '',
    penerima: '',
    nopol: '',
    expedisi: '',
    jumlah_ctn: '' as string | number,
    jumlah_pcs: '' as string | number,
    keterangan: ''
  });

  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const generateNomorPlaceholder = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    return `PRM-${yyyy}-${rand}`;
  };

  const fetchPromosiData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promosi')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error for promosi:', error.message);
        const local = localStorage.getItem('pbp_global_data');
        if (local) {
          setPromosiList(JSON.parse(local));
        }
      } else if (data) {
        // Map database field names to state format if needed
        const mappedData: PromosiData[] = data.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          nomor: item.nomor || item.Nomor || '',
          tgl_terima: item.tgl_terima || item.tglTerima || item['Tgl Terima'] || getTodayDate(),
          material: item.material || item.Material || '',
          pengirim: item.pengirim || item.Pengirim || '',
          penerima: item.penerima || item.Penerima || '',
          nopol: item.nopol || item.Nopol || '',
          expedisi: item.expedisi || item.expedisi || item.Expedisi || '',
          jumlah_ctn: Number(item.jumlah_ctn ?? item.jumlahCtn ?? item['Jumlah CTN'] ?? 0),
          jumlah_pcs: Number(item.jumlah_pcs ?? item.jumlahPcs ?? item['Jumlah PCS'] ?? 0),
          keterangan: item.keterangan || item.Keterangan || '',
          created_at: item.created_at
        }));
        setPromosiList(mappedData);
        localStorage.setItem('pbp_global_data', JSON.stringify(mappedData));
      }
    } catch (e) {
      console.error('Error loading promosi data:', e);
      const local = localStorage.getItem('pbp_global_data');
      if (local) {
        setPromosiList(JSON.parse(local));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromosiData();
    setFormData(prev => ({
      ...prev,
      nomor: generateNomorPlaceholder(),
      tgl_terima: getTodayDate()
    }));
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nomor: generateNomorPlaceholder(),
      tgl_terima: getTodayDate(),
      material: '',
      pengirim: '',
      penerima: '',
      nopol: '',
      expedisi: '',
      jumlah_ctn: '',
      jumlah_pcs: '',
      keterangan: ''
    });
  };

  const handleCancelEdit = () => {
    resetForm();
    showToast('Batal Edit', 'Mode pengeditan dibatalkan', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nomor || !formData.tgl_terima || !formData.material) {
      showToast('Peringatan', 'Nomor, Tgl Terima, dan Material wajib diisi', 'danger');
      return;
    }

    const payload = {
      nomor: formData.nomor,
      tgl_terima: formData.tgl_terima,
      material: formData.material,
      pengirim: formData.pengirim,
      penerima: formData.penerima,
      nopol: formData.nopol,
      expedisi: formData.expedisi,
      jumlah_ctn: Number(formData.jumlah_ctn) || 0,
      jumlah_pcs: Number(formData.jumlah_pcs) || 0,
      keterangan: formData.keterangan
    };

    if (editingId) {
      // Update
      const updatedList = promosiList.map(item => item.id === editingId ? { ...item, ...payload } : item);
      setPromosiList(updatedList);
      localStorage.setItem('pbp_global_data', JSON.stringify(updatedList));

      try {
        const { error } = await supabase.from('promosi').update(payload).eq('id', editingId);
        if (error) {
          console.warn('Supabase update note:', error.message);
          showToast('Tersimpan Lokal', 'Data diperbarui secara lokal', 'info');
        } else {
          showToast('Berhasil', 'Data penerimaan barang promosi berhasil diperbarui', 'success');
        }
      } catch (e) {
        showToast('Berhasil', 'Data diperbarui di penyimpanan lokal', 'success');
      }
    } else {
      // Create
      const newId = crypto.randomUUID();
      const newItem: PromosiData = {
        id: newId,
        ...payload,
        created_at: new Date().toISOString()
      };

      const updatedList = [newItem, ...promosiList];
      setPromosiList(updatedList);
      localStorage.setItem('pbp_global_data', JSON.stringify(updatedList));

      try {
        const { error } = await supabase.from('promosi').insert([newItem]);
        if (error) {
          console.warn('Supabase insert note:', error.message);
          showToast('Tersimpan Lokal', 'Data tersimpan di penyimpanan lokal', 'info');
        } else {
          showToast('Berhasil', 'Data penerimaan berhasil disimpan', 'success');
        }
      } catch (e) {
        showToast('Berhasil', 'Data penerimaan disimpan di lokal', 'success');
      }
    }

    resetForm();
  };

  const handleEdit = (item: PromosiData) => {
    setEditingId(item.id);
    setFormData({
      nomor: item.nomor || '',
      tgl_terima: item.tgl_terima || getTodayDate(),
      material: item.material || '',
      pengirim: item.pengirim || '',
      penerima: item.penerima || '',
      nopol: item.nopol || '',
      expedisi: item.expedisi || '',
      jumlah_ctn: item.jumlah_ctn ?? '',
      jumlah_pcs: item.jumlah_pcs ?? '',
      keterangan: item.keterangan || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus data penerimaan ini?')) return;

    const updated = promosiList.filter(item => item.id !== id);
    setPromosiList(updated);
    localStorage.setItem('pbp_global_data', JSON.stringify(updated));

    try {
      const { error } = await supabase.from('promosi').delete().eq('id', id);
      if (error) {
        console.warn('Supabase delete note:', error.message);
      }
      showToast('Berhasil', 'Data penerimaan berhasil dihapus', 'info');
    } catch (e) {
      showToast('Berhasil', 'Data dihapus dari penyimpanan lokal', 'info');
    }
  };

  // Download Excel matching exact remix functionality
  const downloadExcel = () => {
    if (promosiList.length === 0) {
      showToast('Info', 'Tidak ada data penerimaan untuk diunduh', 'info');
      return;
    }

    const rows = promosiList.map(r => ({
      "Nomor": r.nomor,
      "Tgl Terima": r.tgl_terima,
      "Material": r.material,
      "Pengirim": r.pengirim,
      "Penerima": r.penerima,
      "Nopol": r.nopol,
      "Expedisi": r.expedisi,
      "Jumlah CTN": r.jumlah_ctn,
      "Jumlah PCS": r.jumlah_pcs,
      "Keterangan": r.keterangan
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Penerimaan');
    XLSX.writeFile(wb, 'Data_Penerimaan_Promosi.xlsx');
    showToast('Sukses', 'File Data_Penerimaan_Promosi.xlsx berhasil diunduh', 'success');
  };

  // Upload Excel matching exact remix upload process
  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (rows.length === 0) {
          showToast('Peringatan', 'File Excel kosong atau tidak terbaca', 'danger');
          return;
        }

        const newItems: PromosiData[] = rows.map((r) => ({
          id: crypto.randomUUID(),
          nomor: String(r['Nomor'] || r['nomor'] || r['NO'] || generateNomorPlaceholder()).trim(),
          tgl_terima: String(r['Tgl Terima'] || r['tgl_terima'] || r['Tanggal'] || getTodayDate()).trim(),
          material: String(r['Material'] || r['material'] || 'Material Promosi').trim(),
          pengirim: String(r['Pengirim'] || r['pengirim'] || '').trim(),
          penerima: String(r['Penerima'] || r['penerima'] || '').trim(),
          nopol: String(r['Nopol'] || r['nopol'] || '').trim(),
          expedisi: String(r['Expedisi'] || r['expedisi'] || '').trim(),
          jumlah_ctn: Number(r['Jumlah CTN'] || r['jumlah_ctn'] || r['CTN'] || 0),
          jumlah_pcs: Number(r['Jumlah PCS'] || r['jumlah_pcs'] || r['PCS'] || 0),
          keterangan: String(r['Keterangan'] || r['keterangan'] || 'Imported Excel').trim(),
          created_at: new Date().toISOString()
        }));

        const combined = [...newItems, ...promosiList];
        setPromosiList(combined);
        localStorage.setItem('pbp_global_data', JSON.stringify(combined));

        try {
          await supabase.from('promosi').insert(newItems);
        } catch (err) {
          console.warn('Batch insert note:', err);
        }

        showToast('Sukses Impor', `Berhasil mengimpor ${newItems.length} data penerimaan promosi`, 'success');
      } catch (err) {
        console.error('Failed reading Excel:', err);
        showToast('Gagal Impor', 'Gagal membaca file Excel. Pastikan format file sesuai.', 'danger');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const formatNumber = (val: number | string) => {
    return (Number(val) || 0).toLocaleString('id-ID');
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* HEADER TITLE */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight m-0 flex items-center gap-2">
            <PackageCheck size={24} className="text-blue-600" />
            <span>Penerimaan Barang Promosi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold m-0 mt-1">
            Form &amp; Data Penerimaan Barang Promosi (Sheet: PROMOSI)
          </p>
        </div>
      </div>

      {/* FORM INPUT SECTION (CARD SECTION) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-extrabold text-slate-900 uppercase m-0 flex items-center gap-2">
            <Edit size={18} className="text-blue-600" />
            <span>{editingId ? 'Edit Penerimaan Barang Promosi' : 'Form Penerimaan Barang Promosi'}</span>
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <X size={14} />
              <span>Batal Edit</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ROW 1: GRID 3 COLS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                Nomor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nomor}
                onChange={(e) => setFormData({ ...formData, nomor: e.target.value })}
                placeholder="Contoh: PRM-001"
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                Tgl Terima <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.tgl_terima}
                onChange={(e) => setFormData({ ...formData, tgl_terima: e.target.value })}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                Material <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                placeholder="Nama/deskripsi material"
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          {/* ROW 2: GRID 4 COLS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                Pengirim
              </label>
              <input
                type="text"
                value={formData.pengirim}
                onChange={(e) => setFormData({ ...formData, pengirim: e.target.value })}
                placeholder="Nama pengirim"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                Penerima
              </label>
              <input
                type="text"
                value={formData.penerima}
                onChange={(e) => setFormData({ ...formData, penerima: e.target.value })}
                placeholder="Nama penerima"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                Nopol Kendaraan
              </label>
              <input
                type="text"
                value={formData.nopol}
                onChange={(e) => setFormData({ ...formData, nopol: e.target.value })}
                placeholder="Contoh: B 1234 AB"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                Expedisi
              </label>
              <input
                type="text"
                value={formData.expedisi}
                onChange={(e) => setFormData({ ...formData, expedisi: e.target.value })}
                placeholder="Nama expedisi"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          {/* ROW 3: GRID 3 COLS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                Jumlah CTN
              </label>
              <input
                type="number"
                min="0"
                value={formData.jumlah_ctn}
                onChange={(e) => setFormData({ ...formData, jumlah_ctn: e.target.value })}
                placeholder="0"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                Jumlah PCS
              </label>
              <input
                type="number"
                min="0"
                value={formData.jumlah_pcs}
                onChange={(e) => setFormData({ ...formData, jumlah_pcs: e.target.value })}
                placeholder="0"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                Keterangan
              </label>
              <input
                type="text"
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                placeholder="Catatan tambahan"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-lg text-xs font-extrabold text-white shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                editingId
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
              }`}
            >
              <Save size={16} />
              <span>{editingId ? 'Update Data' : 'Simpan Data'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* TABLE DATA SECTION (CARD SECTION) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        {/* HEADER & ACTION BUTTONS */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 uppercase m-0">
              Data Barang Diterima
            </h2>
            <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
              Sumber: Sheet "PROMOSI"
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchPromosiData}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={downloadExcel}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Download size={14} />
              <span>Download Excel</span>
            </button>

            <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs">
              <Upload size={14} />
              <span>Upload Excel</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleUploadExcel}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* MAIN DATA TABLE */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">Nomor</th>
                <th className="p-3">Tgl Terima</th>
                <th className="p-3">Material</th>
                <th className="p-3">Pengirim</th>
                <th className="p-3">Penerima</th>
                <th className="p-3">Nopol</th>
                <th className="p-3">Expedisi</th>
                <th className="p-3 text-right">CTN</th>
                <th className="p-3 text-right">PCS</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3 text-right min-w-[90px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500 font-semibold">
                    <RefreshCw size={20} className="animate-spin inline-block mr-2 text-blue-600" />
                    Memuat data penerimaan...
                  </td>
                </tr>
              ) : promosiList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 font-bold">
                    Belum ada data penerimaan barang promosi.
                  </td>
                </tr>
              ) : (
                promosiList.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-orange-600 whitespace-nowrap">
                      {row.nomor}
                    </td>
                    <td className="p-3 whitespace-nowrap">{row.tgl_terima}</td>
                    <td className="p-3 font-semibold text-slate-900 max-w-[180px] truncate" title={row.material}>
                      {row.material}
                    </td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">{row.pengirim || '-'}</td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">{row.penerima || '-'}</td>
                    <td className="p-3 font-mono text-slate-700 whitespace-nowrap">{row.nopol || '-'}</td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">{row.expedisi || '-'}</td>
                    <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                      {formatNumber(row.jumlah_ctn)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                      {formatNumber(row.jumlah_pcs)}
                    </td>
                    <td className="p-3 text-slate-600 max-w-[150px] truncate" title={row.keterangan}>
                      {row.keterangan || '-'}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(row)}
                          className="p-1.5 rounded-md bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-600 cursor-pointer transition-all shadow-2xs"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-1.5 rounded-md bg-white hover:bg-red-50 border border-slate-200 text-slate-700 hover:text-red-600 cursor-pointer transition-all shadow-2xs"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
