import { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, MapPin, Bell, BellRing, Volume2, VolumeX, Mail, MessageCircle, X, ListTodo, CheckSquare, ChevronDown, ChevronUp, ZoomIn, ExternalLink, KeyRound, Timer, LogOut } from 'lucide-react';
import { TodoData } from '../types';
import { InstallPwaButton } from './common/InstallPwaButton';
import { TIMEOUT_OPTIONS } from '../utils/pinAuth';

interface HeroProps {
  isAdmin: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onLockApp?: () => void;
  sessionTimeoutMinutes?: number;
  onChangeSessionTimeout?: (minutes: number) => void;
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

export function Hero({ 
  isAdmin, 
  onLogin, 
  onLogout, 
  onLockApp, 
  sessionTimeoutMinutes = 15,
  onChangeSessionTimeout,
  todos = [], 
  onOpenTodo 
}: HeroProps) {
  const [showTimeoutDropdown, setShowTimeoutDropdown] = useState(false);
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 animate-fade-in">
          <div className="bg-white p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-2xl border border-emerald-400 relative overflow-hidden">
            
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 animate-fade-in">
          <div className="bg-white p-6 sm:p-8 rounded-2xl max-w-lg w-full shadow-2xl border border-orange-400 relative overflow-hidden">
            
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

      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden mb-6">
        {/* Top Header Row: Profile Info on Left, Action Buttons on Right */}
        <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Left: Profile Photo & Greeting & Role */}
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="relative shrink-0 group">
              <div 
                onClick={() => setShowPhotoModal(true)}
                className="relative cursor-pointer overflow-hidden rounded-2xl p-0.5 transition-all duration-300"
                title="Klik untuk perbesar foto profil & lihat detail kontak"
              >
                <img 
                  src="https://res.cloudinary.com/dedtb3vnj/image/upload/v1785128112/dedesuparman_eelegb.jpg" 
                  alt="Dede Suparman" 
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-md transition-all duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 rounded-2xl bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center justify-center">
                  <span className="bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                    <ZoomIn size={9} /> Zoom
                  </span>
                </div>
                <span className="absolute -bottom-1 -right-1 bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-[10px] shadow-xs">
                  👋
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <h1 className="font-extrabold text-slate-800 m-0 text-base sm:text-lg md:text-xl tracking-tight uppercase leading-tight">
                {greeting}
              </h1>
              
              <div className="flex items-center gap-2 flex-wrap mt-0.5 mb-1">
                <span className="font-black text-slate-800 text-xs sm:text-sm uppercase">Dede Suparman</span>
                <span className="bg-blue-50 text-blue-900 border border-blue-200 text-[9px] sm:text-[10px] font-bold py-0.5 px-2 uppercase rounded-full shadow-2xs">
                  Logistik Supervisor & Developer
                </span>
              </div>

              {/* Sembunyikan Kontak Secara Default untuk Memperkecil Area */}
              {showContacts ? (
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5 animate-fade-in">
                  <a 
                    href="https://wa.me/6281911934000" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 transition-all"
                    title="Hubungi WhatsApp"
                  >
                    <MessageCircle size={11} className="text-emerald-600 shrink-0" />
                    <span>081911934000</span>
                  </a>

                  <a 
                    href="mailto:dede.suparman@kino.co.id" 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-950 text-[10px] font-bold border border-blue-200 transition-all"
                    title="Email Kantor Kino"
                  >
                    <Mail size={11} className="text-blue-900 shrink-0" />
                    <span>dede.suparman@kino.co.id</span>
                  </a>

                  <a 
                    href="mailto:dedesuparman333@gmail.com" 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold border border-slate-200 transition-all"
                    title="Email Pribadi"
                  >
                    <Mail size={11} className="text-slate-600 shrink-0" />
                    <span>dedesuparman333@gmail.com</span>
                  </a>

                  <button 
                    onClick={() => setShowContacts(false)}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-slate-200 text-slate-600 hover:text-slate-900 text-[9px] font-bold transition-all cursor-pointer"
                    title="Sembunyikan Kontak"
                  >
                    <ChevronUp size={10} /> Tutup
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowContacts(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-blue-900 bg-white hover:bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 transition-all cursor-pointer shadow-2xs"
                  title="Tampilkan Kontak Person"
                >
                  <Mail size={11} className="text-slate-500" />
                  <span>Lihat Kontak</span>
                  <ChevronDown size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Right: Action Buttons Group (Date Badge, Install App, Lock PIN, Session Timeout, Admin Login) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap self-start md:self-center">
            <div className="font-bold text-[10px] sm:text-[11px] text-orange-700 tracking-wider border border-orange-200 px-2.5 py-1 bg-orange-50 rounded-lg shadow-2xs whitespace-nowrap">
              {dateStr || 'Memuat...'}
            </div>

            {/* Tombol Install PWA jika belum terinstall */}
            <InstallPwaButton variant="header" />
            
            {/* Tombol Kunci / Logout PIN Aplikasi & Pengaturan Durasi Sesi */}
            {onLockApp && (
              <div className="relative inline-flex items-center gap-1">
                <button 
                  onClick={onLockApp} 
                  className="py-1 px-2.5 text-[10px] font-bold rounded-lg text-indigo-950 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap"
                  title="Kunci / Logout Aplikasi kembali ke Layar PIN 6 Digit"
                >
                  <KeyRound size={12} className="text-indigo-600 group-hover:text-white shrink-0" />
                  <span>KUNCI / LOGOUT PIN</span>
                </button>

                {/* Indikator & Dropdown Durasi Auto-Lock Sesi */}
                {onChangeSessionTimeout && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTimeoutDropdown(!showTimeoutDropdown)}
                      className="px-2 py-1 rounded-lg text-[9px] font-extrabold bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-900 border border-slate-200 flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                      title={`Sesi Otomatis Terkunci setelah ${sessionTimeoutMinutes} menit tanpa aktivitas`}
                    >
                      <Timer size={10} className="text-amber-600 shrink-0" />
                      <span>{sessionTimeoutMinutes}m</span>
                      <ChevronDown size={10} />
                    </button>

                    {showTimeoutDropdown && (
                      <div className="absolute top-full right-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-2 min-w-[170px] text-left animate-scale-up">
                        <div className="text-[10px] font-black text-slate-400 uppercase mb-1.5 px-1.5">
                          Otomatis Kunci Sesi:
                        </div>
                        <div className="space-y-0.5">
                          {TIMEOUT_OPTIONS.map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => {
                                onChangeSessionTimeout(mins);
                                setShowTimeoutDropdown(false);
                              }}
                              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                sessionTimeoutMinutes === mins
                                  ? 'bg-indigo-600 text-white'
                                  : 'hover:bg-indigo-50 text-slate-700'
                              }`}
                            >
                              <span>{mins} Menit Tidak Aktif</span>
                              {sessionTimeoutMinutes === mins && <span className="text-[10px]">✓</span>}
                            </button>
                          ))}
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[9px] text-slate-400 px-1 italic">
                          Aplikasi terkunci otomatis jika tidak disentuh/digerakkan.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tombol Login/Logout */}
            {!isAdmin ? (
              <button 
                onClick={onLogin} 
                className="py-1 px-2.5 text-[10px] font-bold rounded-lg text-slate-700 hover:text-blue-900 bg-white hover:bg-slate-50 border border-slate-200 flex items-center gap-1 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                title="Login Admin (Kunci)"
              >
                <Lock size={11} className="text-blue-900 shrink-0" />
                <span>ADMIN LOGIN</span>
              </button>
            ) : (
              <button 
                onClick={onLogout} 
                className="py-1 px-2.5 text-[10px] font-bold rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                title="Logout Admin"
              >
                <Unlock size={11} className="shrink-0" />
                <span>LOGOUT</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Bottom Row: Digital Clock & Prayer Times Schedule */}
        <div className="p-4 sm:p-5 bg-white flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Big Digital Clock */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="font-black text-blue-950 text-3xl sm:text-4xl tracking-tight leading-none">
              {time || '--:--:--'}
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">WIB</span>
              <span className="text-[10px] font-semibold text-slate-500 leading-none mt-1">Real-time</span>
            </div>
          </div>

          {/* Jadwal Sholat Sukabumi */}
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
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
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
              <div className="grid grid-cols-3 xs:grid-cols-6 sm:grid-cols-6 gap-1.5 w-full min-w-0">
                {prayerList.map((p) => {
                  const isNext = nextPrayer && nextPrayer.name.toLowerCase() === p.label.toLowerCase();
                  return (
                    <div 
                      key={p.label}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all min-w-0 ${
                        isNext 
                          ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-300 shadow-xs scale-105' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`text-[9px] font-bold tracking-wider ${isNext ? 'text-emerald-100' : 'text-slate-500'}`}>
                        {p.label}
                      </span>
                      <span className={`text-xs font-extrabold mt-0.5 ${isNext ? 'text-white' : 'text-slate-800'}`}>
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


