// Welcome Voice & Audio Synthesizer Utility for Logistics Login & Dashboard

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeAudioCtx: AudioContext | null = null;

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function getWelcomeGreetingText(): string {
  const hour = new Date().getHours();
  let waktu = 'Malam';
  if (hour >= 4 && hour < 11) waktu = 'Pagi';
  else if (hour >= 11 && hour < 15) waktu = 'Siang';
  else if (hour >= 15 && hour < 18) waktu = 'Sore';

  return `Selamat ${waktu.toLowerCase()} rekan logistik. Selamat datang di Warehouse Logistics Studio Cikembar PT Kino Indonesia. Silakan masukkan PIN Anda untuk mengakses sistem.`;
}

/**
 * Plays futuristic chime melody accompanying the voice greeting
 */
export function playWelcomeChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    activeAudioCtx = ctx;

    // Harmonic Welcoming Chime: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + idx * 0.14;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (e) {
    console.error('Welcome chime error:', e);
  }
}

/**
 * Speaks welcome greeting using browser SpeechSynthesis with Indonesian voice if available
 */
export function playWelcomeVoice({
  onStart,
  onEnd,
  onError,
  text
}: {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  text?: string;
} = {}): boolean {
  if (!isSpeechSupported()) {
    playWelcomeChime();
    if (onStart) onStart();
    setTimeout(() => {
      if (onEnd) onEnd();
    }, 1800);
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    // Play subtle crystal chime first
    playWelcomeChime();

    const speechText = text || getWelcomeGreetingText();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0; // natural rate
    utterance.pitch = 1.05; // slightly friendly bright pitch

    // Try to find best Indonesian voice
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.startsWith('id') || v.lang.includes('ID') || v.name.toLowerCase().includes('indonesia'));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    utterance.onstart = () => {
      activeUtterance = utterance;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      activeUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      activeUtterance = null;
      if (onError) onError();
      if (onEnd) onEnd();
    };

    // Timeout safety fallback if speech synthesis stalls on some mobile browsers
    const estimatedDurationMs = Math.max(2500, speechText.length * 75);
    const safetyTimer = setTimeout(() => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
        if (onEnd) onEnd();
      }
    }, estimatedDurationMs + 1000);

    const originalOnEnd = utterance.onend;
    utterance.onend = (e) => {
      clearTimeout(safetyTimer);
      if (originalOnEnd) originalOnEnd.call(utterance, e);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Speech synthesis playback error:', err);
    if (onError) onError();
    if (onEnd) onEnd();
    return false;
  }
}

/**
 * Stops active voice greeting
 */
export function stopWelcomeVoice() {
  try {
    if (isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
    if (activeAudioCtx) {
      activeAudioCtx.close().catch(() => {});
      activeAudioCtx = null;
    }
  } catch (e) {
    // ignore
  }
  activeUtterance = null;
}
