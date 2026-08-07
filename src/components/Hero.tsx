import { useState, useEffect } from 'react';
import { LogIn, LogOut, MapPin, Bell } from 'lucide-react';

interface HeroProps {
  isAdmin: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

interface PrayerJadwal {
  imsak: string;
  subuh: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

export function Hero({ isAdmin, onLogin, onLogout }: HeroProps) {
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [greeting, setGreeting] = useState('SELAMAT SIANG, REKAN!');
  
  const [prayerTimes, setPrayerTimes] = useState<PrayerJadwal | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string } | null>(null);
  const [loadingPrayer, setLoadingPrayer] = useState(true);

  useEffect(() => {
    const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGS', 'SEP', 'OKT', 'NOV', 'DES'];

    const timer = setInterval(() => {
      const now = new Date();
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
      setDateStr(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
      
      const hour = now.getHours();
      let greet = 'SELAMAT MALAM';
      if (hour < 11) greet = 'SELAMAT PAGI';
      else if (hour < 15) greet = 'SELAMAT SIANG';
      else if (hour < 18) greet = 'SELAMAT SORE';
      setGreeting(`${greet}, REKAN!`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
    { label: 'IMSAK', time: prayerTimes.imsak },
    { label: 'SUBUH', time: prayerTimes.subuh },
    { label: 'DZUHUR', time: prayerTimes.dzuhur },
    { label: 'ASHAR', time: prayerTimes.ashar },
    { label: 'MAGHRIB', time: prayerTimes.maghrib },
    { label: 'ISYA', time: prayerTimes.isya },
  ] : [];

  return (
    <div className="glass-box p-0 flex flex-wrap relative overflow-hidden mb-6">
      <div 
        className="flex-1 flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 sm:p-8 bg-white/20 min-w-[300px]"
      >
        <div className="relative z-10 shrink-0">
          <div className="relative">
            <img 
              src="https://res.cloudinary.com/dedtb3vnj/image/upload/v1785128112/dedesuparman_eelegb.jpg" 
              alt="Dede Suparman" 
              className="w-28 h-28 rounded-2xl object-cover border-4 border-white/60 shadow-lg"
            />
            <span className="absolute -bottom-3 -right-3 bg-white/80 backdrop-blur-md border border-white rounded-full w-10 h-10 flex items-center justify-center text-lg shadow-sm">
              👋
            </span>
          </div>
        </div>

        <div className="relative z-10 flex-1 ml-0 sm:ml-4 text-center sm:text-left flex flex-col items-center sm:items-start w-full">
          <h1 className="font-extrabold text-slate-800 m-0 mb-1 text-2xl tracking-tight uppercase">{greeting}</h1>
          
          <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap mb-4">
            <span className="font-bold text-slate-800 text-lg uppercase">Dede Suparman</span>
            <span className="bg-blue-900/15 text-blue-900 border border-blue-900/30 text-xs font-bold py-1 px-3 uppercase rounded-full shadow-sm">
              Logistik Supervisor & Developer
            </span>
          </div>

          <div className="flex justify-center sm:justify-start gap-3 flex-wrap mt-2">
            <a href="https://wa.me/6281911934000" target="_blank" rel="noreferrer" className="glass-btn !bg-orange-500/10 hover:!bg-orange-500/20 text-orange-600">
              081911934000
            </a>
            <a href="mailto:dede.suparman@kino.co.id" className="glass-btn !bg-blue-900/10 hover:!bg-blue-900/20 text-blue-900">
              dede.suparman@kino.co.id
            </a>
            <a href="mailto:dedesuparman333@gmail.com" className="glass-btn !bg-indigo-500/10 hover:!bg-indigo-500/20 text-indigo-600">
              dedesuparman333@gmail.com
            </a>
          </div>
        </div>
      </div>
      
      {/* Right Column: Clock, Date, Login/Logout, and Prayer Times */}
      <div className="p-6 sm:p-8 flex flex-col justify-between items-end min-w-[320px] bg-white/30 backdrop-blur-lg lg:border-l border-white/50 lg:border-t-0 border-t max-lg:items-start max-lg:w-full z-10 relative">
        <div className="w-full flex flex-col items-end max-lg:items-start mb-4">
          <div className="font-bold uppercase text-xs text-orange-700 tracking-widest mb-2 border border-orange-500/30 px-3 py-1 bg-orange-500/10 rounded-full shadow-sm">
            {dateStr || 'MEMUAT...'}
          </div>
          <div className="font-black text-blue-900 text-4xl sm:text-5xl leading-none mb-3 tracking-tight drop-shadow-md">
            {time || '--:--:--'}
          </div>
          <div>
            {!isAdmin ? (
              <button onClick={onLogin} className="glass-btn !bg-white/60 hover:!bg-white/80">
                <LogIn size={18} className="text-blue-900" /> <span className="text-blue-900">LOGIN ADMIN</span>
              </button>
            ) : (
              <button onClick={onLogout} className="glass-btn !bg-orange-500/80 hover:!bg-orange-500 text-white border-orange-400">
                <LogOut size={18} /> LOGOUT
              </button>
            )}
          </div>
        </div>

        {/* Pengingat Waktu Sholat Sukabumi */}
        <div className="w-full border-t border-white/40 pt-4 mt-2">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wider">
              <MapPin size={14} className="text-emerald-600" />
              <span>Jadwal Sholat Kab. Sukabumi</span>
            </div>
            {nextPrayer && (
              <div className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                <Bell size={10} />
                <span>Mendatang: {nextPrayer.name} ({nextPrayer.time})</span>
              </div>
            )}
          </div>

          {loadingPrayer ? (
            <div className="text-xs text-slate-500 font-medium py-1">Memuat Jadwal Sholat...</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 w-full">
              {prayerList.map((p) => {
                const isNext = nextPrayer && nextPrayer.name.toUpperCase().includes(p.label);
                return (
                  <div 
                    key={p.label}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all ${
                      isNext 
                        ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-300 shadow-md scale-105' 
                        : 'bg-white/50 text-slate-700 border-white/60 hover:bg-white/70'
                    }`}
                  >
                    <span className={`text-[9px] font-black uppercase tracking-wider ${isNext ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {p.label}
                    </span>
                    <span className={`text-xs font-extrabold mt-0.5 ${isNext ? 'text-white' : 'text-blue-950'}`}>
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
  );
}

