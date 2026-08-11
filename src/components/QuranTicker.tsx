import { useState, useEffect } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Pause, Play, RotateCw } from 'lucide-react';

interface AyahItem {
  number: number;
  numberInSurah: number;
  arabicText: string;
  translation: string;
}

interface SurahData {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  ayahs: AyahItem[];
}

export function QuranTicker() {
  const [surahData, setSurahData] = useState<SurahData | null>(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pick a random surah 1..114 on start
  const [surahNumber, setSurahNumber] = useState<number>(() => Math.floor(Math.random() * 114) + 1);

  // Fetch complete Surah data when surahNumber changes
  const fetchSurah = async (sNum: number) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${sNum}/editions/quran-uthmani,id.indonesian`);
      const data = await res.json();

      if (data.code === 200 && data.data && data.data.length >= 2) {
        const arSurah = data.data[0];
        const idSurah = data.data[1];

        const ayahsList: AyahItem[] = arSurah.ayahs.map((arItem: { number: number; numberInSurah: number; text: string }, index: number) => {
          const idItem = idSurah.ayahs[index];
          return {
            number: arItem.number,
            numberInSurah: arItem.numberInSurah,
            arabicText: arItem.text,
            translation: idItem ? idItem.text : ''
          };
        });

        setSurahData({
          number: arSurah.number,
          name: arSurah.name,
          englishName: arSurah.englishName,
          numberOfAyahs: arSurah.numberOfAyahs,
          ayahs: ayahsList
        });
        setCurrentAyahIndex(0);
      } else {
        setErrorMsg('Gagal memuat data Surah');
      }
    } catch (e) {
      console.error("Error fetching surah:", e);
      setErrorMsg('Koneksi terganggu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurah(surahNumber);
  }, [surahNumber]);

  const pickNewSurah = () => {
    let nextNum = Math.floor(Math.random() * 114) + 1;
    if (nextNum === surahNumber) {
      nextNum = (surahNumber % 114) + 1;
    }
    setSurahNumber(nextNum);
  };

  const handleNextAyah = () => {
    if (!surahData || surahData.ayahs.length === 0) return;

    if (currentAyahIndex + 1 < surahData.ayahs.length) {
      setCurrentAyahIndex(prev => prev + 1);
    } else {
      // Surah completed! Pick a new random surah
      pickNewSurah();
    }
  };

  const handlePrevAyah = () => {
    if (!surahData || surahData.ayahs.length === 0) return;
    if (currentAyahIndex > 0) {
      setCurrentAyahIndex(prev => prev - 1);
    }
  };

  // Timer auto advance every 20 seconds unless paused
  useEffect(() => {
    if (isPaused || loading || !surahData) return;

    const interval = setInterval(() => {
      handleNextAyah();
    }, 20000);

    return () => clearInterval(interval);
  }, [isPaused, loading, surahData, currentAyahIndex]);

  if (loading) {
    return (
      <div className="glass-box h-12 flex items-center px-4 mb-6 !rounded-2xl text-xs text-slate-500 font-bold animate-pulse">
        <BookOpen size={16} className="mr-2 text-sky-500" /> Memuat Surah Al-Qur'an...
      </div>
    );
  }

  if (errorMsg || !surahData || surahData.ayahs.length === 0) {
    return (
      <div className="glass-box h-12 flex items-center justify-between px-4 mb-6 !rounded-2xl text-xs text-slate-600 font-bold">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-sky-500" />
          <span>Al-Qur'an (Gagal Memuat)</span>
        </div>
        <button 
          onClick={() => fetchSurah(surahNumber)}
          className="text-xs bg-sky-500 text-white px-3 py-1 rounded-lg font-bold hover:bg-sky-600 transition-all cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const currentAyah = surahData.ayahs[currentAyahIndex] || surahData.ayahs[0];

  return (
    <div className="glass-box min-h-[52px] py-1.5 flex flex-col md:flex-row items-stretch md:items-center overflow-hidden mb-6 !rounded-2xl border border-white/60 shadow-xs gap-2 md:gap-0">
      {/* Header Label + Surah Badge */}
      <div className="bg-sky-500/10 text-sky-700 border-b md:border-b-0 md:border-r border-white/40 flex items-center justify-between md:justify-start px-3.5 py-1 font-bold text-xs tracking-wider shrink-0 gap-2">
        <div className="flex items-center gap-1.5">
          <BookOpen size={16} className="text-sky-600 shrink-0" />
          <span className="font-extrabold uppercase">AL-QUR'AN</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] bg-white/80 border border-sky-200 text-sky-800 px-2 py-0.5 rounded-full font-extrabold tracking-tight">
            QS. {surahData.englishName.toUpperCase()} : {currentAyah.numberInSurah} / {surahData.numberOfAyahs}
          </span>
        </div>
      </div>

      {/* Main Text Content */}
      <div className="flex-1 flex items-center bg-transparent overflow-hidden px-4 text-sm relative group cursor-pointer" title="Persekuensial dari ayat 1 sampai akhir surah">
        <div className="font-semibold flex items-center py-1.5 animate-marquee-slow whitespace-nowrap min-w-max">
          <div className="inline-flex items-center gap-3">
            <span className="font-bold text-lg sm:text-xl text-orange-600 font-arabic drop-shadow-2xs mr-3" dir="rtl">
              {currentAyah.arabicText}
            </span>
            <span className="font-medium text-slate-700 text-xs sm:text-sm">
              "{currentAyah.translation}"
            </span>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100/70 px-2 py-0.5 rounded-md border border-slate-200">
              Surah ke-{surahData.number}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-end gap-1 px-3 border-t md:border-t-0 md:border-l border-white/40 shrink-0 py-1 bg-white/20 md:bg-transparent">
        <button
          onClick={handlePrevAyah}
          disabled={currentAyahIndex === 0}
          className={`p-1.5 rounded-lg text-slate-600 hover:bg-white/80 transition-all ${currentAyahIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:text-sky-700'}`}
          title="Ayat Sebelumnya"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-white/80 transition-all cursor-pointer hover:text-sky-700"
          title={isPaused ? "Lanjutkan Otomatis" : "Jeda (Pause)"}
        >
          {isPaused ? <Play size={15} className="text-amber-600 fill-amber-500" /> : <Pause size={15} />}
        </button>

        <button
          onClick={handleNextAyah}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-white/80 transition-all cursor-pointer hover:text-sky-700"
          title={currentAyahIndex + 1 < surahData.numberOfAyahs ? "Ayat Berikutnya" : "Selesai Surah (Ke Surah Berikutnya)"}
        >
          <ChevronRight size={16} />
        </button>

        <button
          onClick={pickNewSurah}
          className="ml-1 px-2 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-800 text-[10px] font-bold border border-sky-300/40 flex items-center gap-1 transition-all cursor-pointer"
          title="Ganti ke Surah Lain (Random)"
        >
          <RotateCw size={12} />
          <span className="hidden sm:inline">Ganti Surah</span>
        </button>
      </div>
    </div>
  );
}

