import { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, MapPin, Bell, BellRing, Volume2, VolumeX, Mail, MessageCircle, X, ListTodo, CheckSquare, ChevronDown, ChevronUp, ZoomIn, ExternalLink } from 'lucide-react';
import { TodoData } from '../types';

interface HeroProps {
  isAdmin: boolean;
  onLogin: () => void;
  onLogout: () => void;
  todos?: TodoData[];
  onOpenTodo?: () => void;
}

interface PrayerJadwal {
  imsak: string;
  subuh: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

export function Hero({ isAdmin, onLogin, onLogout, todos = [], onOpenTodo }: HeroProps) {
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [greeting, setGreeting] = useState('SELAMAT SIANG, REKAN!');
  
  const [prayerTimes, setPrayerTimes] = useState<PrayerJadwal | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string } | null>(null);
  const [loadingPrayer, setLoadingPrayer] = useState(true);

  // Toggle Sembunyikan/Tampilkan Kontak (Default False = Sembunyi agar area lebih kecil)
  const [showContacts, setShowContacts] = useState(false);

  // Modal Perbesar Foto Profil & Detail Kontak
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // State untuk Alarm Pengingat Sholat
  const [activeAlarm, setActiveAlarm] = useState<{ name: string; time: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastTriggeredRef = useRef<string>('');

  // State untuk Reminder Todo
  const [activeTodoReminder, setActiveTodoReminder] = useState<boolean>(false);

  const pendingTodos = todos.filter(t => t.status === 'no' || t.status === 'onproses');

  // Function untuk memainkan nada panggil / chime sholat
  const playPrayerChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Nada lembut Islami chime (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        const startTime = ctx.currentTime + index * 0.35;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.75);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.8);
      });
    } catch (e) {
      console.error("Gagal memutar audio alarm:", e);
    }
  };

  // Function untuk memainkan nada chime Reminder Todo
  const playTodoChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Dual tone reminder (E5 -> A5)
      const notes = [659.25, 880.00, 1174.66];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        
        const startTime = ctx.currentTime + index * 0.2;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.55);
      });
    } catch (e) {
      console.error("Gagal memutar audio todo chime:", e);
    }
  };

  const handleTriggerTodoReminder = () => {
    setActiveTodoReminder(true);
    if (soundEnabled) playTodoChime();
  };

  useEffect(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

    const timer = setInterval(() => {
      const now = new Date();
      const currentHoursStr = String(now.getHours()).padStart(2, '0');
      const currentMinutesStr = String(now.getMinutes()).padStart(2, '0');
      const currentSecondsStr = String(now.getSeconds()).padStart(2, '0');
      const currentTimeFormatted = `${currentHoursStr}:${currentMinutesStr}:${currentSecondsStr}`;
      const currentHHMM = `${currentHoursStr}:${currentMinutesStr}`;

      setTime(currentTimeFormatted);
      setDateStr(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
      
      const hour = now.getHours();
      let greet = 'Selamat Malam';
      if (hour < 11) greet = 'Selamat Pagi';
      else if (hour < 15) greet = 'Selamat Siang';
      else if (hour < 18) greet = 'Selamat Sore';
      setGreeting(`${greet}, Rekan!`);

      // Cek apakah waktu sholat tiba (per detik ke-00)
      if (now.getSeconds() === 0 && prayerTimes) {
        const list = [
          { label: 'Imsak', time: prayerTimes.imsak },
          { label: 'Subuh', time: prayerTimes.subuh },
          { label: 'Dzuhur', time: prayerTimes.dzuhur },
          { label: 'Ashar', time: prayerTimes.ashar },
          { label: 'Maghrib', time: prayerTimes.maghrib },
          { label: 'Isya', time: prayerTimes.isya },
        ];
        
        const matched = list.find(p => p.time === currentHHMM);
        if (matched) {
          const triggerKey = `${currentHHMM}-${matched.label}`;
          if (lastTriggeredRef.current !== triggerKey) {
            lastTriggeredRef.current = triggerKey;
            setActiveAlarm({ name: matched.label, time: matched.time });
            if (soundEnabled) {
              playPrayerChime();
            }
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [prayerTimes, soundEnabled]);

  // Fetch Jadwal Sholat Kab. Sukabumi
  useEffect(() => {
    const fetchJadwal = async () => {
      try {
        setLoadingPrayer(true);
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');

        // MyQuran API for Kab. Sukabumi (ID: 1216)
        const res = await fetch(`https://api.myquran.com/v2/sholat/jadwal/1216/${y}/${m}/${d}`);
        const json = await res.json();

        if (json && json.status && json.data && json.data.jadwal) {
          const j = json.data.jadwal;
          setPrayerTimes({
            imsak: j.imsak,
            subuh: j.subuh,
            dzuhur: j.dzuhur,
            ashar: j.ashar,
            maghrib: j.maghrib,
            isya: j.isya
          });
        } else {
          // Fallback Aladhan API
          const res2 = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=Sukabumi&country=Indonesia`);
          const json2 = await res2.json();
          if (json2 && json2.data && json2.data.timings) {
            const t = json2.data.timings;
            setPrayerTimes({
              imsak: t.Imsak,
              subuh: t.Fajr,
              dzuhur: t.Dhuhr,
              ashar: t.Asr,
              maghrib: t.Maghrib,
              isya: t.Isha
            });
          }
        }
      } catch (e) {
        console.error("Gagal mengambil jadwal sholat:", e);
        setPrayerTimes({
          imsak: '04:37',
          subuh: '04:47',
          dzuhur: '12:03',
          ashar: '15:24',
          maghrib: '17:58',
          isya: '19:09'
        });
      } finally {
        setLoadingPrayer(false);
      }
    };

    fetchJadwal();
  }, []);

  // Compute next prayer
  useEffect(() => {
    if (!prayerTimes) return;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const list = [
      { name: 'Imsak', time: prayerTimes.imsak },
      { name: 'Subuh', time: prayerTimes.subuh },
      { name: 'Dzuhur', time: prayerTimes.dzuhur },
      { name: 'Ashar', time: prayerTimes.ashar },
      { name: 'Maghrib', time: prayerTimes.maghrib },
      { name: 'Isya', time: prayerTimes.isya },
    ];

    let upcoming = null;
    for (const item of list) {
      const [h, m] = item.time.split(':').map(Number);
      const itemMinutes = h * 60 + m;
      if (itemMinutes > currentMinutes) {
        upcoming = item;
        break;
      }
    }

    if (!upcoming) {
      upcoming = { name: 'Subuh', time: prayerTimes.subuh };
    }

    setNextPrayer(upcoming);
  }, [prayerTimes, time]);

  const prayerList = prayerTimes ? [
    { label: 'Imsak', time: prayerTimes.imsak },
    { label: 'Subuh', time: prayerTimes.subuh },
    { label: 'Dzuhur', time: prayerTimes.dzuhur },
    { label: 'Ashar', time: prayerTimes.ashar },
    { label: 'Maghrib', time: prayerTimes.maghrib },
    { label: 'Isya', time: prayerTimes.isya },
  ] : [];

  const handleClosePrayerAlarm = () => {
    setActiveAlarm(null);
    setTimeout(() => {
      handleTriggerTodoReminder();
    }, 350);
  };

  return (
    <>
      {/* Modal Alarm Pengingat Sholat */}
      {activeAlarm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-box !bg-white/90 p-6 sm:p-8 rounded-3xl max-w-md w-full text-center shadow-2xl border border-emerald-400 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl"></div>
            
            <button 
              onClick={handleClosePrayerAlarm}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all"
            >
              <X size={18} />
            </button>

            <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce">
              <BellRing size={32} />
            </div>

            <span className="text-[11px] font-black tracking-widest text-emerald-700 uppercase bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 inline-block mb-2">
              PENGINGAT WAKTU SHOLAT
            </span>

            <h2 className="text-2xl font-black text-slate-800 m-0 uppercase mb-1">
              WAKTU {activeAlarm.name} TELAH TIBA
            </h2>
            <p className="text-slate-600 text-sm font-semibold mb-4">
              Pukul <span className="font-extrabold text-emerald-700">{activeAlarm.time} WIB</span> untuk Wilayah Kabupaten Sukabumi & Sekitarnya.
            </p>

            <p className="text-xs text-slate-500 italic mb-6">
              "Mari sejenak menunaikan ibadah sholat tepat waktu."
            </p>

            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => { playPrayerChime(); }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all"
              >
                <Volume2 size={16} /> Bunyikan Nada
              </button>
              <button 
                onClick={handleClosePrayerAlarm}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
              >
                Tutup Pengingat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alarm Pengingat TODO */}
      {activeTodoReminder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-box !bg-white/95 p-6 sm:p-8 rounded-3xl max-w-lg w-full shadow-2xl border border-orange-400 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl"></div>
            
            <button 
              onClick={() => setActiveTodoReminder(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all"
            >
              <X size={18} />
            </button>

            <div className="w-16 h-16 bg-orange-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce">
              <ListTodo size={32} />
            </div>

            <div className="text-center mb-4">
              <span className="text-[11px] font-black tracking-widest text-orange-700 uppercase bg-orange-100 px-3 py-1 rounded-full border border-orange-300 inline-block mb-2">
                PENGINGAT TODO AKTIF
              </span>

              <h2 className="text-2xl font-black text-slate-800 m-0 uppercase mb-1">
                ADA {pendingTodos.length} TUGAS BELUM SELESAI
              </h2>
              <p className="text-slate-600 text-xs font-semibold">
                Berikut ringkasan daftar tugas TODO & PROSES yang perlu Anda selesaikan:
              </p>
            </div>

            <div className="max-h-52 overflow-y-auto my-4 space-y-2 pr-1 custom-scrollbar">
              {pendingTodos.length === 0 ? (
                <div className="text-center py-6 text-emerald-600 font-bold text-xs bg-emerald-50 rounded-xl border border-emerald-200">
                  🎉 Semua tugas sudah selesai! Tidak ada tugas pending.
                </div>
              ) : (
                pendingTodos.map(todo => (
                  <div key={todo.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                    <CheckSquare size={16} className={`shrink-0 mt-0.5 ${todo.status === 'onproses' ? 'text-blue-900' : 'text-orange-500'}`} />
                    <div className="flex-1 text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap break-words">
                      {todo.task}
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${todo.status === 'onproses' ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>
                      {todo.status === 'onproses' ? 'PROSES' : 'TODO'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 justify-center mt-6">
              <button 
                onClick={() => { playTodoChime(); }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all"
              >
                <Volume2 size={16} /> Bunyikan Nada
              </button>
              {onOpenTodo && (
                <button 
                  onClick={() => {
                    setActiveTodoReminder(false);
                    onOpenTodo();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <ListTodo size={16} /> Kelola Todos
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Perbesar Foto Profil & Detail Kontak */}
      {showPhotoModal && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/75 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setShowPhotoModal(false)}
        >
          <div 
            className="glass-box !bg-white/95 p-6 sm:p-8 rounded-3xl max-w-md w-full shadow-2xl border border-blue-400 relative overflow-hidden text-center animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

            <button 
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all z-20 cursor-pointer"
              title="Tutup"
            >
              <X size={18} />
            </button>

            {/* Foto Perbesar */}
            <div className="relative inline-block mx-auto mb-4 group">
              <div className="p-1 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 shadow-xl">
                <img 
                  src="https://res.cloudinary.com/dedtb3vnj/image/upload/v1785128112/dedesuparman_eelegb.jpg" 
                  alt="Dede Suparman" 
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover border-4 border-white shadow-inner transition-transform duration-300 hover:scale-105"
                />
              </div>
              <span className="absolute bottom-2 right-2 bg-blue-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md flex items-center gap-1 border border-blue-700">
                <ZoomIn size={12} /> HD Photo
              </span>
            </div>

            {/* Detail Nama & Peran */}
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 m-0 uppercase tracking-tight">
              Dede Suparman
            </h2>
            <p className="text-xs sm:text-sm font-extrabold text-blue-900 bg-blue-50 border border-blue-200 px-3.5 py-1 rounded-full inline-block mt-2 mb-4 shadow-2xs">
              Logistik Supervisor & Developer
            </p>

            {/* Detail Kontak Lengkap */}
            <div className="space-y-2.5 text-left bg-slate-50/90 p-4 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-emerald-400 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <MessageCircle size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp / Telp</div>
                    <div className="font-extrabold text-slate-800 text-xs sm:text-sm">081911934000</div>
                  </div>
                </div>
                <a 
                  href="https://wa.me/6281911934000" 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all flex items-center gap-1 shadow-2xs"
                >
                  Chat <ExternalLink size={11} />
                </a>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-blue-400 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center shrink-0">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Email Kantor (Kino)</div>
                    <div className="font-extrabold text-slate-800 text-xs truncate">dede.suparman@kino.co.id</div>
                  </div>
                </div>
                <a 
                  href="mailto:dede.suparman@kino.co.id" 
                  className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-bold text-[11px] transition-all shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  Kirim <ExternalLink size={11} />
                </a>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-400 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Email Pribadi</div>
                    <div className="font-extrabold text-slate-800 text-xs truncate">dedesuparman333@gmail.com</div>
                  </div>
                </div>
                <a 
                  href="mailto:dedesuparman333@gmail.com" 
                  className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] transition-all shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  Kirim <ExternalLink size={11} />
                </a>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <MapPin size={16} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Lokasi / Wilayah</div>
                  <div className="font-extrabold text-slate-800 text-xs">Kabupaten Sukabumi, Jawa Barat</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <a 
                href="https://wa.me/6281911934000" 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <MessageCircle size={15} /> Hubungi WhatsApp
              </a>
              <button 
                onClick={() => setShowPhotoModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-box p-0 flex flex-col xl:flex-row relative overflow-hidden mb-6">
        {/* Profile Section - Disembunyikan Kontaknya agar area lebih kecil & ringkas */}
        <div className="flex-1 flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 sm:p-5 bg-white/20 min-w-0">
          <div className="relative z-10 shrink-0 group">
            <div 
              onClick={() => setShowPhotoModal(true)}
              className="relative cursor-pointer overflow-hidden rounded-2xl p-0.5 transition-all duration-300"
              title="Klik untuk perbesar foto profil & lihat detail kontak"
            >
              <img 
                src="https://res.cloudinary.com/dedtb3vnj/image/upload/v1785128112/dedesuparman_eelegb.jpg" 
                alt="Dede Suparman" 
                className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl object-cover border-4 border-white shadow-md transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-2 group-hover:shadow-2xl group-hover:border-blue-300"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-900/30 via-transparent to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-center justify-center">
                <span className="bg-slate-900/80 text-white text-[9px] font-bold px-2 py-1 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-md">
                  <ZoomIn size={10} /> Perbesar
                </span>
              </div>
              <span className="absolute -bottom-1 -right-1 bg-white/90 backdrop-blur-md border border-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs shadow-md transition-all duration-300 group-hover:scale-125 group-hover:rotate-12 group-hover:bg-blue-50">
                👋
              </span>
            </div>
          </div>

          <div className="relative z-10 flex-1 min-w-0 ml-0 sm:ml-2 text-center sm:text-left flex flex-col items-center sm:items-start w-full justify-center">
            <h1 className="font-extrabold text-slate-800 m-0 mb-0.5 text-lg sm:text-xl md:text-2xl tracking-tight uppercase break-words">{greeting}</h1>
            
            <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 flex-wrap mb-1.5">
              <span className="font-black text-slate-800 text-xs sm:text-sm md:text-base uppercase">Dede Suparman</span>
              <span className="bg-blue-900/15 text-blue-900 border border-blue-900/30 text-[9px] sm:text-[10px] font-bold py-0.5 px-2 uppercase rounded-full shadow-2xs">
                Logistik Supervisor & Developer
              </span>
            </div>

            {/* Sembunyikan Kontak Secara Default untuk Memperkecil Area */}
            {showContacts ? (
              <div className="flex justify-center sm:justify-start gap-2 flex-wrap mt-2 animate-fade-in">
                <a 
                  href="https://wa.me/6281911934000" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 text-[11px] font-bold border border-emerald-500/20 transition-all hover:scale-105"
                  title="Hubungi WhatsApp"
                >
                  <MessageCircle size={13} className="text-emerald-600 shrink-0" />
                  <span>081911934000</span>
                </a>

                <a 
                  href="mailto:dede.suparman@kino.co.id" 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-900/10 hover:bg-blue-900/20 text-blue-950 text-[11px] font-bold border border-blue-900/20 transition-all hover:scale-105"
                  title="Email Kantor Kino"
                >
                  <Mail size={13} className="text-blue-900 shrink-0" />
                  <span>dede.suparman@kino.co.id</span>
                </a>

                <a 
                  href="mailto:dedesuparman333@gmail.com" 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-800 text-[11px] font-bold border border-slate-500/20 transition-all hover:scale-105"
                  title="Email Pribadi"
                >
                  <Mail size={13} className="text-slate-600 shrink-0" />
                  <span>dedesuparman333@gmail.com</span>
                </a>

                <button 
                  onClick={() => setShowContacts(false)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200/80 text-slate-600 hover:text-slate-900 text-[10px] font-bold transition-all"
                  title="Sembunyikan Kontak"
                >
                  <ChevronUp size={12} /> Sembunyikan
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowContacts(true)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-blue-900 bg-white/40 hover:bg-white/70 px-2 py-0.5 rounded-md border border-white/60 transition-all mt-0.5"
                title="Tampilkan Kontak Person"
              >
                <Mail size={11} className="text-slate-500" />
                <span>Lihat Kontak</span>
                <ChevronDown size={11} />
              </button>
            )}
          </div>
        </div>
        
        {/* Right Section: Clock & Prayer Times Sejajar (Side by Side) */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row xl:flex-col 2xl:flex-row items-stretch md:items-start justify-between gap-4 bg-white/30 backdrop-blur-lg xl:border-l border-white/50 border-t xl:border-t-0 z-10 relative shrink-0 min-w-0">
          
          {/* Clock & Date Block + Small Login/Logout */}
          <div className="flex flex-col items-center sm:items-start shrink-0 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap justify-center sm:justify-start">
              <div className="font-bold text-[10px] sm:text-[11px] text-orange-700 tracking-wider border border-orange-500/30 px-2.5 py-0.5 bg-orange-500/10 rounded-full shadow-2xs">
                {dateStr || 'Memuat...'}
              </div>
              
              {/* Tombol Login/Logout dibuat lebih kecil dan diskret */}
              {!isAdmin ? (
                <button 
                  onClick={onLogin} 
                  className="glass-btn !py-1 !px-2.5 !text-[10px] !rounded-lg text-slate-600 hover:text-blue-900 bg-white/50 hover:bg-white/80 border-white/60 opacity-80 hover:opacity-100 flex items-center gap-1 transition-all shadow-2xs"
                  title="Login Admin (Kunci)"
                >
                  <Lock size={11} className="text-blue-900" />
                  <span>Admin Login</span>
                </button>
              ) : (
                <button 
                  onClick={onLogout} 
                  className="glass-btn !py-1 !px-2.5 !text-[10px] !rounded-lg text-red-600 bg-red-500/10 hover:bg-red-500/20 border-red-500/20 flex items-center gap-1 transition-all shadow-2xs"
                  title="Logout Admin"
                >
                  <Unlock size={11} />
                  <span>Logout</span>
                </button>
              )}
            </div>

            <div className="font-black text-blue-900 text-2xl sm:text-3xl md:text-4xl leading-none tracking-tight drop-shadow-md">
              {time || '--:--:--'}
            </div>


          </div>

          {/* Jadwal Sholat (Sejajar dengan Jam - Mepet Atas) */}
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 tracking-wider">
                <MapPin size={13} className="text-emerald-600 shrink-0" />
                <span>Jadwal Sholat Sukabumi</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Toggle Suara Alarm */}
                <button 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1 rounded-md text-[10px] font-semibold border transition-all flex items-center gap-1 ${
                    soundEnabled 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                      : 'bg-slate-100 text-slate-500 border-slate-300 line-through'
                  }`}
                  title={soundEnabled ? "Suara Alarm Aktif" : "Suara Alarm Muted"}
                >
                  {soundEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
                  <span>{soundEnabled ? 'Suara On' : 'Mute'}</span>
                </button>

                {nextPrayer && (
                  <button 
                    onClick={handleTriggerTodoReminder}
                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 cursor-pointer transition-all text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-2xs active:scale-95"
                    title="Klik Lonceng untuk bunyikan nada & tampilkan pengingat Todo aktif"
                  >
                    <Bell size={11} className="animate-bounce" />
                    <span>Mendatang: {nextPrayer.name} ({nextPrayer.time})</span>
                  </button>
                )}
              </div>
            </div>

            {loadingPrayer ? (
              <div className="text-xs text-slate-500 font-medium py-1">Memuat Jadwal Sholat...</div>
            ) : (
              <div className="grid grid-cols-3 xs:grid-cols-6 sm:grid-cols-6 gap-1 sm:gap-1.5 w-full min-w-0">
                {prayerList.map((p) => {
                  const isNext = nextPrayer && nextPrayer.name.toLowerCase() === p.label.toLowerCase();
                  return (
                    <div 
                      key={p.label}
                      className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl text-center border transition-all min-w-0 ${
                        isNext 
                          ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-300 shadow-md scale-105' 
                          : 'bg-white/50 text-slate-700 border-white/60 hover:bg-white/70'
                      }`}
                    >
                      <span className={`text-[9px] font-bold tracking-wider ${isNext ? 'text-emerald-100' : 'text-slate-500'}`}>
                        {p.label}
                      </span>
                      <span className={`text-[11px] sm:text-xs font-bold mt-0.5 ${isNext ? 'text-white' : 'text-blue-950'}`}>
                        {p.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}


