import { useState, useEffect } from 'react';
import { LogIn, LogOut } from 'lucide-react';

interface HeroProps {
  isAdmin: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

export function Hero({ isAdmin, onLogin, onLogout }: HeroProps) {
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [greeting, setGreeting] = useState('SELAMAT SIANG, REKAN!');

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

  return (
    <div className="glass-box p-0 flex flex-wrap relative overflow-hidden mb-6">
      <div 
        className="flex-1 flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 sm:p-8 bg-white/20"
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
            <span className="bg-sky-500/20 text-sky-700 border border-sky-500/30 text-xs font-bold py-1 px-3 uppercase rounded-full shadow-sm">
              Logistik Supervisor & Developer
            </span>
          </div>

          <div className="flex justify-center sm:justify-start gap-3 flex-wrap mt-2">
            <a href="https://wa.me/6281911934000" target="_blank" rel="noreferrer" className="glass-btn !bg-orange-500/10 hover:!bg-orange-500/20 text-orange-600">
              081911934000
            </a>
            <a href="mailto:dede.suparman@kino.co.id" className="glass-btn !bg-sky-500/10 hover:!bg-sky-500/20 text-sky-600">
              dede.suparman@kino.co.id
            </a>
            <a href="mailto:dedesuparman333@gmail.com" className="glass-btn !bg-indigo-500/10 hover:!bg-indigo-500/20 text-indigo-600">
              dedesuparman333@gmail.com
            </a>
          </div>
        </div>
      </div>
      
      <div className="p-8 flex flex-col justify-center items-end min-w-[280px] bg-white/30 backdrop-blur-lg lg:border-l border-white/50 lg:border-t-0 border-t max-lg:items-start max-lg:w-full z-10 relative">
        <div className="font-bold uppercase text-xs text-orange-700 tracking-widest mb-3 border border-orange-500/30 px-3 py-1 bg-orange-500/10 rounded-full shadow-sm">
          {dateStr || 'MEMUAT...'}
        </div>
        <div className="font-black text-sky-600 text-5xl leading-none mb-6 tracking-tight max-lg:text-4xl drop-shadow-md">
          {time || '--:--:--'}
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isAdmin ? (
            <button onClick={onLogin} className="glass-btn !bg-white/60 hover:!bg-white/80">
              <LogIn size={18} className="text-sky-600" /> <span className="text-sky-700">LOGIN ADMIN</span>
            </button>
          ) : (
            <button onClick={onLogout} className="glass-btn !bg-orange-500/80 hover:!bg-orange-500 text-white border-orange-400">
              <LogOut size={18} /> LOGOUT
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
