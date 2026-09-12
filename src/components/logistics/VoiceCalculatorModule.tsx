import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Calculator, 
  Mic, 
  MicOff, 
  Pause,
  Play,
  Square,
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Delete, 
  Copy, 
  Check, 
  Sparkles, 
  Info, 
  Equal, 
  Plus, 
  Minus, 
  Divide, 
  X as TimesIcon, 
  Percent, 
  ArrowRight,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { 
  processVoiceInput, 
  evaluateMathExpression, 
  formatIndoNumber, 
  numberToIndonesianWords,
  isOperator
} from '../../utils/voiceMathParser';

export function VoiceCalculatorModule() {
  const [expression, setExpression] = useState<string>(''); // Clean display expression (e.g. "25 + 50 × 2")
  const [result, setResult] = useState<number | null>(null);
  const [inWords, setInWords] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'muted' | 'accumulating' | 'calculated' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoSpeakResult, setAutoSpeakResult] = useState<boolean>(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showVoiceGuide, setShowVoiceGuide] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const isExplicitStopRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  isMutedRef.current = isMuted;

  const audioContextRef = useRef<AudioContext | null>(null);
  const displayContainerRef = useRef<HTMLDivElement>(null);

  // Keep expression state ref for recognition callback access
  const expressionRef = useRef<string>('');
  expressionRef.current = expression;

  // Web Audio chime generator
  const playSoundEffect = useCallback((type: 'beep' | 'operator' | 'success' | 'clear' | 'error' | 'mute' | 'stop') => {
    if (!soundEffectsEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'beep') {
        // Soft click/token recognized
        osc.frequency.setValueAtTime(587.33, now); // D5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'operator') {
        // Mid tone
        osc.frequency.setValueAtTime(440, now); // A4
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'mute') {
        // Double low tap for mute/pause
        osc.frequency.setValueAtTime(370, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'stop') {
        // Descending stop tone
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'success') {
        // Joyful 2-chord fanfare
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'clear') {
        osc.frequency.setValueAtTime(329.63, now); // E4
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'error') {
        osc.frequency.setValueAtTime(220, now); // A3
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // Audio context not allowed or unsupported
    }
  }, [soundEffectsEnabled]);

  // Text to Speech (TTS) in Indonesian
  const speakIndonesian = useCallback((textToSpeak: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const indoVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
      if (indoVoice) {
        utterance.voice = indoVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  // Calculate execution handler
  const executeCalculation = useCallback((currentExpr?: string) => {
    const exprToEval = (currentExpr !== undefined ? currentExpr : expressionRef.current).trim();
    if (!exprToEval) {
      setErrorMessage('Belum ada ekspresi atau angka yang dimasukkan.');
      setStatus('error');
      playSoundEffect('error');
      return;
    }

    const { result: calculatedVal, error } = evaluateMathExpression(exprToEval);

    if (error || calculatedVal === null || isNaN(calculatedVal)) {
      setErrorMessage(error || 'Format rumus belum lengkap. Periksa kembali angka dan operatornya.');
      setStatus('error');
      playSoundEffect('error');
      return;
    }

    setResult(calculatedVal);
    const spoken = numberToIndonesianWords(calculatedVal);
    setInWords(spoken);
    setStatus('calculated');
    setErrorMessage(null);
    playSoundEffect('success');

    // Voice announcement
    if (autoSpeakResult) {
      const formatted = formatIndoNumber(calculatedVal);
      speakIndonesian(`Hasilnya adalah ${formatted}. ${spoken}`);
    }
  }, [autoSpeakResult, playSoundEffect, speakIndonesian]);

  // Stop listening explicitly
  const stopListening = useCallback(() => {
    isExplicitStopRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsListening(false);
    setIsMuted(false);
    setInterimTranscript('');
    playSoundEffect('stop');
    setStatus(expressionRef.current ? 'accumulating' : 'idle');
  }, [playSoundEffect]);

  // Toggle Mute / Jeda (Pause speech recognition without stopping session or clearing numbers)
  const toggleMute = useCallback(() => {
    if (!isListening) {
      // If not currently listening, start listening
      startListening();
      return;
    }

    if (isMuted) {
      // Unmute: Resume listening
      setIsMuted(false);
      isMutedRef.current = false;
      setStatus(expressionRef.current ? 'accumulating' : 'listening');
      playSoundEffect('beep');
    } else {
      // Mute: Pause listening to allow break/jeda without background noise entering
      setIsMuted(true);
      isMutedRef.current = true;
      setInterimTranscript('');
      setStatus('muted');
      playSoundEffect('mute');
    }
  }, [isListening, isMuted, playSoundEffect]);

  // Voice speech processing handler
  const handleTranscriptIncoming = useCallback((spokenText: string) => {
    const parsed = processVoiceInput(spokenText);

    // If currently muted (jeda), only accept "unmute" or "lanjut" voice command
    if (isMutedRef.current) {
      if (parsed.shouldUnmute) {
        setIsMuted(false);
        isMutedRef.current = false;
        setStatus(expressionRef.current ? 'accumulating' : 'listening');
        playSoundEffect('beep');
      }
      return; // Ignore all other speech while muted
    }

    // 1. Check for Stop command
    if (parsed.shouldStop) {
      stopListening();
      return;
    }

    // 2. Check for Mute / Jeda command
    if (parsed.shouldMute) {
      setIsMuted(true);
      isMutedRef.current = true;
      setInterimTranscript('');
      setStatus('muted');
      playSoundEffect('mute');
      return;
    }

    // 3. Check for Reset / Clear
    if (parsed.shouldClear) {
      setExpression('');
      expressionRef.current = '';
      setResult(null);
      setInWords('');
      setStatus('idle');
      setErrorMessage(null);
      setInterimTranscript('');
      playSoundEffect('clear');
      return;
    }

    // 4. Check for Undo / Backspace
    if (parsed.shouldUndo) {
      setExpression(prev => {
        const tokens = prev.trim().split(/\s+/).filter(Boolean);
        if (tokens.length <= 1) {
          expressionRef.current = '';
          return '';
        }
        tokens.pop();
        const updated = tokens.join(' ');
        expressionRef.current = updated;
        return updated;
      });
      playSoundEffect('beep');
      return;
    }

    // 5. Accumulate new mathematical tokens without calculating yet
    if (parsed.displayExpression) {
      setExpression(prev => {
        let next = prev.trim();
        const newTokens = parsed.displayExpression.trim().split(/\s+/).filter(Boolean);

        if (!next) {
          next = parsed.displayExpression;
        } else {
          for (const token of newTokens) {
            const lastToken = next.split(/\s+/).pop();
            if (isOperator(lastToken || '') && isOperator(token)) {
              // Replace trailing operator with new one
              const all = next.split(/\s+/);
              all[all.length - 1] = token;
              next = all.join(' ');
            } else {
              next = `${next} ${token}`;
            }
          }
        }

        expressionRef.current = next;
        return next;
      });

      // Keep in accumulating state
      setStatus('accumulating');
      playSoundEffect('beep');
    }

    // 6. CRITICAL: ONLY execute calculation if "sama dengan" / "hitung" was explicitly spoken!
    if (parsed.shouldCalculate) {
      executeCalculation(expressionRef.current);
    }
  }, [executeCalculation, playSoundEffect, stopListening]);

  // Start Voice Recording
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Browser Anda belum mendukung Web Speech Recognition API. Silakan gunakan Google Chrome atau browser Chromium.');
      return;
    }

    try {
      isExplicitStopRef.current = false;
      setIsMuted(false);
      isMutedRef.current = false;

      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatus(prev => (prev === 'calculated' ? 'idle' : expressionRef.current ? 'accumulating' : 'listening'));
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        // If muted, drop incoming interim transcripts
        if (isMutedRef.current) {
          return;
        }

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            const transcript = item[0].transcript;
            handleTranscriptIncoming(transcript);
            setInterimTranscript('');
          } else {
            interim += item[0].transcript;
          }
        }
        if (interim && !isMutedRef.current) {
          setInterimTranscript(interim);
          // Check if interim contains "sama dengan" or "stop" or "jeda"
          if (
            /\bsama\s*dengan\b/i.test(interim) || 
            /\bhitung\b/i.test(interim) || 
            /\bhasilnya\b/i.test(interim) ||
            /\b(jeda|mute|pause)\b/i.test(interim) ||
            /\b(stop|berhenti)\b/i.test(interim)
          ) {
            handleTranscriptIncoming(interim);
            setInterimTranscript('');
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Keep listening, user just paused
          return;
        }
        if (event.error === 'not-allowed') {
          setErrorMessage('Izin mikrofon ditolak. Silakan izinkan akses mikrofon di setelan browser.');
          setIsListening(false);
          setStatus('error');
        }
      };

      recognition.onend = () => {
        // If user didn't explicitly stop, auto-restart continuous recognition for smooth long speech
        if (!isExplicitStopRef.current && isListening) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setErrorMessage('Gagal mengaktifkan mikrofon: ' + (err.message || 'Unknown error'));
      setIsListening(false);
    }
  }, [handleTranscriptIncoming, isListening]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      isExplicitStopRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Keyboard navigation & typing support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in other inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        executeCalculation();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeypadPress('DEL');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleKeypadPress('AC');
      } else if ('0123456789+-*/()%.'.includes(e.key)) {
        e.preventDefault();
        let char = e.key;
        if (char === '*') char = '×';
        if (char === '/') char = '÷';
        handleKeypadPress(char);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeCalculation]);

  // Keypad press handler
  const handleKeypadPress = (btn: string) => {
    setErrorMessage(null);

    if (btn === 'AC') {
      setExpression('');
      expressionRef.current = '';
      setResult(null);
      setInWords('');
      setStatus('idle');
      playSoundEffect('clear');
      return;
    }

    if (btn === 'DEL') {
      setExpression(prev => {
        const tokens = prev.trim().split(/\s+/).filter(Boolean);
        if (tokens.length <= 1) {
          expressionRef.current = '';
          return '';
        }
        tokens.pop();
        const updated = tokens.join(' ');
        expressionRef.current = updated;
        return updated;
      });
      playSoundEffect('beep');
      return;
    }

    if (btn === '=') {
      executeCalculation();
      return;
    }

    // Number or operator
    setExpression(prev => {
      let current = prev.trim();
      const isNewOp = ['+', '-', '×', '÷', '%'].includes(btn);

      if (status === 'calculated' && isNewOp && result !== null) {
        // Continue calculating from result
        current = `${result} ${btn}`;
        setStatus('accumulating');
        expressionRef.current = current;
        playSoundEffect('operator');
        return current;
      }

      if (isNewOp) {
        const lastToken = current.split(/\s+/).pop();
        if (lastToken && isOperator(lastToken)) {
          // Replace operator
          const parts = current.split(/\s+/);
          parts[parts.length - 1] = btn;
          current = parts.join(' ');
        } else if (current) {
          current = `${current} ${btn}`;
        }
        playSoundEffect('operator');
      } else {
        // Number or parenthesis
        if (['(', ')'].includes(btn)) {
          current = current ? `${current} ${btn}` : btn;
        } else {
          // Digit or dot
          const lastToken = current.split(/\s+/).pop();
          if (lastToken && !isOperator(lastToken) && lastToken !== '(' && lastToken !== ')') {
            // Append to current number token
            const parts = current.split(/\s+/);
            parts[parts.length - 1] = lastToken + btn;
            current = parts.join(' ');
          } else {
            current = current ? `${current} ${btn}` : btn;
          }
        }
        playSoundEffect('beep');
      }

      setStatus('accumulating');
      expressionRef.current = current;
      return current;
    });
  };

  // Copy result to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 animate-fade-in text-slate-800">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
            <Calculator size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Kalkulator Suara
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles size={12} className="text-indigo-600" />
                Mode Akumulator Suara
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Tampung rantai operasi hitung panjang via suara. 
              <span className="font-semibold text-indigo-700"> Sebelum perintah &ldquo;Sama Dengan&rdquo;, kalkulator tidak akan menghitung</span> agar semua angka tertampung terlebih dahulu. Dilengkapi tombol Jeda (Mute) & Stop.
            </p>
          </div>
        </div>

        {/* TOP QUICK ACTIONS: Guide & Audio Setting */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setAutoSpeakResult(!autoSpeakResult)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-colors shadow-2xs ${
              autoSpeakResult
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
            title={autoSpeakResult ? 'Suara Pembacaan Hasil Aktif' : 'Suara Pembacaan Hasil Mati'}
          >
            {autoSpeakResult ? <Volume2 size={15} className="text-indigo-600" /> : <VolumeX size={15} />}
            <span>{autoSpeakResult ? 'Baca Hasil: Nyala' : 'Baca Hasil: Mati'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowVoiceGuide(!showVoiceGuide)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Panduan Perintah Suara"
          >
            <HelpCircle size={15} className="text-indigo-600" />
            <span>Panduan Suara</span>
          </button>
        </div>
      </div>

      {/* VOICE GUIDE MODAL / COLLAPSIBLE */}
      {showVoiceGuide && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 sm:p-5 animate-fade-in">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600" />
              Daftar Perintah Suara yang Dikenali (Bahasa Indonesia)
            </h3>
            <button
              type="button"
              onClick={() => setShowVoiceGuide(false)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="font-bold text-slate-900 block mb-1">➕ Penjumlahan</span>
              <p className="text-slate-600 leading-relaxed">
                Ucapkan: <span className="font-mono font-medium text-indigo-700">&ldquo;tambah&rdquo;</span>, <span className="font-mono font-medium text-indigo-700">&ldquo;plus&rdquo;</span>, <span className="font-mono font-medium text-indigo-700">&ldquo;dan&rdquo;</span>.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="font-bold text-slate-900 block mb-1">➖ Pengurangan</span>
              <p className="text-slate-600 leading-relaxed">
                Ucapkan: <span className="font-mono font-medium text-indigo-700">&ldquo;kurang&rdquo;</span>, <span className="font-mono font-medium text-indigo-700">&ldquo;minus&rdquo;</span>.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="font-bold text-slate-900 block mb-1">✖️ Perkalian</span>
              <p className="text-slate-600 leading-relaxed">
                Ucapkan: <span className="font-mono font-medium text-indigo-700">&ldquo;kali&rdquo;</span>, <span className="font-mono font-medium text-indigo-700">&ldquo;dikali&rdquo;</span>.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="font-bold text-slate-900 block mb-1">➗ Pembagian</span>
              <p className="text-slate-600 leading-relaxed">
                Ucapkan: <span className="font-mono font-medium text-indigo-700">&ldquo;bagi&rdquo;</span>, <span className="font-mono font-medium text-indigo-700">&ldquo;per&rdquo;</span>.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs ring-1 ring-emerald-300">
              <span className="font-bold text-emerald-800 block mb-1">🟰 Eksekusi Hitung</span>
              <p className="text-slate-600 leading-relaxed">
                Ucapkan: <span className="font-mono font-bold text-emerald-700">&ldquo;sama dengan&rdquo;</span>, <span className="font-mono font-bold text-emerald-700">&ldquo;hitung&rdquo;</span>, atau <span className="font-mono font-bold text-emerald-700">&ldquo;total&rdquo;</span>.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
              <span className="font-bold text-amber-800 block mb-1">⏸️ Jeda / Mute</span>
              <p className="text-slate-600 leading-relaxed">
                Ucapkan: <span className="font-mono font-medium text-amber-700">&ldquo;jeda&rdquo;</span> atau <span className="font-mono font-medium text-amber-700">&ldquo;mute&rdquo;</span> untuk jeda sementara tanpa mereset angka.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-2xs">
              <span className="font-bold text-rose-800 block mb-1">⏹️ Stop / Matikan</span>
              <p className="text-slate-600 leading-relaxed">
                Ucapkan: <span className="font-mono font-medium text-rose-700">&ldquo;stop&rdquo;</span> atau <span className="font-mono font-medium text-rose-700">&ldquo;berhenti&rdquo;</span> untuk mematikan mic.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
              <span className="font-bold text-slate-800 block mb-1">🔄 Koreksi & Reset</span>
              <p className="text-slate-600 leading-relaxed">
                Ucapkan: <span className="font-mono font-medium text-rose-700">&ldquo;hapus&rdquo;</span> (undo) atau <span className="font-mono font-medium text-rose-700">&ldquo;reset&rdquo;</span> (bersihkan).
              </p>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-indigo-900 bg-indigo-100/60 p-2.5 rounded-xl flex items-center gap-2">
            <Info size={14} className="shrink-0 text-indigo-700" />
            <span>Contoh: <em>&ldquo;Dua puluh lima tambah lima puluh kali dua [klik Jeda / sebut Jeda jika mau istirahat] ... lanjut ... sama dengan&rdquo;</em></span>
          </div>
        </div>
      )}

      {/* MAIN CALCULATOR VIEWPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT / TOP: VOICE DISPLAY & CONTROLS (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* VOICE INPUT & CONTROLS CARD */}
          <div className={`rounded-2xl border transition-all duration-300 p-5 relative overflow-hidden ${
            isListening && !isMuted
              ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl shadow-indigo-950/20 border-indigo-700' 
              : isMuted
                ? 'bg-gradient-to-br from-amber-950/90 via-slate-900 to-amber-900/90 text-white shadow-lg border-amber-600/60'
                : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
            {/* Top row: Status header */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100/10">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  isListening && !isMuted 
                    ? 'bg-emerald-400 animate-ping' 
                    : isMuted 
                      ? 'bg-amber-400' 
                      : 'bg-slate-300'
                }`} />
                <h2 className={`text-sm font-bold tracking-tight ${isListening || isMuted ? 'text-white' : 'text-slate-900'}`}>
                  {isListening && !isMuted && 'Mikrofon Aktif — Sedang Mendengarkan'}
                  {isMuted && 'Mikrofon Dijeda (Mute) — Angka Tersimpan'}
                  {!isListening && 'Mikrofon Siap — Klik Mulai Bicara'}
                </h2>
              </div>

              <div className="text-xs font-semibold">
                {isListening && !isMuted && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live
                  </span>
                )}
                {isMuted && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Pause size={11} />
                    Jeda (Mute)
                  </span>
                )}
                {!isListening && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    Standby
                  </span>
                )}
              </div>
            </div>

            {/* ACTION CONTROLS: MULAI, JEDA/MUTE, STOP */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              
              {/* BUTTON 1: MULAI BICARA */}
              {!isListening ? (
                <button
                  type="button"
                  onClick={startListening}
                  className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 active:scale-97 transition-all cursor-pointer"
                >
                  <Mic size={18} className="text-indigo-200" />
                  <span>Mulai Bicara</span>
                </button>
              ) : (
                <div className="py-2.5 px-3 rounded-xl bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/15">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Mic Berjalan</span>
                </div>
              )}

              {/* BUTTON 2: JEDA / MUTE (OR UNMUTE) */}
              <button
                type="button"
                onClick={toggleMute}
                disabled={!isListening && !isMuted}
                className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-97 cursor-pointer ${
                  !isListening && !isMuted
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : isMuted
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/50'
                      : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30'
                }`}
                title={isMuted ? 'Lanjutkan Bicara (Unmute)' : 'Jeda Sementara (Mute suara latar tanpa reset angka)'}
              >
                {isMuted ? (
                  <>
                    <Play size={16} className="text-amber-200 fill-amber-200" />
                    <span>Lanjut (Unmute)</span>
                  </>
                ) : (
                  <>
                    <Pause size={16} className={isListening ? 'text-amber-300' : 'text-slate-400'} />
                    <span>Jeda (Mute)</span>
                  </>
                )}
              </button>

              {/* BUTTON 3: STOP */}
              <button
                type="button"
                onClick={stopListening}
                disabled={!isListening && !isMuted}
                className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-97 ${
                  !isListening && !isMuted
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 cursor-pointer'
                }`}
                title="Hentikan Mikrofon Sepenuhnya"
              >
                <Square size={15} className={isListening || isMuted ? 'text-rose-300 fill-rose-300' : 'text-slate-400'} />
                <span>Stop Mic</span>
              </button>
            </div>

            {/* LIVE VOICE EQUALIZER / WAVEFORM (WHEN LISTENING & NOT MUTED) */}
            {isListening && !isMuted && (
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15 mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {[4, 12, 8, 20, 16, 24, 10, 18, 14, 22, 8, 16, 6].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-gradient-to-t from-indigo-400 to-rose-400 rounded-full animate-pulse"
                      style={{
                        height: `${h}px`,
                        animationDelay: `${i * 70}ms`,
                        animationDuration: '500ms'
                      }}
                    />
                  ))}
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-indigo-200 block">
                    {interimTranscript ? `Mendengar: "${interimTranscript}"` : 'Menunggu ucapan angka...'}
                  </span>
                </div>
              </div>
            )}

            {/* STATUS BANNER & REAL-TIME FEEDBACK */}
            <div className={`rounded-xl p-3 text-xs flex items-center gap-2.5 transition-colors ${
              isMuted
                ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200'
                : status === 'accumulating'
                  ? isListening
                    ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200'
                    : 'bg-amber-50 border border-amber-200 text-amber-800'
                  : status === 'calculated'
                    ? isListening
                      ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : isListening
                      ? 'bg-white/5 border border-white/10 text-indigo-200'
                      : 'bg-slate-50 border border-slate-200 text-slate-600'
            }`}>
              {isMuted ? (
                <>
                  <Pause size={16} className="shrink-0 text-amber-400" />
                  <div className="flex-1">
                    <span className="font-bold">Jeda Sementara (Mute):</span> Mikrofon di-pause agar suara latar tidak masuk. Angka yang sudah tertampung aman. Klik <strong>&ldquo;Lanjut (Unmute)&rdquo;</strong> saat siap bicara lagi.
                  </div>
                </>
              ) : status === 'accumulating' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold">Menampung Angka (Belum Dihitung):</span> Operasi sedang disimpan. Ucapkan <strong className="underline decoration-amber-400">&ldquo;Sama Dengan&rdquo;</strong> atau tekan tombol <strong className="font-mono bg-white/20 px-1 py-0.5 rounded">&ldquo;=&rdquo;</strong> untuk menghitung.
                  </div>
                </>
              ) : status === 'calculated' ? (
                <>
                  <Check size={16} className="shrink-0 text-emerald-500" />
                  <div className="flex-1">
                    <span className="font-bold">Selesai Dihitung:</span> Hasil telah dievaluasi. Ucapkan operasi baru atau klik tombol untuk melanjutkan.
                  </div>
                </>
              ) : (
                <>
                  <Info size={16} className="shrink-0 text-indigo-500" />
                  <div className="flex-1">
                    Sebutkan angka bebas (misal: <em>&ldquo;seratus tambah lima puluh kali dua&rdquo;</em>). Gunakan tombol <strong>Jeda (Mute)</strong> jika ingin jeda bicara, lalu akhiri dengan <em>&ldquo;sama dengan&rdquo;</em>.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* MAIN FORMULA / EXPRESSION TAPE DISPLAY */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            
            {/* Header / Expression Label */}
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Ekspresi Matematika (Rantai Angka Tertampung)
              </span>
              <div className="flex items-center gap-2">
                {expression && (
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('DEL')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Delete size={13} />
                    <span>Undo Angka</span>
                  </button>
                )}
                {expression && (
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('AC')}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Reset (AC)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Formula Display Area with Tokens */}
            <div 
              ref={displayContainerRef}
              className="min-h-[90px] bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 flex flex-wrap items-center content-start gap-1.5 font-mono text-lg sm:text-xl overflow-x-auto select-all"
            >
              {expression ? (
                expression.split(/\s+/).map((tok, idx) => {
                  const isOp = isOperator(tok);
                  const isParen = tok === '(' || tok === ')';
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-xl font-bold transition-all shadow-2xs ${
                        isOp
                          ? 'bg-amber-100 text-amber-900 border border-amber-300/80'
                          : isParen
                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                            : 'bg-white text-slate-900 border border-slate-200 font-semibold'
                      }`}
                    >
                      {tok}
                    </span>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-sans italic py-4">
                  <span>Belum ada angka. Silakan klik &ldquo;Mulai Bicara&rdquo; atau gunakan keypad manual di sebelah kanan.</span>
                </div>
              )}
            </div>

            {/* ERROR MESSAGE DISPLAY */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-center gap-2 animate-shake">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* RESULT SECTION */}
            {result !== null && (
              <div className="bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-white rounded-2xl p-5 border border-indigo-200/80 shadow-xs space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Equal size={15} className="text-indigo-600" />
                    Hasil Akhir
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => speakIndonesian(`Hasilnya adalah ${formatIndoNumber(result)}. ${inWords}`)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                      title="Dengarkan Ulang Hasil Suara"
                    >
                      <Volume2 size={13} className={isSpeaking ? 'text-indigo-600 animate-pulse' : ''} />
                      <span>{isSpeaking ? 'Membaca...' : 'Ucapkan'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(result.toString())}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                      title="Salin Angka Hasil"
                    >
                      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copied ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                {/* Big Formatted Result */}
                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                  {formatIndoNumber(result)}
                </div>

                {/* In Words Terbilang */}
                {inWords && (
                  <div className="text-xs text-indigo-900/80 bg-white/80 rounded-xl px-3 py-2 border border-indigo-100 flex items-start gap-2">
                    <Sparkles size={14} className="shrink-0 text-amber-500 mt-0.5" />
                    <span className="font-medium italic">
                      Terbilang: &ldquo;{inWords}&rdquo;
                    </span>
                  </div>
                )}

                {/* Action Buttons: Continue or New */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setExpression(`${result} +`);
                      expressionRef.current = `${result} +`;
                      setStatus('accumulating');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <span>Lanjut Hitung (+)</span>
                    <ArrowRight size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeypadPress('AC')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Hitung Rumus Baru</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: MANUAL KEYPAD & QUICK OPERATORS (5 COLS) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Calculator size={16} className="text-indigo-600" />
              Tombol & Koreksi Manual
            </h3>
            <span className="text-[11px] text-slate-400">Dukungan Keyboard PC</span>
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-4 gap-2">
            
            {/* Row 1 */}
            <button
              type="button"
              onClick={() => handleKeypadPress('AC')}
              className="py-3 text-sm font-black rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              AC
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('(')}
              className="py-3 text-sm font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 active:scale-95 transition-all cursor-pointer"
            >
              (
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress(')')}
              className="py-3 text-sm font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 active:scale-95 transition-all cursor-pointer"
            >
              )
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('÷')}
              className="py-3 text-base font-black rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 active:scale-95 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
            >
              ÷
            </button>

            {/* Row 2 */}
            <button
              type="button"
              onClick={() => handleKeypadPress('7')}
              className="py-3.5 text-base font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('8')}
              className="py-3.5 text-base font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('9')}
              className="py-3.5 text-base font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              9
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('×')}
              className="py-3.5 text-base font-black rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 active:scale-95 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
            >
              ×
            </button>

            {/* Row 3 */}
            <button
              type="button"
              onClick={() => handleKeypadPress('4')}
              className="py-3.5 text-base font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('5')}
              className="py-3.5 text-base font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('6')}
              className="py-3.5 text-base font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              6
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('-')}
              className="py-3.5 text-base font-black rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 active:scale-95 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
            >
              −
            </button>

            {/* Row 4 */}
            <button
              type="button"
              onClick={() => handleKeypadPress('1')}
              className="py-3.5 text-base font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('2')}
              className="py-3.5 text-base font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('3')}
              className="py-3.5 text-base font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              3
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('+')}
              className="py-3.5 text-base font-black rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 active:scale-95 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
            >
              +
            </button>

            {/* Row 5 */}
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-3.5 text-base font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('00')}
              className="py-3.5 text-sm font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              00
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('.')}
              className="py-3.5 text-base font-black rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              ,
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('DEL')}
              className="py-3.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Delete size={15} />
            </button>
          </div>

          {/* BIG PROMINENT EQUALS BUTTON (SAMA DENGAN) */}
          <button
            type="button"
            onClick={() => handleKeypadPress('=')}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-lg flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 active:scale-98 transition-all cursor-pointer"
          >
            <Equal size={22} className="stroke-[3]" />
            <span>SAMA DENGAN (HITUNG)</span>
          </button>

          {/* Bottom helpful notice */}
          <div className="text-[11px] text-slate-500 text-center leading-relaxed px-2">
            💡 <strong>Info:</strong> Tekan <strong>Enter</strong> atau <strong>=</strong> pada keyboard untuk eksekusi, <strong>Backspace</strong> untuk hapus, <strong>Esc</strong> untuk reset.
          </div>
        </div>
      </div>
    </div>
  );
}
