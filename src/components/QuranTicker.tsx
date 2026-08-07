import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';

interface Ayah {
  text: string;
  translation: string;
  surah: string;
  number: number;
}

export function QuranTicker() {
  const [ayah, setAyah] = useState<Ayah | null>(null);

  useEffect(() => {
    const fetchAyah = async () => {
      try {
        const randomAyahNum = Math.floor(Math.random() * 6236) + 1;
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${randomAyahNum}/editions/quran-uthmani,id.indonesian`);
        const data = await res.json();
        
        if (data.code === 200) {
          const ar = data.data[0];
          const id = data.data[1];
          setAyah({
            text: ar.text,
            translation: id.text,
            surah: ar.surah.englishName,
            number: ar.numberInSurah
          });
        }
      } catch (e) {
        console.error("Error fetching ayah", e);
      }
    };
    
    fetchAyah();
    const interval = setInterval(fetchAyah, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  if (!ayah) return null;

  return (
    <div className="glass-box h-12 flex items-stretch overflow-hidden mb-6 !rounded-2xl">
      <div className="bg-sky-500/10 text-sky-600 border-r border-white/40 flex items-center justify-center px-4 font-bold text-xs tracking-wider whitespace-nowrap uppercase">
        <BookOpen size={16} className="mr-2 text-sky-500" /> QURAN
      </div>
      <div className="flex-1 flex items-center bg-transparent overflow-hidden px-4 text-sm relative" title="Arahkan kursor ke sini untuk menjeda bacaan">
        <div className="font-semibold flex items-center py-2 animate-marquee-slow whitespace-nowrap absolute min-w-max cursor-pointer">
          <div className="inline-flex items-center gap-4">
            <span className="font-bold text-lg text-orange-600 mr-4 font-arabic drop-shadow-sm" dir="rtl">{ayah.text}</span>
            <span className="mr-2 font-medium text-slate-700">"{ayah.translation}"</span>
            <span className="text-xs font-bold bg-white/60 border border-white/80 text-sky-700 px-3 py-1 rounded-full tracking-wider shadow-sm">
              QS. {ayah.surah.toUpperCase()} : {ayah.number}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
