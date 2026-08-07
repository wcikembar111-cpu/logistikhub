import { useState, useEffect } from 'react';
import { Edit2, Plus, X } from 'lucide-react';
import { useAnnouncements } from '../hooks/useSupabase';

export function Ticker({ isAdmin }: { isAdmin: boolean }) {
  const { messages, updateMessages } = useAnnouncements();
  const [time, setTime] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMessages, setEditMessages] = useState<string[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenModal = () => {
    setEditMessages(messages.length > 0 ? messages : ['']);
    setShowModal(true);
  };

  const handleSave = async () => {
    const validMessages = editMessages.filter(m => m.trim() !== '');
    if (validMessages.length === 0) {
      alert('Minimal 1 pesan');
      return;
    }
    await updateMessages(validMessages);
    setShowModal(false);
  };

  const addMessageRow = () => {
    setEditMessages([...editMessages, '']);
  };

  const updateMessageRow = (idx: number, val: string) => {
    const newMsgs = [...editMessages];
    newMsgs[idx] = val;
    setEditMessages(newMsgs);
  };

  const removeMessageRow = (idx: number) => {
    setEditMessages(editMessages.filter((_, i) => i !== idx));
  };

  return (
    <>
      <div className="glass-box h-12 flex items-stretch overflow-hidden !rounded-2xl">
        <div className="bg-orange-500/10 text-orange-600 border-r border-white/40 flex items-center justify-center px-4 font-bold text-xs tracking-widest uppercase">
          <span className="w-2.5 h-2.5 bg-orange-500 rounded-full mr-2 animate-pulse shadow-sm"></span> PENGUMUMAN
        </div>
        
        <div className="flex-1 flex items-center bg-transparent overflow-hidden px-4 text-sm relative" title="Arahkan kursor ke sini untuk menjeda teks">
          <div className="font-semibold text-slate-700 uppercase animate-marquee whitespace-nowrap absolute min-w-max flex items-center gap-8 cursor-pointer">
            {messages.length > 0 ? messages.map((m, idx) => <span key={idx}>■ {m}</span>) : <span>MEMUAT PENGUMUMAN...</span>}
          </div>
        </div>
        
        <div className="bg-blue-900/15 text-blue-900 border-l border-white/40 flex items-center justify-center px-4 font-bold text-sm">
          {time}
        </div>
        
        {isAdmin && (
          <button onClick={handleOpenModal} className="bg-white/40 hover:bg-white/60 border-l border-white/40 px-4 cursor-pointer font-bold text-blue-900 transition-colors">
            <Edit2 size={16} />
          </button>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[1055] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="glass-box w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] !rounded-3xl">
            <div className="border-b border-white/40 px-6 py-4 flex justify-between items-center bg-white/40">
              <h5 className="font-bold text-slate-800 flex items-center gap-2 m-0 text-sm uppercase">
                <Edit2 size={18} className="text-blue-900" /> EDIT PENGUMUMAN
              </h5>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-800 font-black text-xl transition-transform cursor-pointer">✕</button>
            </div>
            <div className="p-6 overflow-y-auto bg-white/30">
              {editMessages.map((msg, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={msg}
                    onChange={(e) => updateMessageRow(idx, e.target.value)}
                    placeholder="KETIK PESAN..."
                    className="flex-1 bg-white/50 text-slate-800 border border-white/60 rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-blue-800 outline-none transition-all shadow-sm"
                  />
                  <button onClick={() => removeMessageRow(idx)} className="glass-btn !bg-red-500/10 hover:!bg-red-500/20 text-red-600 !p-0 w-12 h-[46px] flex items-center justify-center shrink-0">
                    <X size={18} />
                  </button>
                </div>
              ))}
              <button onClick={addMessageRow} className="glass-btn !bg-orange-500/10 hover:!bg-orange-500/20 text-orange-600 w-full justify-center mt-2 py-3 rounded-xl border border-orange-500/20">
                <Plus size={18} /> TAMBAH PESAN
              </button>
            </div>
            <div className="border-t border-white/40 px-6 py-4 bg-white/40 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="glass-btn !bg-white/60">BATAL</button>
              <button onClick={handleSave} className="glass-btn !bg-blue-900 text-white hover:!bg-blue-800">SIMPAN</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
